import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Prisma Client lazily
let prisma: any;

async function getPrismaClient() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const prismaClient = await getPrismaClient();

    // Execute raw SQL to add model_name column if it doesn't exist
    await prismaClient.$executeRaw`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'agents' AND column_name = 'model_name'
          ) THEN
              ALTER TABLE agents ADD COLUMN model_name VARCHAR(255);
          END IF;
      END $$;
    `;

    return res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error: any) {
    console.error('Migration Error:', error);
    return res.status(500).json({ 
      error: '迁移失败',
      message: error.message 
    });
  }
}

