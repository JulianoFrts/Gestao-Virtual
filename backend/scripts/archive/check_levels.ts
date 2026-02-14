import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  console.log("🔍 Verificando níveis de permissão e ranks...");

  try {
    const levels = await prisma.permissionLevel.findMany({
      select: {
        id: true,
        name: true,
        rank: true,
      },
      orderBy: { rank: "desc" },
    });

    console.table(levels);
  } catch (err) {
    console.error("❌ Erro na verificação:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
