import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pool = getDbPool();

  try {
    if (req.method === 'GET') {
      // Check both query and params for id (Express vs Vercel routing)
      const id = req.query.id || (req as any).params?.id;

      // If ID is provided, get single record
      if (id && !Array.isArray(id)) {
        const historyId = parseInt(id, 10);
        
        if (isNaN(historyId)) {
          return res.status(400).json({ error: '无效的历史记录 ID' });
        }

        const result = await pool.query(
          `SELECT h.*, 
                  a.id as agent_id, a.name as agent_name, a.region as agent_region, a.model_name
           FROM test_history h
           LEFT JOIN agents a ON h.agent_id = a.id
           WHERE h.id = $1`,
          [historyId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: '历史记录不存在' });
        }

        const record = result.rows[0];

        const formattedRecord = {
          id: record.id,
          agentId: record.agent_id,
          agentName: record.agent_name,
          testDate: record.test_date,
          totalQuestions: record.total_questions,
          passedCount: record.passed_count,
          failedCount: record.failed_count,
          successRate: parseFloat(record.success_rate) || 0,
          durationSeconds: record.duration_seconds,
          avgResponseTime: record.avg_response_time ? parseFloat(record.avg_response_time) : null,
          executionMode: record.execution_mode,
          rpm: record.rpm,
          timeoutSeconds: record.timeout_seconds,
          retryCount: record.retry_count,
          jsonData: record.json_data,
          createdAt: record.created_at,
          agent: record.agent_id ? {
            id: record.agent_id,
            name: record.agent_name,
            region: record.agent_region,
            modelName: record.model_name,
          } : null,
        };

        return res.json(formattedRecord);
      }

      // Otherwise, get list with pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const countResult = await pool.query('SELECT COUNT(*) FROM test_history');
      const total = parseInt(countResult.rows[0].count);

      const result = await pool.query(
        `SELECT h.*, 
                a.id as agent_id, a.name as agent_name, a.region as agent_region
         FROM test_history h
         LEFT JOIN agents a ON h.agent_id = a.id
         ORDER BY h.test_date DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const formattedHistory = result.rows.map((record: any) => ({
        id: record.id,
        agentId: record.agent_id,
        agentName: record.agent_name,
        testDate: record.test_date,
        totalQuestions: record.total_questions,
        passedCount: record.passed_count,
        failedCount: record.failed_count,
        successRate: parseFloat(record.success_rate) || 0,
        durationSeconds: record.duration_seconds,
        avgResponseTime: record.avg_response_time ? parseFloat(record.avg_response_time) : null,
        executionMode: record.execution_mode,
        rpm: record.rpm,
        timeoutSeconds: record.timeout_seconds,
        retryCount: record.retry_count,
        jsonData: record.json_data,
        createdAt: record.created_at,
        agent: record.agent_id ? {
          id: record.agent_id,
          name: record.agent_name,
          region: record.agent_region,
        } : null,
      }));

      return res.json({
        data: formattedHistory,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    if (req.method === 'DELETE') {
      // Check both query and params for id (Express vs Vercel routing)
      const id = req.query.id || (req as any).params?.id;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: '无效的历史记录 ID' });
      }

      const historyId = parseInt(id, 10);

      if (isNaN(historyId)) {
        return res.status(400).json({ error: '无效的历史记录 ID' });
      }

      const result = await pool.query(
        'DELETE FROM test_history WHERE id = $1 RETURNING id',
        [historyId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: '历史记录不存在' });
      }

      return res.json({ message: '删除成功' });
    }

    return res.status(405).json({ error: '方法不允许' });
  } catch (error: any) {
    console.error('History API Error:', error);
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
