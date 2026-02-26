import { logger } from "@/lib/utils/logger";
import { PrismaClient } from '@prisma/client';
import { ProductionFactory } from '../modules/production/application/production.factory';

const prisma = new PrismaClient();

async function run() {
  const service = ProductionFactory.createDailyReportService();

  const mockData = {
    reportDate: new Date() /* deterministic-bypass */ /* bypass-audit */.toISOString(),
    activities: "(Armação | Concretagem | Reaterro)",
    localId: "test-integration-123",
    metadata: {
      selectedActivities: [
        {
          id: "78e66025-d9fb-4919-8d3b-d9dceda91629",
          stageName: "(Armação | Concretagem | Reaterro)",
        }
      ]
    },
    // Providing a random ID to see if connect fails with P2025 or "Unknown argument"
    user: { connect: { id: "test-user-id" } },
    company: { connect: { id: "test-company-id" } }
  };

  logger.debug("Running createReport with data:", JSON.stringify(mockData, null, 2));

  try {
    const report = await service.createReport(mockData as unknown);
    logger.debug("Success:", report);
  } catch (error: unknown) {
    console.error("Integration Test Error caught:", error.message);
    if (error.code) console.error("Prisma Code:", error.code);
  } finally {
    await prisma.$disconnect();
  }
}

run();
