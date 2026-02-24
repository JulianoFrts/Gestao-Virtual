const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    name: "SERVIÇOS PRELIMINARES",
    order: 1,
    activities: [
      { name: "Croqui de Acesso", weight: 1.0, order: 1 },
      { name: "Sondagem", weight: 1.0, order: 2 },
      { name: "Conferência de Perfil", weight: 1.0, order: 3 },
      { name: "Supressão Vegetal (Área)", weight: 1.0, order: 4 },
      { name: "Abertura de Acessos", weight: 1.0, order: 5 },
    ],
  },
  {
    name: "FUNDAÇÕES",
    order: 2,
    activities: [
      { name: "Escavação (Mastro/Pé)", weight: 1.0, order: 1 },
      { name: "Armação (Mastro/Pé)", weight: 1.0, order: 2 },
      { name: "Concretagem (Mastro/Pé)", weight: 1.0, order: 3 },
      { name: "Nivelamento / Preparação", weight: 0.5, order: 4 },
      { name: "Reaterro", weight: 0.5, order: 5 },
    ],
  },
  {
    name: "MONTAGEM",
    order: 3,
    activities: [
      { name: "Pré-Montagem", weight: 1.0, order: 1 },
      { name: "Içamento", weight: 1.0, order: 2 },
      { name: "Revisão / Torque", weight: 0.5, order: 3 },
    ],
  },
  {
    name: "LANÇAMENTO DE CABOS",
    order: 4,
    activities: [
      { name: "Lançamento Cabo Guia", weight: 1.0, order: 1 },
      { name: "Lançamento Condutor", weight: 2.0, order: 2 },
      { name: "Grampeação", weight: 1.0, order: 3 },
      { name: "Regulação", weight: 1.0, order: 4 },
    ],
  },
];

async function main() {
  console.log("🌱 Iniciando inclusão do Catálogo de Produção Padrão...");

  for (const cat of DEFAULT_CATEGORIES) {
    // Create or Update Category
    let category = await prisma.productionCategory.findFirst({
      where: { name: cat.name },
    });

    if (!category) {
      category = await prisma.productionCategory.create({
        data: {
          name: cat.name,
          order: cat.order,
        },
      });
      console.log(`+ Categoria: ${cat.name} criada!`);
    } else {
      console.log(
        `~ Categoria: ${cat.name} já existente, sincronizando sub-atividades...`,
      );
    }

    // Seed Activities
    for (const act of cat.activities) {
      let activity = await prisma.productionActivity.findFirst({
        where: { name: act.name, categoryId: category.id },
      });

      if (!activity) {
        await prisma.productionActivity.create({
          data: {
            categoryId: category.id,
            name: act.name,
            weight: act.weight,
            order: act.order,
          },
        });
        console.log(`  └─> Atividade: ${act.name} adicionada!`);
      }
    }
  }

  console.log("✅ Catálogo Padrão semeado com sucesso!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Erro durante o Seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
