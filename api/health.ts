import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API运行正常'
  });
}
