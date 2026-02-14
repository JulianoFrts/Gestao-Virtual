import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    "--- RELATÓRIO DE INTEGRIDADE: VÍNCULOS DE FUNCIONÁRIOS (RESILIENT) ---",
  );

  const users = await prisma.user.findMany({
    where: {
      role: "WORKER" as any,
      status: "ACTIVE",
    },
    include: {
      jobFunction: true,
    },
  });

  const orphans = users.filter((u) => {
    const name = u.name || "";
    const funcName = u.jobFunction?.name?.toLowerCase() || "";

    // Excluir gestores e encarregados da verificação de obrigatoriedade
    const isManager =
      funcName.includes("gestor") ||
      funcName.includes("gerente") ||
      funcName.includes("encarregado");

    if (isManager) return false;

    return !u.companyId || !u.projectId || !u.siteId;
  });

  console.log(`Total de funcionários ativos analisados: ${users.length}`);
  console.log(`Total de funcionários sem vínculo completo: ${orphans.length}`);

  if (orphans.length > 0) {
    console.log("\nLista de Funcionários para Correção:");
    orphans.forEach((u) => {
      const missing = [];
      if (!u.companyId) missing.push("EMPRESA");
      if (!u.projectId) missing.push("OBRA");
      if (!u.siteId) missing.push("CANTEIRO");
      console.log(`- [${u.id}] ${u.name} (Falta: ${missing.join(", ")})`);
    });
  } else {
    console.log(
      "\nParabéns! Todos os funcionários de campo possuem vínculos completos.",
    );
  }

  console.log("\n--- FIM DO RELATÓRIO ---");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
