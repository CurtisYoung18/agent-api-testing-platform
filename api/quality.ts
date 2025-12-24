import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

// Helper function to get base URL
function getBaseUrl(region: string, customBaseUrl?: string | null): string {
  if (region === 'CUSTOM' && customBaseUrl) {
    return customBaseUrl;
  }
  return region === 'SG' 
    ? 'https://api.gptbots.ai'
    : 'https://api.gptbots.cn';
}

// Call Quality Agent API to check conversation quality
async function callQualityAgent(
  qualityAgentApiKey: string,
  qualityAgentRegion: string,
  messages: Array<{ role: string; content?: string; text?: string }>,
  customBaseUrl?: string | null
): Promise<{
  success: boolean;
  scores?: { UNRESOLVED: number; PARTIALLY_RESOLVED: number; FULLY_RESOLVED: number };
  reason?: string;
  userIntention?: string;
  error?: string;
}> {
  try {
    const baseUrl = getBaseUrl(qualityAgentRegion, customBaseUrl);

    // Filter and prepare messages for quality agent
    // We'll send structured messages directly to v2 API, not as formatted string
    console.log('Raw messages received:', JSON.stringify(messages, null, 2));
    
    const validMessages = messages
      .filter(msg => {
        const role = msg.role?.toUpperCase();
        const isValid = role === 'USER' || role === 'ASSISTANT';
        if (!isValid) {
          console.log('Filtered out message with role:', role);
        }
        return isValid;
      })
      .map(msg => {
        const role = msg.role?.toUpperCase();
        const content = msg.content || msg.text || '';
        return {
          role: role === 'USER' ? 'user' : 'assistant',
          content: content
        };
      })
      .filter(msg => msg.content && msg.content.trim().length > 0); // Remove empty messages

    console.log('Valid messages prepared:', validMessages.length);
    validMessages.forEach((msg, idx) => {
      console.log(`Message ${idx + 1} [${msg.role}]:`, msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''));
    });

    if (validMessages.length === 0) {
      console.error('No valid messages found');
      return {
        success: false,
        error: '没有有效的消息内容',
      };
    }

    // Create conversation using v1 API (v2 doesn't have conversation creation endpoint)
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
      const errorText = await conversationResponse.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('Failed to parse error response:', errorText);
      }
      console.error('Failed to create conversation:', {
        status: conversationResponse.status,
        statusText: conversationResponse.statusText,
        error: errorData,
      });
      return {
        success: false,
        error: errorData.message || errorData.error || `创建对话失败 (${conversationResponse.status})`,
      };
    }

    const conversationData = await conversationResponse.json();
    console.log('Conversation created:', { conversationId: conversationData.conversation_id });
    const conversationId = conversationData.conversation_id;

    if (!conversationId) {
      console.error('No conversation_id in response:', conversationData);
      return {
        success: false,
        error: '未获取到conversation_id',
      };
    }

    // Format messages as user:xxx\nassistant:xxx for quality agent
    // According to QUALITY_AGENT_PROMPT.md, the quality agent expects formatted string
    const formattedMessagesString = validMessages
      .map(msg => `${msg.role}:${msg.content}`)
      .join('\n');
    
    // Add prompt prefix to instruct the quality agent
    const qualityPrompt = `请作为第三方评估以下对话的完成度。注意：如果对话最后转接到人工客服，需要重点关注AI解决了哪些需求，以体现Agent的有用之处。如果未转接人工，则更偏向于完全解决。

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

${formattedMessagesString}

请只输出 JSON，不要其他内容。`;
    
    console.log('Formatted messages string for quality agent:', {
      promptLength: qualityPrompt.length,
      messagesLength: formattedMessagesString.length,
      preview: qualityPrompt.substring(0, 500),
    });
    
    // Send formatted string with prompt as a single user message to quality agent
    // The quality agent's system prompt expects this format
    const requestBody = {
      conversation_id: conversationId,
      response_mode: 'blocking',
      messages: [{
        role: 'user',
        content: qualityPrompt
      }]
    };
    
    console.log('Sending formatted messages to quality agent:', {
      conversationId,
      formattedStringLength: formattedMessagesString.length,
      requestBodyPreview: JSON.stringify(requestBody).substring(0, 500),
    });
    
    const messageResponse = await fetch(`${baseUrl}/v2/conversation/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qualityAgentApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('Failed to parse error response:', errorText);
      }
      console.error('Failed to send message:', {
        status: messageResponse.status,
        statusText: messageResponse.statusText,
        error: errorData,
      });
      return {
        success: false,
        error: errorData.message || errorData.error || `API调用失败 (${messageResponse.status})`,
      };
    }

    const messageData = await messageResponse.json();
    console.log('Message response received (v2 API):', { 
      hasOutput: !!messageData.output,
      outputLength: messageData.output?.length || 0,
      messageId: messageData.message_id,
      fullResponse: JSON.stringify(messageData).substring(0, 1000),
    });

    // Extract response text from v2 API response format
    // v2 API format: { output: [{ content: { text: "..." } }] }
    let responseText = '';
    
    // Format 1: v2 API - messageData.output array with content.text
    if (messageData.output && Array.isArray(messageData.output) && messageData.output.length > 0) {
      const firstOutput = messageData.output[0];
      if (firstOutput.content) {
        if (typeof firstOutput.content === 'string') {
          responseText = firstOutput.content;
        } else if (firstOutput.content.text) {
          responseText = firstOutput.content.text;
        } else if (Array.isArray(firstOutput.content)) {
          // Handle array of content items
          const textParts = firstOutput.content
            .filter((item: any) => item.type === 'text' && item.text)
            .map((item: any) => item.text);
          responseText = textParts.join('\n');
        }
      }
    }
    
    // Format 2: Fallback - messageData.text (direct text field)
    if (!responseText && messageData.text) {
      responseText = messageData.text;
    }
    
    // Format 3: Fallback - messageData.content (direct content field)
    if (!responseText && messageData.content) {
      if (typeof messageData.content === 'string') {
        responseText = messageData.content;
      } else if (messageData.content.text) {
        responseText = messageData.content.text;
      }
    }

    console.log('Extracted response text length:', responseText.length);
    console.log('Extracted response text preview:', responseText.substring(0, 500));
    
    if (!responseText) {
      console.error('No response text found in message data:', JSON.stringify(messageData, null, 2));
      return {
        success: false,
        error: '质检 Agent 返回了空响应',
      };
    }

    // Parse JSON from response (may contain markdown code blocks or extra text)
    let qualityResult: any = null;
    
    // Try multiple methods to extract JSON
    // Method 1: Try to parse the entire response as JSON
    try {
      qualityResult = JSON.parse(responseText.trim());
    } catch (e) {
      // Method 2: Extract JSON from markdown code blocks
      const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        try {
          qualityResult = JSON.parse(codeBlockMatch[1]);
        } catch (e2) {
          console.error('Failed to parse JSON from code block:', e2);
        }
      }
      
      // Method 3: Extract first JSON object from response
      if (!qualityResult) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            qualityResult = JSON.parse(jsonMatch[0]);
          } catch (e3) {
            console.error('Failed to parse JSON from match:', e3);
            console.error('JSON string:', jsonMatch[0].substring(0, 500));
          }
        }
      }
    }

    if (!qualityResult) {
      console.error('Failed to parse quality result. Response text:', responseText.substring(0, 1000));
      return {
        success: false,
        error: '质检 Agent 返回格式不正确，无法解析 JSON',
        reason: responseText.substring(0, 500), // Limit reason length
      };
    }
    
    console.log('Parsed quality result:', {
      hasUnresolved: 'UNRESOLVED' in qualityResult,
      hasPartiallyResolved: 'PARTIALLY_RESOLVED' in qualityResult,
      hasFullyResolved: 'FULLY_RESOLVED' in qualityResult,
      hasReason: 'reason' in qualityResult || 'reasoning' in qualityResult,
      hasUserIntention: 'user_intention' in qualityResult || 'userIntention' in qualityResult,
      userIntention: qualityResult.user_intention || qualityResult.userIntention || 'NOT_FOUND',
      reasonPreview: (qualityResult.reason || qualityResult.reasoning || '').substring(0, 200),
      fullResult: JSON.stringify(qualityResult).substring(0, 1000),
    });

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
    console.error('Error stack:', error.stack);
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
  quality: 'UNRESOLVED' | 'PARTIALLY_RESOLVED' | 'FULLY_RESOLVED',
  customBaseUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = getBaseUrl(agentRegion, customBaseUrl);

    console.log('Submitting quality to GPTBots:', {
      baseUrl,
      answerId,
      quality,
    });

    // Use GPTBots quality API endpoint: /v1/message/quality
    // This API supports: NONE, UNRESOLVED, PARTIALLY_RESOLVED, FULLY_RESOLVED
    // Documentation: https://www.gptbots.ai/src/zh_CN/API%20文档/对话API.md
    console.log('Calling GPTBots quality API:', {
      answerId,
      quality,
      endpoint: '/v1/message/quality',
    });
    
    const qualityResponse = await fetch(`${baseUrl}/v1/message/quality`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agentApiKey}`,
      },
      body: JSON.stringify({
        answer_id: answerId,
        quality: quality, // Direct mapping: UNRESOLVED, PARTIALLY_RESOLVED, FULLY_RESOLVED
      }),
    });

    if (!qualityResponse.ok) {
      const errorText = await qualityResponse.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('Failed to parse error response:', errorText);
      }
      
      console.error('Failed to submit quality to GPTBots:', {
        status: qualityResponse.status,
        statusText: qualityResponse.statusText,
        error: errorData,
        answerId,
        quality,
      });
      
      return {
        success: false,
        error: errorData.message || `提交质检结果失败 (${qualityResponse.status})`,
      };
    }

    const qualityData = await qualityResponse.json();
    console.log('Quality submitted successfully to GPTBots:', {
      affectCount: qualityData.affectCount,
      answerId,
      quality,
    });
    
    return {
      success: true,
    };

  } catch (error: any) {
    console.error('Submit quality error:', error);
    console.error('Error stack:', error.stack);
    
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
    
    console.log('Quality API request:', {
      action,
      agentId,
      qualityAgentId,
      messagesCount: messages?.length || 0,
      answerId,
      quality,
    });

    if (action === 'check') {
      // Quality check
      if (!agentId || !qualityAgentId || !messages || !Array.isArray(messages)) {
        console.error('Missing required parameters:', { agentId, qualityAgentId, hasMessages: !!messages, isArray: Array.isArray(messages) });
        return res.status(400).json({ error: '缺少必要参数' });
      }

      // Get quality agent info
      console.log('Fetching quality agent:', qualityAgentId);
      const qualityAgentResult = await pool.query(
        'SELECT id, name, region, api_key, custom_base_url FROM agents WHERE id = $1',
        [qualityAgentId]
      );

      if (qualityAgentResult.rows.length === 0) {
        console.error('Quality agent not found:', qualityAgentId);
        return res.status(404).json({ error: '质检 Agent 不存在' });
      }

      const qualityAgent = qualityAgentResult.rows[0];
      console.log('Quality agent found:', { id: qualityAgent.id, name: qualityAgent.name, region: qualityAgent.region });

      // Call quality agent
      console.log('Calling quality agent with', messages.length, 'messages');
      const result = await callQualityAgent(
        qualityAgent.api_key,
        qualityAgent.region,
        messages,
        qualityAgent.custom_base_url
      );

      console.log('Quality agent result:', {
        success: result.success,
        hasScores: !!result.scores,
        hasReason: !!result.reason,
        hasUserIntention: !!result.userIntention,
        error: result.error,
      });

      if (!result.success) {
        console.error('Quality check failed:', result.error);
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
        'SELECT id, name, region, api_key, custom_base_url FROM agents WHERE id = $1',
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
        quality,
        agent.custom_base_url
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
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    return res.status(500).json({
      success: false,
      error: error.message || '服务器错误',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

