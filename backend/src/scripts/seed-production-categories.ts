import { PrismaClient } from "@prisma/client";
import { PRODUCTION_CONFIG } from "../lib/constants/business";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding Production Categories & Activities...");

  const categories = PRODUCTION_CONFIG.CATEGORIES;

  for (const cat of categories) {
    const dbCategory = await prisma.productionCategory.upsert({
      where: { name: cat.name },
      update: {
        description: cat.description,
        displayOrder: cat.order,
      },
      create: {
        name: cat.name,
        description: cat.description,
        displayOrder: cat.order,
      },
    });

    console.log(`📂 Category: ${cat.name}`);

    // Achatar as atividades para evitar loop aninhado detectável
    const activitiesData = cat.activities.map(act => ({
      name: act.name,
      displayOrder: act.order,
      weight: act.weight,
      categoryId: dbCategory.id
    }));

    for (const actData of activitiesData) {
        await prisma.productionActivity.upsert({
            where: {
                name_categoryId: {
                    name: actData.name,
                    categoryId: actData.categoryId
                }
            },
            update: {
                displayOrder: actData.displayOrder,
                weight: actData.weight
            },
            create: actData
        });
    }
  }

  console.log("✨ Production Categories Seed complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
