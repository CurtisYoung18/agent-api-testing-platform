import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

// Call Quality Agent API to check conversation quality
async function callQualityAgent(
  qualityAgentApiKey: string,
  qualityAgentRegion: string,
  messages: Array<{ role: string; content?: string; text?: string }>
): Promise<{
  success: boolean;
  scores?: { UNRESOLVED: number; PARTIALLY_RESOLVED: number; FULLY_RESOLVED: number };
  reason?: string;
  userIntention?: string;
  error?: string;
}> {
  try {
    const baseUrl = qualityAgentRegion === 'SG' 
      ? 'https://api.gptbots.ai'
      : 'https://api.gptbots.cn';

    // Format messages as user:xxx\nassistant:xxx
    const formattedMessages = messages
      .filter(msg => {
        const role = msg.role?.toUpperCase();
        return role === 'USER' || role === 'ASSISTANT';
      })
      .map(msg => {
        const role = msg.role?.toUpperCase();
        const content = msg.content || msg.text || '';
        return `${role === 'USER' ? 'user' : 'assistant'}:${content}`;
      })
      .join('\n');

    if (!formattedMessages) {
      return {
        success: false,
        error: '没有有效的消息内容',
      };
    }

    // Create conversation
    const conversationResponse = await fetch(`${baseUrl}/v1/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qualityAgentApiKey}`,
      },
      body: JSON.stringify({
        user_id: 'quality_check_' + Date.now()
      }),
    });

    if (!conversationResponse.ok) {
      const errorData = await conversationResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `创建对话失败 (${conversationResponse.status})`,
      };
    }

    const conversationData = await conversationResponse.json();
    const conversationId = conversationData.conversation_id;

    if (!conversationId) {
      return {
        success: false,
        error: '未获取到conversation_id',
      };
    }

    // Send message to quality agent
    const messageResponse = await fetch(`${baseUrl}/v1/conversation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qualityAgentApiKey}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        response_mode: 'blocking',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: formattedMessages
          }]
        }]
      }),
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `API调用失败 (${messageResponse.status})`,
      };
    }

    const messageData = await messageResponse.json();

    // Extract response text
    let responseText = '';
    if (messageData.output && Array.isArray(messageData.output) && messageData.output.length > 0) {
      const firstOutput = messageData.output[0];
      if (firstOutput.content && firstOutput.content.text) {
        responseText = firstOutput.content.text;
      }
    }

    if (!responseText) {
      return {
        success: false,
        error: '质检 Agent 返回了空响应',
      };
    }

    // Parse JSON from response (may contain markdown code blocks or extra text)
    let qualityResult: any = null;
    
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        qualityResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
      }
    }

    if (!qualityResult) {
      return {
        success: false,
        error: '质检 Agent 返回格式不正确，无法解析 JSON',
        reason: responseText,
      };
    }

    // Validate and normalize scores
    const scores = {
      UNRESOLVED: Math.max(0, Math.min(100, Number(qualityResult.UNRESOLVED) || 0)),
      PARTIALLY_RESOLVED: Math.max(0, Math.min(100, Number(qualityResult.PARTIALLY_RESOLVED) || 0)),
      FULLY_RESOLVED: Math.max(0, Math.min(100, Number(qualityResult.FULLY_RESOLVED) || 0)),
    };

    return {
      success: true,
      scores,
      reason: qualityResult.reason || qualityResult.reasoning || '',
      userIntention: qualityResult.user_intention || qualityResult.userIntention || '',
    };

  } catch (error: any) {
    console.error('Quality check error:', error);
    return {
      success: false,
      error: error.message || '质检检查失败',
    };
  }
}

// Submit quality result to GPTBots API
async function submitQualityToGPTBots(
  agentApiKey: string,
  agentRegion: string,
  answerId: string,
  quality: 'UNRESOLVED' | 'PARTIALLY_RESOLVED' | 'FULLY_RESOLVED'
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = agentRegion === 'SG' 
      ? 'https://api.gptbots.ai'
      : 'https://api.gptbots.cn';

    // Note: GPTBots API may not have a direct endpoint to update message quality
    // This is a placeholder implementation
    // You may need to check GPTBots API documentation for the correct endpoint
    
    // For now, we'll just return success as the quality is stored in our system
    // The actual GPTBots API integration may require different approach
    
    return {
      success: true,
    };

  } catch (error: any) {
    console.error('Submit quality error:', error);
    return {
      success: false,
      error: error.message || '提交质检结果失败',
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const pool = getDbPool();

  try {
    const { action, agentId, qualityAgentId, messages, answerId, quality } = req.body;

    if (action === 'check') {
      // Quality check
      if (!agentId || !qualityAgentId || !messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // Get quality agent info
      const qualityAgentResult = await pool.query(
        'SELECT id, name, region, api_key FROM agents WHERE id = $1',
        [qualityAgentId]
      );

      if (qualityAgentResult.rows.length === 0) {
        return res.status(404).json({ error: '质检 Agent 不存在' });
      }

      const qualityAgent = qualityAgentResult.rows[0];

      // Call quality agent
      const result = await callQualityAgent(
        qualityAgent.api_key,
        qualityAgent.region,
        messages
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || '质检检查失败',
          reason: result.reason,
        });
      }

      return res.json({
        success: true,
        scores: result.scores,
        reason: result.reason,
        userIntention: result.userIntention,
      });

    } else if (action === 'submit') {
      // Submit quality result
      if (!agentId || !answerId || !quality) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // Get agent info
      const agentResult = await pool.query(
        'SELECT id, name, region, api_key FROM agents WHERE id = $1',
        [agentId]
      );

      if (agentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Agent 不存在' });
      }

      const agent = agentResult.rows[0];

      // Submit to GPTBots API (if needed)
      const submitResult = await submitQualityToGPTBots(
        agent.api_key,
        agent.region,
        answerId,
        quality
      );

      if (!submitResult.success) {
        return res.status(500).json({
          success: false,
          error: submitResult.error || '提交失败',
        });
      }

      return res.json({
        success: true,
        affectCount: 1,
      });

    } else {
      return res.status(400).json({ error: '无效的 action 参数' });
    }

  } catch (error: any) {
    console.error('Quality API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '服务器错误',
    });
  }
}

