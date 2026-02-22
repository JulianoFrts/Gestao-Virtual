import { PrismaClient } from "@prisma/client";
import { ROLE_LEVELS } from "@/lib/constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando backfill de hierarchy_level e permissions...");

  const users = await prisma.user.findMany({
    include: { authCredential: { select: { role: true } } },
  });

  let updatedCount = 0;

  for (const user of users) {
    const role = user.authCredential?.role || "USER";
    const roleLower = role.toLowerCase();
    const rank = ROLE_LEVELS[roleLower as keyof typeof ROLE_LEVELS] || 100;

    let needsUpdate = false;
    const updateData: any = {};

    // 1. Corrigir hierarchy_level
    if (
      user.hierarchyLevel === null ||
      user.hierarchyLevel === 0 ||
      user.hierarchyLevel !== rank
    ) {
      updateData.hierarchyLevel = rank;
      needsUpdate = true;
    }

    // 2. Garantir que permissions é pelo menos um JSON vazio {}
    if (!user.permissions) {
      updateData.permissions = {};
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      updatedCount++;
    }
  }

  console.log(`Backfill concluído! ${updatedCount} usuários atualizados.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
