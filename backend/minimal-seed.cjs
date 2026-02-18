const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Inserting minimal seed data...');
  try {
    const companyId = 'corp_orion';
    const projectId = 'proj_lateste';

    await prisma.company.upsert({
      where: { id: companyId },
      update: {},
      create: {
        id: companyId,
        name: 'OrioN Energia S.A.',
        taxId: '12345678000199',
        isActive: true,
      },
    });
    console.log('Company created/verified.');

    await prisma.project.upsert({
      where: { id: projectId },
      update: {},
      create: {
        id: projectId,
        companyId: companyId,
        name: 'LA TESTE',
        code: 'LT-TESTE-001',
        description: 'Projeto de Verificação e Testes',
        status: 'active',
      },
    });
    console.log('Project created/verified.');

    console.log('Minimal seed completed successfully!');
  } catch (err) {
    console.error('Error during minimal seed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
