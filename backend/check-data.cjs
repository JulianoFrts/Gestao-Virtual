const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Team Members ---');
  try {
    const members = await prisma.teamMember.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            authCredential: { select: { role: true, email: true } },
          },
        },
        team: { select: { id: true, name: true } },
      },
      take: 5
    });
    console.log('Members count:', members.length);
    console.dir(members, { depth: null });
  } catch (e) {
    console.error('Error fetching members:', e.message);
    if (e.code) console.error('Prisma Error Code:', e.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
