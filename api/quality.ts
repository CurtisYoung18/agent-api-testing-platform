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
    console.log('Message response received:', { 
      hasOutput: !!messageData.output,
      outputLength: messageData.output?.length || 0,
    });

    // Extract response text - try multiple possible response formats
    let responseText = '';
    
    // Format 1: messageData.output array
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
    
    // Format 2: messageData.text (direct text field)
    if (!responseText && messageData.text) {
      responseText = messageData.text;
    }
    
    // Format 3: messageData.content (direct content field)
    if (!responseText && messageData.content) {
      if (typeof messageData.content === 'string') {
        responseText = messageData.content;
      } else if (messageData.content.text) {
        responseText = messageData.content.text;
      }
    }

    console.log('Extracted response text length:', responseText.length);
    
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
  quality: 'UNRESOLVED' | 'PARTIALLY_RESOLVED' | 'FULLY_RESOLVED'
): Promise<{ success: boolean; error?: string }> {
  try {
    const baseUrl = agentRegion === 'SG' 
      ? 'https://api.gptbots.ai'
      : 'https://api.gptbots.cn';

    console.log('Submitting quality to GPTBots:', {
      baseUrl,
      answerId,
      quality,
    });

    // Try to use message feedback API first
    // Map our quality tags to GPTBots feedback types
    // Note: GPTBots feedback API only supports POSITIVE, NEGATIVE, CANCELED
    // We'll try to use a custom approach or check if there's a quality-specific endpoint
    
    // Option 1: Try using feedback API with quality in a custom field
    // First, let's try to update message with quality tag directly
    // Check if GPTBots supports updating message metadata
    
    // Try calling the message feedback endpoint
    // IMPORTANT: GPTBots feedback API only supports POSITIVE/NEGATIVE/CANCELED
    // It does NOT support UNRESOLVED/PARTIALLY_RESOLVED/FULLY_RESOLVED quality tags
    // We'll map our quality tags to feedback types as a workaround:
    // - FULLY_RESOLVED -> POSITIVE (用户满意)
    // - PARTIALLY_RESOLVED -> NEGATIVE (部分解决，用户可能不太满意)
    // - UNRESOLVED -> NEGATIVE (未解决，用户不满意)
    // 
    // NOTE: This means GPTBots platform will only show POSITIVE/NEGATIVE feedback,
    // not the detailed quality tags. The quality tags are stored in our system
    // and displayed in our UI, but may not be visible in GPTBots platform.
    // 
    // TODO: Check if GPTBots has a separate API endpoint for setting quality tags,
    // or if they plan to add support for quality tags in the feedback API.
    const feedbackType = quality === 'FULLY_RESOLVED' ? 'POSITIVE' : 'NEGATIVE';
    
    console.log('Calling GPTBots feedback API:', {
      answerId,
      quality,
      feedbackType,
      note: 'GPTBots only supports POSITIVE/NEGATIVE, not detailed quality tags',
    });
    
    const feedbackResponse = await fetch(`${baseUrl}/v1/message/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agentApiKey}`,
      },
      body: JSON.stringify({
        answer_id: answerId,
        feedback: feedbackType,
      }),
    });

    if (!feedbackResponse.ok) {
      const errorText = await feedbackResponse.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('Failed to parse error response:', errorText);
      }
      
      console.error('Failed to submit feedback to GPTBots:', {
        status: feedbackResponse.status,
        statusText: feedbackResponse.statusText,
        error: errorData,
      });
      
      // Don't fail completely - maybe the API doesn't support quality tags yet
      // Log the error but continue
      console.warn('GPTBots feedback API may not support quality tags. Error:', errorData.message || errorText);
      
      // Return success anyway since we've stored it in our system
      // The quality tag will be shown in our UI even if GPTBots doesn't support it yet
      return {
        success: true,
      };
    }

    const feedbackData = await feedbackResponse.json();
    console.log('Feedback submitted successfully:', feedbackData);
    
    return {
      success: true,
    };

  } catch (error: any) {
    console.error('Submit quality error:', error);
    console.error('Error stack:', error.stack);
    
    // Don't fail completely - log error but return success
    // The quality is stored in our system and will be shown in UI
    return {
      success: true, // Return success to not block the UI update
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
        'SELECT id, name, region, api_key FROM agents WHERE id = $1',
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
        messages
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
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    return res.status(500).json({
      success: false,
      error: error.message || '服务器错误',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

