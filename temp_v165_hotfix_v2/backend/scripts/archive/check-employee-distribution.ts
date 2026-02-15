import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- DISTRIBUIÇÃO DE FUNCIONÁRIOS POR OBRA ---");

  const projects = await prisma.project.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  console.log(`Total de obras encontradas: ${projects.length}`);

  projects.forEach((p) => {
    if (p._count.users > 0) {
      console.log(`- Obra: ${p.name} (Código: ${p.code || "N/A"})`);
      console.log(`  Membros: ${p._count.users}`);
    }
  });

  // Verificar se há funcionários sem obra
  const orphans = await prisma.user.count({
    where: { projectId: null, role: "WORKER" },
  });

  if (orphans > 0) {
    console.log(
      `\nFuncionários (Trabalhadores) sem obra vinculada: ${orphans}`,
    );
  }

  console.log("\n--- FIM DA DISTRIBUIÇÃO ---");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
