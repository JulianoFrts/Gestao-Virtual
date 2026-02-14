import { prisma } from "../src/lib/prisma/client";

async function main() {
  try {
    const levels = await prisma.permissionLevel.count();
    const modules = await prisma.permissionModule.count();
    const matrix = await prisma.permissionMatrix.count();
    const userRoles = await prisma.userRole.count();

    console.log(`Permission Levels: ${levels}`);
    console.log(`Permission Modules: ${modules}`);
    console.log(`Permission Matrix: ${matrix}`);
    console.log(`User Roles: ${userRoles}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
