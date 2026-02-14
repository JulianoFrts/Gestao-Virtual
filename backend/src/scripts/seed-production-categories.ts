import "dotenv/config";
import { prisma } from "../lib/prisma/client";

const categories = [
  {
    name: "Serviços Preliminares",
    order: 1,
    description: "Atividades preparatórias para início da obra",
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
    description: "Escavação, armação e concretagem das bases",
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
    description: "Montagem e instalação das estruturas metálicas",
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
    description: "Instalação de sistemas de aterramento e proteção",
    activities: [
      { name: "Instalação Cabo Contrapeso", order: 1, weight: 2 },
      { name: "Medição de Resistência", order: 2, weight: 1 },
      { name: "Aterramento de Cercas", order: 3, weight: 1 },
    ],
  },
  {
    name: "Lançamento de Cabos",
    order: 5,
    description: "Lançamento e regulação de cabos condutores e para-raios",
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

async function seedProductionCategories() {
  console.log("🚀 Seeding Production Categories and Activities...");

  for (const cat of categories) {
    // Check if category exists
    let category = await prisma.productionCategory.findFirst({
      where: { name: cat.name },
    });

    if (!category) {
      console.log(`📦 Creating category: ${cat.name}`);
      category = await prisma.productionCategory.create({
        data: {
          name: cat.name,
          order: cat.order,
          description: cat.description,
        },
      });
    } else {
      console.log(`✅ Category exists: ${cat.name}`);
    }

    // Seed activities for this category
    for (const act of cat.activities) {
      const existingActivity = await prisma.productionActivity.findFirst({
        where: { name: act.name, categoryId: category.id },
      });

      if (!existingActivity) {
        console.log(`  📝 Creating activity: ${act.name}`);
        await prisma.productionActivity.create({
          data: {
            name: act.name,
            categoryId: category.id,
            order: act.order,
            weight: act.weight,
          },
        });
      } else {
        console.log(`  ✅ Activity exists: ${act.name}`);
      }
    }
  }

  // Log summary
  const totalCategories = await prisma.productionCategory.count();
  const totalActivities = await prisma.productionActivity.count();
  console.log(`\n✨ Seed completed! ${totalCategories} categories, ${totalActivities} activities.`);
}

seedProductionCategories()
  .catch((e) => {
    console.error("💥 Error seeding production categories:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
