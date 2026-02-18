const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Raw Team Members Check ---');
  try {
    const raw = await prisma.teamMember.findMany({
      take: 10
    });
    console.log('Raw count:', raw.length);
    console.dir(raw, { depth: null });
    
    const usersCount = await prisma.user.count();
    console.log('Total users in DB:', usersCount);
    
    if (raw.length > 0) {
        const userIds = raw.map(r => r.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true }
        });
        console.log('Associated users found:', users.length);
        const foundIds = users.map(u => u.id);
        const orphans = userIds.filter(id => !foundIds.includes(id));
        console.log('Orphan user IDs in team_members:', orphans);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
