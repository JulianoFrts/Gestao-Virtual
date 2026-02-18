
const { PrismaClient } = require('@prisma/client');
const { seedProduction } = require('./prisma/seed-production');

// Mock prisma client since seedProduction expects it
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Running Production Seed...');
    await seedProduction(prisma);
    console.log('Done!');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
