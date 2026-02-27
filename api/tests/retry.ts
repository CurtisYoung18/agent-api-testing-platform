import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const getPool = () => new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function getBaseUrl(region: string, customBaseUrl?: string | null): string {
  if (region === 'CUSTOM' && customBaseUrl) return customBaseUrl;
  return region === 'SG' ? 'https://api-sg.gptbots.ai' : 'https://api.gptbots.cn';
}

async function callAgentAPI(
  apiKey: string,
  region: string,
  question: string,
  customBaseUrl?: string | null,
  customUserId?: string
): Promise<{ success: boolean; response?: string; error?: string; responseTime: number; conversationId?: string; messageId?: string; usage?: any }> {
  const startTime = Date.now();
  const userId = customUserId || ('test_user_' + Date.now());

  try {
    const baseUrl = getBaseUrl(region, customBaseUrl);
    const conversationResponse = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ user_id: userId }),
    });

    if (!conversationResponse.ok) {
      const errorData = await conversationResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `创建对话失败 (${conversationResponse.status})`,
        responseTime: Date.now() - startTime,
      };
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.conversation_id;
    if (!conversationId) {
      return {
        success: false,
        error: `未获取到conversation_id`,
        responseTime: Date.now() - startTime,
      };
    }

    const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [{ role: 'user', content: [{ type: 'text', text: question }] }],
      }),
    });

    const responseTime = Date.now() - startTime;
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `API调用失败 (${messageResponse.status})`,
        responseTime,
        conversationId,
      };
    }

    const messageData = await messageResponse.json();
    let responseText = '';
    if (messageData.output && Array.isArray(messageData.output) && messageData.output.length > 0) {
      const first = messageData.output[0];
      if (first.content?.text) responseText = first.content.text;
    }

    if (!responseText) {
      return { success: false, error: 'API返回了空响应', responseTime, conversationId, messageId: messageData.message_id };
    }

    return {
      success: true,
      response: responseText,
      responseTime,
      conversationId,
      messageId: messageData.message_id,
      usage: messageData.usage || null,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '网络请求失败',
      responseTime: Date.now() - startTime,
    };
  }
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  try {
    const { agentId, questions, executionMode, maxConcurrency, requestDelay, userId } = req.body || {};
    const wantsStream = req.query.stream === 'true';

    if (!questions || questions.length === 0 || !agentId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const pool = getPool();
    const agentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [parseInt(agentId, 10)]);
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent 不存在' });
    }
    const agent = agentResult.rows[0];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write(`data: ${JSON.stringify({ type: 'connected', totalQuestions: questions.length })}\n\n`);

    const isParallel = executionMode === 'parallel';
    const concurrency = parseInt(maxConcurrency) || 2;
    const delay = parseInt(requestDelay) || 0;
    const results: any[] = [];

    const processQuestion = async (q: any) => {
      const result = await callAgentAPI(
        agent.api_key,
        agent.region,
        q.question,
        agent.custom_base_url,
        userId
      );
      return {
        type: 'result',
        questionIndex: q.questionIndex,
        question: q.question,
        referenceOutput: q.referenceOutput || '',
        response: result.response || '',
        success: result.success,
        error: result.error,
        responseTime: result.responseTime,
        conversationId: result.conversationId,
        messageId: result.messageId,
        isRetry: true,
        timestamp: new Date().toISOString(),
      };
    };

    if (isParallel) {
      for (let batchStart = 0; batchStart < questions.length; batchStart += concurrency) {
        const batch = questions.slice(batchStart, batchStart + concurrency);
        res.write(`data: ${JSON.stringify({ type: 'progress', current: batchStart + 1, message: `重试 ${batch.length} 个问题...` })}\n\n`);
        const batchResults = await Promise.all(batch.map(processQuestion));
        for (const r of batchResults) {
          results.push(r);
          res.write(`data: ${JSON.stringify(r)}\n\n`);
        }
        if (batchStart + concurrency < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      for (let i = 0; i < questions.length; i++) {
        res.write(`data: ${JSON.stringify({ type: 'progress', current: i + 1, question: questions[i].question?.slice(0, 100) })}\n\n`);
        const r = await processQuestion(questions[i]);
        results.push(r);
        res.write(`data: ${JSON.stringify(r)}\n\n`);
        if (i < questions.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const passedCount = results.filter(r => r.success).length;
    const failedCount = results.length - passedCount;
    const successRate = results.length > 0 ? ((passedCount / results.length) * 100).toFixed(2) : '0.00';

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      retriedCount: results.length,
      passedCount,
      failedCount,
      successRate,
      results,
    })}\n\n`);
    res.end();

    console.log('[retry] Completed with', results.length, 'results');
  } catch (error: any) {
    console.error('[retry] Error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || '服务器错误' });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
}
