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
    const { agentId, endpoint, method, body, queryParams, streaming } = req.body;

    if (!agentId || !endpoint) {
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
    const baseUrl = getBaseUrl(agent.region, agent.custom_base_url);

    // Build URL with query params
    let url = `${baseUrl}${endpoint}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      url += `?${params.toString()}`;
    }

    console.log('[proxy] Request:', { url, method: method || 'POST', hasBody: !!body });

    // Make request to GPTBots API
    const requestOptions: RequestInit = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${agent.api_key}`,
      },
    };

    if (body && (method === 'POST' || !method)) {
      requestOptions.body = JSON.stringify(body);
    }

    // Handle streaming response
    if (streaming) {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: errorData.message || `请求失败 (${response.status})`,
          code: errorData.code,
        });
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: '无法获取响应流' });
      }

      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (streamError) {
        console.error('[proxy] Stream error:', streamError);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        res.end();
      }
      return;
    }

    // Non-streaming response
    const response = await fetch(url, requestOptions);
    const responseData = await response.json().catch(() => ({}));

    console.log('[proxy] Response status:', response.status);

    if (!response.ok) {
      return res.status(response.status).json({
        error: responseData.message || `请求失败 (${response.status})`,
        code: responseData.code,
        details: responseData,
      });
    }

    return res.json({
      success: true,
      data: responseData,
    });

  } catch (error: any) {
    console.error('[proxy] Error:', error);
    return res.status(500).json({
      error: error.message || '服务器错误',
    });
  }
}

