import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getDbPool();

  try {
    // Check both query and params for id (Express vs Vercel routing)
    const id = req.query.id || (req as any).params?.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: '无效的 agent ID' });
    }

    const agentId = parseInt(id, 10);

    if (isNaN(agentId)) {
      return res.status(400).json({ error: '无效的 agent ID' });
    }

    // GET - Get single agent
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM agents WHERE id = $1',
        [agentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Agent 不存在' });
      }

      const agent = result.rows[0];

      return res.json({
        id: agent.id,
        name: agent.name,
        modelName: agent.model_name,
        region: agent.region,
        apiKey: agent.api_key.length > 14
          ? `${agent.api_key.slice(0, 10)}***${agent.api_key.slice(-4)}`
          : '***',
        customBaseUrl: agent.custom_base_url || undefined,
        status: agent.status,
        lastUsed: agent.last_used,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
      });
    }

    // PUT - Update agent
    if (req.method === 'PUT') {
      const { name, modelName, region, apiKey, customBaseUrl, status } = req.body;

      console.log('Update agent request:', { agentId, name, modelName, region, status, hasCustomBaseUrl: !!customBaseUrl });

      if (region === 'CUSTOM' && !customBaseUrl) {
        return res.status(400).json({ error: '选择自定义地址时，必须填写自定义Base URL' });
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (name) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (modelName !== undefined) {
        updates.push(`model_name = $${paramIndex++}`);
        values.push(modelName || null);
      }
      if (region) {
        if (!['SG', 'CN', 'CUSTOM'].includes(region)) {
          return res.status(400).json({ error: '无效的区域' });
        }
        updates.push(`region = $${paramIndex++}`);
        values.push(region);
      }
      if (apiKey) {
        updates.push(`api_key = $${paramIndex++}`);
        values.push(apiKey);
      }
      if (customBaseUrl !== undefined) {
        updates.push(`custom_base_url = $${paramIndex++}`);
        values.push(customBaseUrl || null);
      }
      if (status) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      updates.push(`updated_at = NOW()`);
      values.push(agentId);

      console.log('Update data:', { updates, values });

      const result = await pool.query(
        `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Agent 不存在' });
      }

      const agent = result.rows[0];

      console.log('Updated agent:', { id: agent.id, name: agent.name, modelName: agent.model_name });

      return res.json({
        id: agent.id,
        name: agent.name,
        modelName: agent.model_name,
        region: agent.region,
        apiKey: agent.api_key.length > 14
          ? `${agent.api_key.slice(0, 10)}***${agent.api_key.slice(-4)}`
          : '***',
        customBaseUrl: agent.custom_base_url || undefined,
        status: agent.status,
        lastUsed: agent.last_used,
        createdAt: agent.created_at,
        updatedAt: agent.updated_at,
      });
    }

    // DELETE - Delete agent
    if (req.method === 'DELETE') {
      const result = await pool.query(
        'DELETE FROM agents WHERE id = $1 RETURNING id',
        [agentId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Agent 不存在' });
      }

      return res.json({ success: true, message: 'Agent 已删除' });
    }

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('Agent Detail API Error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({
      error: '服务器错误',
      message: error.message,
      code: error.code,
    });
  } finally {
    await pool.end();
  }
}
