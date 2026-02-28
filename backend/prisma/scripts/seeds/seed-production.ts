import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PRODUCTION_CONFIG } from "../src/lib/constants/business";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

export async function seedProduction(prismaClient: PrismaClient = prisma) {
  console.log("🚀 Checking Production Data...");

  // Categories to seed from constants
  const categories = PRODUCTION_CONFIG.CATEGORIES;

  for (const cat of categories) {
    const existing = await prismaClient.productionCategory.findFirst({
      where: { name: cat.name },
    });

    let categoryId = existing?.id;

    if (!existing) {
      console.log(`Creating category: ${cat.name}`);
      const created = await prismaClient.productionCategory.create({
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
    if (categoryId && cat.activities) {
      for (const act of cat.activities) {
        const existingAct = await prismaClient.productionActivity.findFirst({
          where: { name: act.name, categoryId: categoryId },
        });

        if (!existingAct) {
          console.log(`  Creating activity: ${act.name}`);
          await prismaClient.productionActivity.create({
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

// Self-run only if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedProduction()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
