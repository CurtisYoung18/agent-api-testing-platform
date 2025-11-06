import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const pool = getDbPool();

  try {
    const { id, format } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: '无效的历史记录 ID' });
    }

    const historyId = parseInt(id, 10);

    if (isNaN(historyId)) {
      return res.status(400).json({ error: '无效的历史记录 ID' });
    }

    const result = await pool.query(
      'SELECT * FROM test_history WHERE id = $1',
      [historyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '历史记录不存在' });
    }

    const history = result.rows[0];

    if (!format || Array.isArray(format)) {
      return res.status(400).json({ error: '请指定下载格式' });
    }

    // Handle different download formats
    if (format === 'excel') {
      if (!history.excel_blob) {
        return res.status(404).json({ error: 'Excel 报告不存在' });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${history.id}.xlsx"`);
      return res.send(history.excel_blob);
    }

    if (format === 'markdown') {
      if (!history.markdown_blob) {
        return res.status(404).json({ error: 'Markdown 报告不存在' });
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${history.id}.md"`);
      return res.send(history.markdown_blob);
    }

    if (format === 'json') {
      if (!history.json_data) {
        return res.status(404).json({ error: 'JSON 数据不存在' });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="test_report_${history.id}.json"`);
      return res.json(history.json_data);
    }

    return res.status(400).json({ error: '不支持的下载格式' });

  } catch (error: any) {
    console.error('Download API Error:', error);
    return res.status(500).json({
      error: '服务器错误',
      message: error.message,
    });
  } finally {
    await pool.end();
  }
}
