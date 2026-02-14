import { prisma } from "./src/lib/prisma/client.js";

async function check() {
  try {
    const levels = await prisma.permissionLevel.count();
    const modules = await prisma.standardModule.count();
    const matrix = await prisma.permissionMatrix.count();
    const granted = await prisma.permissionMatrix.count({
      where: { isGranted: true },
    });

    console.log(`Levels: ${levels}`);
    console.log(`Modules: ${modules}`);
    console.log(`Matrix entries: ${matrix}`);
    console.log(`Matrix granted: ${granted}`);

    if (granted === 0 && matrix > 0) {
      console.log("WARNING: Matrix entries exist but NONE are granted!");
    } else if (matrix === 0) {
      console.log("CRITICAL: PermissionMatrix table is EMPTY!");
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
