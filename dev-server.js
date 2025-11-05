import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import API handlers
const loadHandler = async (path) => {
  try {
    const module = await import(path);
    return module.default;
  } catch (error) {
    console.error(`Error loading ${path}:`, error.message);
    return null;
  }
};

// Setup routes
app.all('/api/health', async (req, res) => {
  const handler = await loadHandler('./api/health.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.all('/api/agents/:id', async (req, res) => {
  const handler = await loadHandler('./api/agent-detail.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.all('/api/agents', async (req, res) => {
  const handler = await loadHandler('./api/agents.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.all('/api/tests', async (req, res) => {
  const handler = await loadHandler('./api/tests.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.all('/api/tests/stream', async (req, res) => {
  const handler = await loadHandler('./api/tests-stream.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.all('/api/history/:id', async (req, res) => {
  const handler = await loadHandler('./api/history.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.all('/api/history', async (req, res) => {
  const handler = await loadHandler('./api/history.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.all('/api/download', async (req, res) => {
  const handler = await loadHandler('./api/download.ts');
  if (handler) await handler(req, res);
  else res.status(500).json({ error: 'Handler not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

