import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const createClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ ERRO: DATABASE_URL não definida.");
    process.exit(1);
  }

  // Try using standard connection first (simpler for scripts)
  // If that fails due to driver adapter requirement, we fall back
  try {
    console.log("Tentando conectar com driver nativo Postgres...");
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (e) {
    console.log("Fallback para conexão padrão...");
    return new PrismaClient();
  }
};

const prisma = createClient();

/**
 * Script para atribuir funções (JobFunction) aos funcionários com base no hierarchyLevel
 */
async function main() {
  console.log("=== ATRIBUINDO FUNÇÕES AOS FUNCIONÁRIOS ===\n");

  try {
    await prisma.$connect();
    console.log("✓ Conectado ao banco de dados");
  } catch (e) {
    console.error("Erro ao conectar:", e);
    process.exit(1);
  }

  // 1. Busca todos os usuários que são funcionários (tem companyId)
  const users = await prisma.user.findMany({
    where: { companyId: { not: null } },
    select: {
      id: true,
      email: true,
      name: true,
      companyId: true,
      functionId: true,
      hierarchyLevel: true,
      jobFunction: {
        select: { id: true, name: true, canLeadTeam: true },
      },
    },
  });

  console.log(`Total de funcionários encontrados: ${users.length}`);
  const usersWithoutFunction = users.filter((u) => !u.functionId).length;
  console.log(`Sem função definida: ${usersWithoutFunction}\n`);

  if (users.length === 0) {
    console.log(
      "Nenhum usuário encontrado. Verifique se o banco está populado.",
    );
    return;
  }

  // 2. Busca as funções existentes por empresa
  const companies = [...new Set(users.map((u) => u.companyId).filter(Boolean))];
  const functionsByCompany = new Map();

  for (const companyId of companies) {
    if (!companyId) continue;
    const functions = await prisma.jobFunction.findMany({
      where: { companyId },
    });
    functionsByCompany.set(companyId, functions);
    // console.log(`Empresa ${companyId?.slice(0, 8)}... tem ${functions.length} funções`);
  }

  // 3. Mapeamento de hierarchyLevel para função
  const getFunctionName = (level: number) => {
    if (level <= 2) return "Supervisor";
    if (level <= 3) return "Encarregado de Turma";
    if (level === 4) return "Operador";
    if (level === 5) return "Montador";
    return "Ajudante";
  };

  // 4. Processa cada usuário
  let updated = 0;
  let created = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.companyId) continue;

    // Se já tem função definida, verificamos se precisa atualizar canLeadTeam
    if (user.functionId && user.jobFunction) {
      // Se for nível <= 3 (Líder) e a função atual não permite liderar, atualizamos a função
      if (user.hierarchyLevel <= 3 && !user.jobFunction.canLeadTeam) {
        await prisma.jobFunction.update({
          where: { id: user.jobFunction.id },
          data: { canLeadTeam: true },
        });
        console.log(
          `✓ Atualizado "${user.jobFunction.name}" para permitir liderança (Usuário: ${user.name})`,
        );
      }
      skipped++;
      continue;
    }

    const targetFunctionName = getFunctionName(user.hierarchyLevel);
    const companyFunctions = functionsByCompany.get(user.companyId) || [];

    // Procura função existente (case insensitive match ou partial match)
    let targetFunction = companyFunctions.find(
      (f: any) =>
        f.name.toLowerCase() === targetFunctionName.toLowerCase() ||
        f.name.toLowerCase().includes(targetFunctionName.toLowerCase()),
    );

    // Se não encontrar, cria nova função
    if (!targetFunction) {
      // Regra: Nível <= 3 são líderes
      const canLead = user.hierarchyLevel <= 3;

      targetFunction = await prisma.jobFunction.create({
        data: {
          companyId: user.companyId,
          name: targetFunctionName,
          canLeadTeam: canLead,
          hierarchyLevel: user.hierarchyLevel,
        },
      });
      console.log(
        `✓ Criada função "${targetFunctionName}" (canLeadTeam: ${canLead}) na empresa ${user.companyId.slice(0, 8)}`,
      );
      created++;

      // Atualiza cache local
      companyFunctions.push(targetFunction);
      functionsByCompany.set(user.companyId, companyFunctions);
    }

    // Atualiza o usuário com a função
    await prisma.user.update({
      where: { id: user.id },
      data: { functionId: targetFunction.id },
    });

    console.log(
      `✓ Atribuído: ${user.name || user.email} → ${targetFunction.name}`,
    );
    updated++;
  }

  // 5. Varredura final: Garante que TODAS as funções de quem é supervisor de equipe tenham canLeadTeam
  const teamLeaders = await prisma.team.findMany({
    where: { supervisorId: { not: null } },
    include: {
      supervisor: {
        include: { jobFunction: true },
      },
    },
  });

  let leadersFixed = 0;
  for (const team of teamLeaders) {
    if (
      team.supervisor?.jobFunction &&
      !team.supervisor.jobFunction.canLeadTeam
    ) {
      await prisma.jobFunction.update({
        where: { id: team.supervisor.jobFunction.id },
        data: { canLeadTeam: true },
      });
      console.log(
        `✓ CORREÇÃO: Função "${team.supervisor.jobFunction.name}" forçada para canLeadTeam=true (É supervisor da equipe ${team.name})`,
      );
      leadersFixed++;
    }
  }

  console.log("\n=== RESUMO ===");
  console.log(`Usuários atualizados: ${updated}`);
  console.log(`Novas funções criadas: ${created}`);
  console.log(`Usuários mantidos: ${skipped}`);
  console.log(`Funções de líderes corrigidas: ${leadersFixed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
