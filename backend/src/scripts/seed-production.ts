import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding production categories and activities...");

  // Limpar dados existentes
  console.log("Cleaning existing production meta-data...");
  try {
      // Usar nomes de modelos corretos do schema atual
      await prisma.mapElementProductionProgress.deleteMany({});
      await prisma.stageProgress.deleteMany({});
      await prisma.workStage.deleteMany({});
      await prisma.productionActivity.deleteMany({});
      await prisma.productionCategory.deleteMany({});
  } catch (e) {
      console.warn("Error clearing tables (might be empty/migrations pending):", e);
  }

  const categories = [
    {
      name: "Serviços Preliminares",
      order: 1,
      activities: [
        { name: "Croqui de Acesso", order: 1, weight: 1 },
        { name: "Sondagem", order: 2, weight: 1 },
        { name: "Passivo Ambiental", order: 3, weight: 1 },
        { name: "Conferência de Perfil", order: 4, weight: 1 },
        { name: "Marcação de Cavas", order: 5, weight: 1 },
        { name: "Seção Diagonal", order: 6, weight: 1 },
        { name: "Supressão Vegetal (Área)", order: 7, weight: 1 },
        { name: "Supressão Vegetal (Faixa)", order: 8, weight: 1 },
        { name: "Supressão Vegetal (Corte)", order: 9, weight: 1 },
        { name: "Abertura de Acessos", order: 10, weight: 2 },
        { name: "Recuperação de Acesso", order: 11, weight: 1 },
      ],
    },
    {
      name: "Fundações",
      order: 2,
      activities: [
        { name: "Escavação (Mastro/Pé)", order: 1, weight: 3 },
        { name: "Cravação de Estacas", order: 2, weight: 3 },
        { name: "Armação (Mastro/Pé)", order: 3, weight: 2 },
        { name: "Nivelamento / Preparação", order: 4, weight: 2 },
        { name: "Concretagem (Mastro/Pé)", order: 5, weight: 5 },
        { name: "Reaterro (Mastro/Pé)", order: 6, weight: 2 },
        { name: "Ensaio de Arrancamento", order: 7, weight: 1 },
        { name: "Fundação 100%", order: 8, weight: 1 },
      ],
    },
    {
      name: "Montagem de Torres",
      order: 3,
      activities: [
        { name: "Distribuição / Transporte", order: 1, weight: 1 },
        { name: "Pré-montagem em Solo", order: 2, weight: 3 },
        { name: "Montagem / Içamento", order: 3, weight: 7 },
        { name: "Revisão Final / Flambagem", order: 4, weight: 1 },
        { name: "Giro e Prumo", order: 5, weight: 1 },
      ],
    },
    {
      name: "Sistemas de Aterramento",
      order: 4,
      activities: [
        { name: "Instalação Cabo Contrapeso", order: 1, weight: 2 },
        { name: "Medição de Resistência", order: 2, weight: 1 },
        { name: "Aterramento de Cercas", order: 3, weight: 1 },
      ],
    },
    {
      name: "Lançamento de Cabos",
      order: 5,
      activities: [
        { name: "Instalação de Cavaletes", order: 1, weight: 1 },
        { name: "Lançamento de Cabo Piloto", order: 2, weight: 2 },
        { name: "Lançamento de Para-raios", order: 3, weight: 3 },
        { name: "Cadeias e Bandolas", order: 4, weight: 2 },
        { name: "Lançamento de Condutores", order: 5, weight: 10 },
        { name: "Nivelamento e Grampeação", order: 6, weight: 3 },
        { name: "Jumpers / Espaçadores", order: 7, weight: 2 },
        { name: "Esferas de Sinalização", order: 8, weight: 1 },
        { name: "Defensas de Estais", order: 9, weight: 1 },
        { name: "Entrega Final / Comissionamento", order: 10, weight: 1 },
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
