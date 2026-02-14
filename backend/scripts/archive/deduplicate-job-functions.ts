import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeFunctionName(name: string): string {
  let n = name.trim().toUpperCase();
  n = n.replace(/^AUX\./g, "AUXILIAR");
  n = n.replace(/^AUX /g, "AUXILIAR ");
  n = n.replace(/^ASSITENTE/g, "ASSISTENTE");
  n = n.replace(/ TECNI[CO]/g, " TÉCNICO");
  n = n.replace(/\s(I|II|III|IV|V|VI|VII|VIII|IX|X)+(\s|$)/g, " ").trim();
  n = n.replace(/\sAT\s(I|II|III)+(\s|$)/g, " ").trim();
  n = n.replace(/\s\d+(\s|$)/g, " ").trim();
  n = n.replace(/\s+/g, " ").trim();
  return n;
}

async function main() {
  console.log("--- INICIANDO CONSOLIDAÇÃO DE FUNÇÕES PROFISSIONAIS V2 ---");

  const allFunctions = await prisma.jobFunction.findMany();
  const normalizedMap = new Map<string, (typeof allFunctions)[0][]>();

  for (const f of allFunctions) {
    const normName = normalizeFunctionName(f.name);
    if (!normalizedMap.has(normName)) normalizedMap.set(normName, []);
    const entries = normalizedMap.get(normName);
    if (entries) entries.push(f);
  }

  for (const [normName, dupes] of normalizedMap.entries()) {
    if (dupes.length === 0) continue;

    // Encontrar a função que já tem exatamente o nome normalizado para ser a master
    let master = dupes.find((d) => d.name === normName);

    let others: (typeof allFunctions)[0][] = [];

    if (master) {
      const m = master;
      others = dupes.filter((d) => d.id !== m.id);
    } else {
      // Se nenhuma tem o nome exato, a primeira do grupo vira master e será renomeada
      const first = dupes[0];
      if (!first) continue;

      master = first;
      others = dupes.slice(1);
      console.log(`[RENOMEAR] "${first.name}" -> "${normName}"`);
      await prisma.jobFunction.update({
        where: { id: first.id },
        data: { name: normName },
      });
    }

    if (others.length === 0) continue;

    console.log(
      `\n[FUNÇÃO] Unificando ${others.length} duplicatas para: "${normName}"`,
    );

    for (const other of others) {
      const m = master;
      if (!m) break;
      // Migrar Usuários
      const userUpdate = await prisma.user.updateMany({
        where: { functionId: other.id },
        data: { functionId: m.id },
      });

      // Migrar Histórico de Equipes
      await prisma.towerActivityTeamMember.updateMany({
        where: { jobFunctionId: other.id },
        data: { jobFunctionId: m.id },
      });

      // Migrar Liderança
      if (other.canLeadTeam && !m.canLeadTeam) {
        await prisma.jobFunction.update({
          where: { id: m.id },
          data: { canLeadTeam: true },
        });
        m.canLeadTeam = true;
      }

      // Excluir redundante
      try {
        await prisma.jobFunction.delete({ where: { id: other.id } });
        console.log(
          `  - "${other.name}" OK (${userUpdate.count} usuários movidos)`,
        );
      } catch (err) {
        console.log(
          `  - Erro ao deletar "${other.name}" (Provavelmente em uso em outra tabela)`,
        );
      }
    }
  }

  console.log("\n--- CONSOLIDAÇÃO V2 CONCLUÍDA! ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
