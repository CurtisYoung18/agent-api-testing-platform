import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db';

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
      const result = await pool.query(
        'SELECT id, name, model_name, region, api_key, status, last_used, created_at, updated_at FROM agents ORDER BY created_at DESC'
      );

      const maskedAgents = result.rows.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        modelName: agent.model_name,
        region: agent.region,
        apiKey: agent.api_key.length > 14
          ? `${agent.api_key.slice(0, 10)}***${agent.api_key.slice(-4)}`
          : '***',
        status: agent.status,
        lastUsed: agent.last_used,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
      }));

      return res.json(maskedAgents);
    }

    if (req.method === 'POST') {
      const { name, modelName, region, apiKey } = req.body;

      console.log('Create agent request:', { name, modelName, region });

      if (!name || !region || !apiKey) {
        return res.status(400).json({ error: '缺少必填字段' });
      }

      if (!['SG', 'CN'].includes(region)) {
        return res.status(400).json({ error: '无效的区域' });
      }

      const result = await pool.query(
        `INSERT INTO agents (name, model_name, region, api_key, status) 
         VALUES ($1, $2, $3, $4, 'active') 
         RETURNING id, name, model_name, region, api_key, status, last_used, created_at, updated_at`,
        [name, modelName || null, region, apiKey]
      );

      const agent = result.rows[0];
      console.log('Created agent:', { id: agent.id, name: agent.name, modelName: agent.model_name });

      return res.status(201).json({
        id: agent.id,
        name: agent.name,
        modelName: agent.model_name,
        region: agent.region,
        apiKey: `${agent.api_key.slice(0, 10)}***${agent.api_key.slice(-4)}`,
        status: agent.status,
        lastUsed: agent.last_used,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
      });
    }

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('Agents API Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: '服务器错误',
      message: error.message,
      code: error.code
    });
  } finally {
    await pool.end();
  }
}
