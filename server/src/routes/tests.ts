import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/tests - Create and execute test
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { agentId, executionMode, rpm, timeoutSeconds, retryCount } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!agentId) {
      return res.status(400).json({ error: 'Missing agentId' });
    }

    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Extract questions from 'input' column
    const questions = data
      .map((row: any) => row.input || row.Input || row.question || row.Question)
      .filter((q) => q && String(q).trim());

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No questions found in file. Make sure it has an "input" column.' });
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { id: parseInt(agentId) },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Create test session (simplified - in real app, this would be async)
    const testId = Date.now().toString();

    res.json({
      testId,
      agentId: agent.id,
      agentName: agent.name,
      totalQuestions: questions.length,
      executionMode: executionMode || 'parallel',
      rpm: parseInt(rpm) || 60,
      timeoutSeconds: parseInt(timeoutSeconds) || 30,
      retryCount: parseInt(retryCount) || 3,
      status: 'queued',
      message: 'Test queued. Use /api/tests/:id to check status.',
    });

    // TODO: Implement actual test execution in background
    // This would involve:
    // 1. Creating conversation with Agent API
    // 2. Sending questions based on execution mode (parallel/sequential)
    // 3. Collecting results
    // 4. Saving to database
    // 5. Generating Excel/Markdown/JSON reports

  } catch (error) {
    next(error);
  }
});

// GET /api/tests/:id - Get test status/results
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // TODO: Implement actual test status retrieval
    // For now, return mock data
    res.json({
      testId: id,
      status: 'completed',
      progress: 100,
      results: {
        totalQuestions: 150,
        passedCount: 142,
        failedCount: 8,
        successRate: 94.67,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as testsRouter };

