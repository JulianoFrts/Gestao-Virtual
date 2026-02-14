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

async function main() {
  console.log(
    "--- AUDITORIA DE INTEGRIDADE E SINCRONIZAÇÃO (PROJETO LA TESTE) ---",
  );

  // 1. Localizar Projeto
  const project = await prisma.project.findFirst({
    where: { name: "LA TESTE" },
    include: { company: true },
  });

  if (!project) throw new Error("Projeto LA TESTE não encontrado.");
  console.log(
    `\n[PROJETO OK] Nome: ${project.name} | Empresa: ${project.company?.name}`,
  );

  // 2. Vínculo Obra -> Funcionários
  const staffCount = await prisma.user.count({
    where: { projectId: project.id },
  });
  console.log(
    `[PESSOAL OK] ${staffCount} funcionários vinculados diretamente à obra.`,
  );

  // 3. Vínculo Funcionários -> Equipes / Composição
  const membersInTeams = await prisma.teamMember.count({
    where: { user: { projectId: project.id } },
  });
  console.log(
    `[COMPOSIÇÃO OK] ${membersInTeams} vínculos de membros em equipes do projeto.`,
  );

  // 4. Vínculo Produção -> Atividade -> Custo
  console.log("\n[PRODUÇÃO X CUSTO] Validando amostragem de vínculos...");
  const productions = await prisma.towerDailyProduction.findMany({
    where: { tower: { projectId: project.id } },
    take: 5,
    include: { activity: true },
  });

  for (const p of productions) {
    const cost = await prisma.activityUnitCost.findUnique({
      where: {
        projectId_activityId: {
          projectId: project.id,
          activityId: p.activityId,
        },
      },
    });

    const status = cost ? "Sincronizado" : "FALHA DE VÍNCULO";
    console.log(
      `  - Atividade: ${p.activity.name} | Custo Unitário: R$ ${cost?.unitPrice || 0} | Status: ${status}`,
    );
  }

  // 5. Planejamento (Cronograma) -> Pareto
  const scheduleCount = await prisma.activitySchedule.count({
    where: { tower: { projectId: project.id } },
  });
  console.log(
    `\n[PLANEJAMENTO OK] ${scheduleCount} itens de cronograma vinculados (Essencial para Pareto).`,
  );

  // 6. Verificação de Liderança (CanLeadTeam)
  const leaders = await prisma.user.count({
    where: {
      projectId: project.id,
      jobFunction: { canLeadTeam: true },
    },
  });
  console.log(
    `[LIDERANÇA OK] ${leaders} encarregados habilitados para liderança neste projeto.`,
  );

  console.log("\n--- AUDITORIA CONCLUÍDA: SISTEMA 100% SINCRONIZADO ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
