import { app } from './src/index.js';
import request from 'supertest';
import { prisma } from './src/lib/prisma.js';

async function run() {
  await prisma.vote.deleteMany();
  await prisma.report.deleteMany();
  await prisma.digest.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { name: 'Test', email: 'test@t.com', zone: 'Test' }
  });

  const res = await request(app).post('/api/reports').send({
    rawText: 'knife attack happening right now',
    userId: user.id,
    lat: 17.41,
    lng: 78.41
  });
  
  console.log('Status:', res.status);
  console.log('Body:', JSON.stringify(res.body, null, 2));

  await prisma.$disconnect();
  process.exit(0);
}

run().catch(console.error);
