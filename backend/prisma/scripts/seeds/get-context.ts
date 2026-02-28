import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getContext() {
  const company = await prisma.company.findFirst();
  const project = await prisma.project.findFirst({
    where: { status: "active" },
  });
  const site = await (prisma as any).site.findFirst({
    where: { projectId: project?.id },
  });

  console.log(
    JSON.stringify(
      {
        companyId: company?.id,
        projectId: project?.id,
        siteId: site?.id,
      },
      null,
      2,
    ),
  );
}

getContext().finally(() => prisma.$disconnect());
