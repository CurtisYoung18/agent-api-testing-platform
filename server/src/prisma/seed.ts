import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.testHistory.deleteMany();
  await prisma.agent.deleteMany();

  // Create 6 mock agents
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        name: 'Production SG Agent',
        region: 'SG',
        apiKey: 'sk-prod-sg-mock1234567890abcdef4Xz7',
        status: 'active',
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),
    prisma.agent.create({
      data: {
        name: 'Test SG Agent',
        region: 'SG',
        apiKey: 'sk-test-sg-mock1234567890abcdef9Bc3',
        status: 'active',
        lastUsed: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      },
    }),
    prisma.agent.create({
      data: {
        name: 'Production CN Agent',
        region: 'CN',
        apiKey: 'sk-prod-cn-mock1234567890abcdef6Mn8',
        status: 'active',
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
    }),
    prisma.agent.create({
      data: {
        name: 'Test CN Agent',
        region: 'CN',
        apiKey: 'sk-test-cn-mock1234567890abcdef2Lp4',
        status: 'active',
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
    }),
    prisma.agent.create({
      data: {
        name: 'Dev SG Agent',
        region: 'SG',
        apiKey: 'sk-dev-sg-mock1234567890abcdef8Qr5',
        status: 'active',
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    }),
    prisma.agent.create({
      data: {
        name: 'QA CN Agent',
        region: 'CN',
        apiKey: 'sk-qa-cn-mock1234567890abcdef3Wy9',
        status: 'active',
        lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    }),
  ]);

  console.log(`✅ Created ${agents.length} mock agents`);

  // Optionally create some mock test history
  const mockHistory = await prisma.testHistory.create({
    data: {
      agentId: agents[0].id,
      agentName: agents[0].name,
      testDate: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      totalQuestions: 150,
      passedCount: 142,
      failedCount: 8,
      successRate: 94.67,
      durationSeconds: 225,
      avgResponseTime: 2.8,
      executionMode: 'parallel',
      rpm: 60,
      timeoutSeconds: 30,
      retryCount: 3,
      jsonData: {
        results: [
          {
            question: 'Test question 1',
            success: true,
            response: 'Test response 1',
            responseTime: 2.5,
          },
        ],
      },
    },
  });

  console.log('✅ Created mock test history');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

