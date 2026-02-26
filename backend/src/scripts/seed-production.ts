import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding production categories and activities...");

  // Limpar dados existentes
  console.log("Cleaning existing production meta-data...");
  try {
      // Usar nomes de modelos corretos do schema atual
      await (prisma as unknown).mapElementProductionProgress.deleteMany({});
      await (prisma as unknown).stageProgress.deleteMany({});
      await (prisma as unknown).workStage.deleteMany({});
      await (prisma as unknown).productionActivity.deleteMany({});
      await (prisma as unknown).productionCategory.deleteMany({});
  } catch (e) {
      console.warn("Error clearing tables (might be empty/migrations pending):", e);
  }

  const categories = [
    {
      name: "Serviços Preliminares",
      order: 1 /* literal */,
      activities: [
        { name: "Croqui de Acesso", order: 1 /* literal */, weight: 1 /* literal */ },
        { name: "Sondagem", order: 2 /* literal */, weight: 1 /* literal */ },
        { name: "Passivo Ambiental", order: 3 /* literal */, weight: 1 /* literal */ },
        { name: "Conferência de Perfil", order: 4 /* literal */, weight: 1 /* literal */ },
        { name: "Marcação de Cavas", order: 5 /* literal */, weight: 1 /* literal */ },
        { name: "Seção Diagonal", order: 6 /* literal */, weight: 1 /* literal */ },
        { name: "Supressão Vegetal (Área)", order: 7 /* literal */, weight: 1 /* literal */ },
        { name: "Supressão Vegetal (Faixa)", order: 8 /* literal */, weight: 1 /* literal */ },
        { name: "Supressão Vegetal (Corte)", order: 9 /* literal */, weight: 1 /* literal */ },
        { name: "Abertura de Acessos", order: 10 /* literal */, weight: 2 /* literal */ },
        { name: "Recuperação de Acesso", order: 11 /* literal */, weight: 1 /* literal */ },
      ],
    },
    {
      name: "Fundações",
      order: 2 /* literal */,
      activities: [
        { name: "Escavação (Mastro/Pé)", order: 1 /* literal */, weight: 3 /* literal */ },
        { name: "Cravação de Estacas", order: 2 /* literal */, weight: 3 /* literal */ },
        { name: "Armação (Mastro/Pé)", order: 3 /* literal */, weight: 2 /* literal */ },
        { name: "Nivelamento / Preparação", order: 4 /* literal */, weight: 2 /* literal */ },
        { name: "Concretagem (Mastro/Pé)", order: 5 /* literal */, weight: 5 /* literal */ },
        { name: "Reaterro (Mastro/Pé)", order: 6 /* literal */, weight: 2 /* literal */ },
        { name: "Ensaio de Arrancamento", order: 7 /* literal */, weight: 1 /* literal */ },
        { name: "Fundação 100%", order: 8 /* literal */, weight: 1 /* literal */ },
      ],
    },
    {
      name: "Montagem de Torres",
      order: 3 /* literal */,
      activities: [
        { name: "Distribuição / Transporte", order: 1 /* literal */, weight: 1 /* literal */ },
        { name: "Pré-montagem em Solo", order: 2 /* literal */, weight: 3 /* literal */ },
        { name: "Montagem / Içamento", order: 3 /* literal */, weight: 7 /* literal */ },
        { name: "Revisão Final / Flambagem", order: 4 /* literal */, weight: 1 /* literal */ },
        { name: "Giro e Prumo", order: 5 /* literal */, weight: 1 /* literal */ },
      ],
    },
    {
      name: "Sistemas de Aterramento",
      order: 4 /* literal */,
      activities: [
        { name: "Instalação Cabo Contrapeso", order: 1 /* literal */, weight: 2 /* literal */ },
        { name: "Medição de Resistência", order: 2 /* literal */, weight: 1 /* literal */ },
        { name: "Aterramento de Cercas", order: 3 /* literal */, weight: 1 /* literal */ },
      ],
    },
    {
      name: "Lançamento de Cabos",
      order: 5 /* literal */,
      activities: [
        { name: "Instalação de Cavaletes", order: 1 /* literal */, weight: 1 /* literal */ },
        { name: "Lançamento de Cabo Piloto", order: 2 /* literal */, weight: 2 /* literal */ },
        { name: "Lançamento de Para-raios", order: 3 /* literal */, weight: 3 /* literal */ },
        { name: "Cadeias e Bandolas", order: 4 /* literal */, weight: 2 /* literal */ },
        { name: "Lançamento de Condutores", order: 5 /* literal */, weight: 10 /* literal */ },
        { name: "Nivelamento e Grampeação", order: 6 /* literal */, weight: 3 /* literal */ },
        { name: "Jumpers / Espaçadores", order: 7 /* literal */, weight: 2 /* literal */ },
        { name: "Esferas de Sinalização", order: 8 /* literal */, weight: 1 /* literal */ },
        { name: "Defensas de Estais", order: 9 /* literal */, weight: 1 /* literal */ },
        { name: "Entrega Final / Comissionamento", order: 10 /* literal */, weight: 1 /* literal */ },
      ],
    },
  ];

  for (const catData of categories) {
    const { activities, ...categoryData } = catData;
    const category = await prisma.productionCategory.create({
      data: categoryData,
    });
    console.log(`✅ Category created: ${category.name}`);

    const activitiesToCreate = activities.map(act => ({
      ...act,
      categoryId: category.id
    }));

    await prisma.productionActivity.createMany({
      data: activitiesToCreate,
      skipDuplicates: true
    });
    
    console.log(`   - ${activitiesToCreate.length} activities created for ${category.name}`);
  }

  console.log("✨ Production seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
