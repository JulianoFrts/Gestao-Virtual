import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- VERIFICAÇÃO DE MEMBROS POR EQUIPE ---");

  const teams = await prisma.team.findMany({
    include: {
      _count: {
        select: { members: true },
      },
    },
  });

  console.log(`Total de equipes no banco: ${teams.length}`);

  const emptyTeams = teams.filter((t) => t._count.members === 0);
  const populatedTeams = teams.filter((t) => t._count.members > 0);

  console.log(`Equipes com membros: ${populatedTeams.length}`);
  console.log(`Equipes vazias: ${emptyTeams.length}`);

  if (populatedTeams.length > 0) {
    console.log("\nExemplos de Equipes Populadas:");
    populatedTeams.slice(0, 5).forEach((t) => {
      console.log(`- ${t.name}: ${t._count.members} membros`);
    });
  }

  if (emptyTeams.length > 0) {
    console.log("\nEquipes Vazias (Top 10):");
    emptyTeams.slice(0, 10).forEach((t) => {
      console.log(`- ${t.name} (ID: ${t.id})`);
    });
  }

  console.log("\n--- FIM DA VERIFICAÇÃO ---");
}

main()
  .catch(console.error)
  .finally(() => pool.end());
