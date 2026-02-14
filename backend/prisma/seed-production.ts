import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Checking Production Data...");

  // Categories to seed
  const categories = [
    {
      name: "Fundação",
      order: 10,
      description: "Etapa de escavação e concretagem das bases",
    },
    {
      name: "Montagem",
      order: 20,
      description: "Montagem das estruturas metálicas",
    },
    {
      name: "Cabos",
      order: 30,
      description: "Lançamento e regulação de cabos condutores e para-raios",
    },
    {
      name: "Lançamento",
      order: 40,
      description: "Lançamento de cabos (alias)",
    }, // Sometimes used interchangeably
  ];

  for (const cat of categories) {
    const existing = await prisma.productionCategory.findFirst({
      where: { name: cat.name },
    });

    let categoryId = existing?.id;

    if (!existing) {
      console.log(`Creating category: ${cat.name}`);
      const created = await prisma.productionCategory.create({
        data: {
          name: cat.name,
          order: cat.order,
          description: cat.description,
        },
      });
      categoryId = created.id;
    } else {
      console.log(`Category exists: ${cat.name}`);
    }

    // Default activities for each category
    if (categoryId) {
      let activities: any[] = [];
      if (cat.name === "Fundação") {
        activities = [
          { name: "Escavação", order: 1, weight: 1.0 },
          { name: "Armação", order: 2, weight: 1.0 },
          { name: "Concretagem", order: 3, weight: 1.0 },
          { name: "Reaterro", order: 4, weight: 0.5 },
        ];
      } else if (cat.name === "Montagem") {
        activities = [
          { name: "Pré-Montagem", order: 1, weight: 1.0 },
          { name: "Içamento", order: 2, weight: 1.0 },
          { name: "Revisão", order: 3, weight: 0.5 },
          { name: "Torqueamento", order: 4, weight: 0.5 },
        ];
      } else if (cat.name === "Cabos" || cat.name === "Lançamento") {
        activities = [
          { name: "Lançamento Cabo Guia", order: 1, weight: 1.0 },
          { name: "Lançamento Condutor", order: 2, weight: 2.0 },
          { name: "Grampeação", order: 3, weight: 1.0 },
          { name: "Regulação", order: 4, weight: 1.0 },
        ];
      }

      for (const act of activities) {
        const existingAct = await prisma.productionActivity.findFirst({
          where: { name: act.name, categoryId: categoryId },
        });

        if (!existingAct) {
          console.log(`  Creating activity: ${act.name}`);
          await prisma.productionActivity.create({
            data: {
              name: act.name,
              categoryId: categoryId!,
              order: act.order,
              weight: act.weight,
            },
          });
        } else {
          console.log(`  Activity exists: ${act.name}`);
        }
      }
    }
  }

  console.log("✅ Production data check/seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
