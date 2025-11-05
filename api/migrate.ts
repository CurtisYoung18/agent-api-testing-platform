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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const prismaClient = await getPrismaClient();

    console.log('Starting migration...');

    // Check if column exists
    const columnCheck = await prismaClient.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'model_name'
    `;

    console.log('Column check result:', columnCheck);

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

    console.log('Fixing numeric field types...');
    
    // Fix avgResponseTime and successRate to use proper DOUBLE PRECISION
    await prismaClient.$executeRaw`
      DO $$ 
      BEGIN
          -- Fix avg_response_time to DOUBLE PRECISION
          ALTER TABLE test_history 
          ALTER COLUMN avg_response_time TYPE DOUBLE PRECISION;
          
          -- Fix success_rate to DOUBLE PRECISION
          ALTER TABLE test_history 
          ALTER COLUMN success_rate TYPE DOUBLE PRECISION;
      END $$;
    `;

    console.log('Numeric fields fixed');

    // Verify the column was added
    const verifyCheck = await prismaClient.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'model_name'
    `;

    console.log('Verification result:', verifyCheck);

    return res.json({ 
      success: true, 
      message: 'Migration completed successfully',
      columnExists: Array.isArray(verifyCheck) && verifyCheck.length > 0
    });
  } catch (error: any) {
    console.error('Migration Error:', error);
    return res.status(500).json({ 
      error: '迁移失败',
      message: error.message,
      stack: error.stack
    });
  }
}

