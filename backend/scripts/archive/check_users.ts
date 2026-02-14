import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  console.log("🔍 Verificando usuários e hierarquia...");

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        hierarchyLevel: true,
        createdAt: true,
      },
      orderBy: [{ hierarchyLevel: "desc" }, { name: "asc" }],
    });

    console.table(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        hierarchyLevel: u.hierarchyLevel,
        createdAt: u.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error("❌ Erro na verificação:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
