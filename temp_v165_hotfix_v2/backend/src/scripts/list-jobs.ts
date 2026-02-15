import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const jobs = await prisma.jobFunction.findMany();
  console.log("Existing Job Functions:");
  console.log(JSON.stringify(jobs, null, 2));

  const projects = await prisma.project.findMany();
  console.log("Existing Projects:");
  console.log(JSON.stringify(projects, null, 2));
}

main().finally(() => prisma.$disconnect());
