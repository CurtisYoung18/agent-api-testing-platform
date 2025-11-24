import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

// Quality check API: call quality agent and submit quality results
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getDbPool();

  try {
    if (req.method === 'POST') {
      const { action, agentId, qualityAgentId, conversationId, messages, answerId, quality } = req.body;

      if (action === 'check') {
        // Call quality agent to analyze conversation
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
        const baseUrl = qualityAgent.region === 'SG' 
          ? 'https://api.gptbots.ai'
          : 'https://api.gptbots.cn';

        // Format messages for quality agent
        // Format: user:xxx\nassistant:xxx\n...
        // Parse message content (can be string or complex object)
        const extractText = (msg: any): string => {
          if (typeof msg.content === 'string') {
            return msg.content;
          }
          if (msg.text) {
            return msg.text;
          }
          if (Array.isArray(msg.content)) {
            // Handle complex content structure
            const texts: string[] = [];
            msg.content.forEach((branch: any) => {
              if (branch.branch_content) {
                branch.branch_content.forEach((item: any) => {
                  if (item.type === 'text' && item.text) {
                    texts.push(item.text);
                  }
                });
              } else if (branch.type === 'text' && branch.text) {
                texts.push(branch.text);
              }
            });
            return texts.join(' ');
          }
          return '';
        };

        const formattedMessages = messages
          .map((msg: any) => {
            const text = extractText(msg);
            if (!text) return '';
            
            if (msg.role === 'user' || msg.role === 'USER') {
              return `user:${text}`;
            } else if (msg.role === 'assistant' || msg.role === 'ASSISTANT') {
              return `assistant:${text}`;
            }
            return '';
          })
          .filter((msg: string) => msg.length > 0)
          .join('\n');

        // Create conversation with quality agent
        const conversationResponse = await fetch(`${baseUrl}/v1/conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${qualityAgent.api_key}`,
          },
          body: JSON.stringify({
            user_id: `quality_check_${Date.now()}`
          }),
        });

        if (!conversationResponse.ok) {
          const errorData = await conversationResponse.json().catch(() => ({}));
          return res.status(conversationResponse.status).json({
            error: errorData.message || '创建质检对话失败',
            code: errorData.code
          });
        }

        const conversationData = await conversationResponse.json();
        const qualityConversationId = conversationData.conversation_id;

        // Send formatted messages to quality agent
        // Create a prompt for quality checking
        const prompt = `请作为第三方评估以下对话的完成度。注意：如果对话最后转接到人工客服，需要重点关注AI解决了哪些需求，以体现Agent的有用之处。如果未转接人工，则更偏向于完全解决。

输出 JSON 格式，包含以下字段：

{
  "UNRESOLVED": 数值,
  "PARTIALLY_RESOLVED": 数值,
  "FULLY_RESOLVED": 数值,
  "reason": "判断原因的详细说明",
  "user_intention": "用户在这轮对话中想要处理的事情"
}

字段说明：
- UNRESOLVED, PARTIALLY_RESOLVED, FULLY_RESOLVED: 三种状态的置信度（百分比，0-100）
- reason: 为什么给出置信度最高的那个tag的判断原因，需要详细说明
- user_intention: 用户在这轮对话中的核心意图和想要解决的问题

对话内容：
${formattedMessages}

请只输出 JSON，不要其他内容。`;

        const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${qualityAgent.api_key}`,
          },
          body: JSON.stringify({
            conversation_id: qualityConversationId,
            response_mode: 'blocking',
            messages: [{
              role: 'user',
              content: [{
                type: 'text',
                text: prompt
              }]
            }]
          }),
        });

        if (!messageResponse.ok) {
          const errorData = await messageResponse.json().catch(() => ({}));
          console.error('[error] GPTBots message API error:', errorData);
          return res.status(messageResponse.status).json({
            error: errorData.message || '调用质检 Agent 失败',
            code: errorData.code,
            details: errorData
          });
        }

        const messageData = await messageResponse.json();
        
        // Parse response text from GPTBots API format
        let qualityResult = '';
        if (messageData.output && Array.isArray(messageData.output) && messageData.output.length > 0) {
          const firstOutput = messageData.output[0];
          if (firstOutput.content && firstOutput.content.text) {
            qualityResult = firstOutput.content.text;
          } else if (firstOutput.text) {
            qualityResult = firstOutput.text;
          }
        }
        
        // Fallback to old format
        if (!qualityResult) {
          qualityResult = messageData.text || messageData.output || '';
        }
        
        if (!qualityResult) {
          console.error('[error] Empty quality result:', JSON.stringify(messageData));
          return res.status(500).json({
            error: '质检 Agent 返回空响应',
            rawResponse: messageData
          });
        }

        // Parse JSON from quality result
        let qualityScores: any = {};
        try {
          // Clean the result - remove markdown code blocks if present
          let cleanedResult = qualityResult.trim();
          
          // Remove markdown code blocks
          cleanedResult = cleanedResult.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          // Try to extract JSON from the response
          const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            qualityScores = JSON.parse(jsonMatch[0]);
          } else {
            qualityScores = JSON.parse(cleanedResult);
          }
        } catch (parseError: any) {
          console.error('[error] Failed to parse quality result:', qualityResult);
          console.error('[error] Parse error:', parseError.message);
          return res.status(500).json({
            error: '解析质检结果失败',
            rawResult: qualityResult,
            parseError: parseError.message
          });
        }

        // Normalize scores (ensure they are percentages 0-100)
        const normalizedScores: any = {};
        ['UNRESOLVED', 'PARTIALLY_RESOLVED', 'FULLY_RESOLVED'].forEach(key => {
          let value = qualityScores[key] || 0;
          // If value is between 0-1, convert to percentage
          if (value <= 1) {
            value = value * 100;
          }
          normalizedScores[key] = Math.round(value);
        });

        // Extract reason and user_intention
        const reason = qualityScores.reason || qualityScores.reasoning || '';
        const userIntention = qualityScores.user_intention || qualityScores.userIntention || '';

        return res.json({
          success: true,
          scores: normalizedScores,
          reason: reason,
          userIntention: userIntention,
          rawResult: qualityResult
        });

      } else if (action === 'submit') {
        // Submit quality result to GPTBots API
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
        const baseUrl = agent.region === 'SG' 
          ? 'https://api.gptbots.ai'
          : 'https://api.gptbots.cn';

        // Map quality values
        const qualityMap: Record<string, string> = {
          'UNRESOLVED': 'UNRESOLVED',
          'PARTIALLY_RESOLVED': 'PARTIALLY_RESOLVED',
          'FULLY_RESOLVED': 'FULLY_RESOLVED',
          '未解决': 'UNRESOLVED',
          '部分解决': 'PARTIALLY_RESOLVED',
          '已解决': 'FULLY_RESOLVED',
        };

        const mappedQuality = qualityMap[quality] || quality;

        // Call GPTBots quality API
        const response = await fetch(`${baseUrl}/v1/message/quality`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${agent.api_key}`,
          },
          body: JSON.stringify({
            answer_id: answerId,
            quality: mappedQuality
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[error] GPTBots quality API error:', errorData);
          return res.status(response.status).json({
            error: errorData.message || '提交质检结果失败',
            code: errorData.code
          });
        }

        const data = await response.json();
        return res.json({
          success: true,
          affectCount: data.affectCount || 1
        });
      }

      return res.status(400).json({ error: '无效的 action 参数' });
    }

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('[error] Quality API error:', error);
    return res.status(500).json({
      error: '服务器错误',
      message: error.message
    });
  } finally {
    // Don't close pool, it's shared
  }
}

