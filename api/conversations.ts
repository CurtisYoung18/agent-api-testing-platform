import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

// Get conversation list from GPTBots API
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getDbPool();

  try {
    if (req.method === 'GET') {
      const { agentId, page = '1', pageSize = '20', conversationType = 'ALL', userId, startTime, endTime } = req.query;

      if (!agentId) {
        return res.status(400).json({ error: '缺少 agentId 参数' });
      }

      // Get agent info from database
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

      // Get bot_id from agent (assuming it's stored or we need to get it from GPTBots)
      // For now, we'll use the agent's API key to get conversations
      // Note: We need bot_id, but GPTBots API requires it. We might need to store it in agents table.
      // For now, let's assume we can get it from a different endpoint or store it.

      // Calculate time range (default to last 30 days)
      const now = Date.now();
      const defaultStartTime = startTime ? parseInt(startTime as string) : now - 30 * 24 * 60 * 60 * 1000;
      const defaultEndTime = endTime ? parseInt(endTime as string) : now;

      // Call GPTBots API to get conversation list
      const url = new URL(`${baseUrl}/v1/bot/conversation/page`);
      url.searchParams.set('conversation_type', conversationType as string);
      url.searchParams.set('page', page as string);
      url.searchParams.set('page_size', pageSize as string);
      url.searchParams.set('start_time', defaultStartTime.toString());
      url.searchParams.set('end_time', defaultEndTime.toString());
      if (userId) {
        url.searchParams.set('user_id', userId as string);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${agent.api_key}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[error] GPTBots API error:', errorData);
        return res.status(response.status).json({ 
          error: errorData.message || '获取对话列表失败',
          code: errorData.code 
        });
      }

      const data = await response.json();
      return res.json(data);
    }

    // Get conversation messages detail
    if (req.method === 'POST') {
      const { agentId, conversationId, page = '1', pageSize = '100' } = req.body;

      if (!agentId || !conversationId) {
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

      // Call GPTBots API to get messages
      const url = new URL(`${baseUrl}/v2/messages`);
      url.searchParams.set('conversation_id', conversationId);
      url.searchParams.set('page', page);
      url.searchParams.set('page_size', pageSize);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${agent.api_key}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[error] GPTBots API error:', errorData);
        return res.status(response.status).json({ 
          error: errorData.message || '获取消息明细失败',
          code: errorData.code 
        });
      }

      const data = await response.json();
      
      // Transform message format to simpler structure
      if (data.conversation_content) {
        const transformedMessages = data.conversation_content.map((msg: any) => {
          // Extract text content from complex structure
          let text = '';
          if (typeof msg.content === 'string') {
            text = msg.content;
          } else if (Array.isArray(msg.content)) {
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
            text = texts.join(' ');
          }
          
          // Extract quality tag if available
          // Note: GPTBots API may not directly return quality in message response
          // This is a placeholder for future API support
          let quality: string | undefined = undefined;
          if (msg.quality) {
            quality = msg.quality;
          } else if (msg.feedback && msg.feedback.quality) {
            quality = msg.feedback.quality;
          }
          
          return {
            message_id: msg.message_id,
            role: msg.role,
            content: text,
            text: text,
            type: msg.content?.[0]?.branch_content?.[0]?.type || 'text',
            created_at: msg.create_time,
            quality: quality, // Quality tag if available
          };
        });
        
        // Sort by time (oldest first)
        transformedMessages.sort((a: any, b: any) => {
          return (a.created_at || 0) - (b.created_at || 0);
        });
        
        return res.json({
          list: transformedMessages,
          total: data.total || transformedMessages.length,
        });
      }
      
      return res.json(data);
    }

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('[error] Conversations API error:', error);
    return res.status(500).json({ 
      error: '服务器错误',
      message: error.message 
    });
  } finally {
    // Don't close pool, it's shared
  }
}

