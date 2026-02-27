import { PrismaClient } from "@prisma/client";
import { PRODUCTION_CONFIG } from "../lib/constants/business";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding Production Categories & Activities...");

  const categories = PRODUCTION_CONFIG.CATEGORIES;

  for (const cat of categories) {
    // findFirst + create/update pattern (name is not @unique)
    let dbCategory = await prisma.productionCategory.findFirst({
      where: { name: cat.name },
    });

    if (dbCategory) {
      dbCategory = await prisma.productionCategory.update({
        where: { id: dbCategory.id },
        data: {
          description: cat.description,
          order: cat.order,
        },
      });
      console.log(`📂 Updated Category: ${cat.name}`);
    } else {
      dbCategory = await prisma.productionCategory.create({
        data: {
          name: cat.name,
          description: cat.description,
          order: cat.order,
        },
      });
      console.log(`📂 Created Category: ${cat.name}`);
    }

    // Seed activities for this category
    for (const act of cat.activities) {
      const existing = await prisma.productionActivity.findFirst({
        where: { name: act.name, categoryId: dbCategory.id },
      });

      if (existing) {
        await prisma.productionActivity.update({
          where: { id: existing.id },
          data: {
            order: act.order,
            weight: act.weight,
          },
        });
        console.log(`  ✅ Updated: ${act.name}`);
      } else {
        await prisma.productionActivity.create({
          data: {
            name: act.name,
            order: act.order,
            weight: act.weight,
            categoryId: dbCategory.id,
          },
        });
        console.log(`  ✨ Created: ${act.name}`);
      }
    }
  }

  console.log("\n🎯 Production Categories Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
