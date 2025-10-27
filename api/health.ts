import express from 'express';

export default function handler(req: express.Request, res: express.Response) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'API is running on Vercel'
  });
}

