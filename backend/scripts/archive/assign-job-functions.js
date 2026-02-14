const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Script para atribuir funções (JobFunction) aos funcionários com base no hierarchyLevel
 *
 * Regra:
 * - hierarchyLevel <= 3 → Líder (Encarregado de Turma)
 * - hierarchyLevel == 4 → Operador
 * - hierarchyLevel >= 5 → Ajudante/Trabalhador
 */

async function main() {
  console.log("=== ATRIBUINDO FUNÇÕES AOS FUNCIONÁRIOS ===\n");

  // 1. Busca todos os usuários que são funcionários (tem companyId)
  const users = await prisma.user.findMany({
    where: { companyId: { not: null } },
    select: {
      id: true,
      name: true,
      companyId: true,
      functionId: true,
      hierarchyLevel: true,
      jobFunction: {
        select: { id: true, name: true, canLeadTeam: true },
      },
    },
  });

  console.log(`Total de funcionários: ${users.length}`);
  console.log(`Sem função: ${users.filter((u) => !u.functionId).length}\n`);

  // 2. Busca as funções existentes por empresa
  const companies = [...new Set(users.map((u) => u.companyId).filter(Boolean))];
  const functionsByCompany = new Map();

  for (const companyId of companies) {
    const functions = await prisma.jobFunction.findMany({
      where: { companyId },
    });
    functionsByCompany.set(companyId, functions);
    console.log(
      `Empresa ${companyId.slice(0, 8)}... tem ${functions.length} funções`,
    );
  }

  // 3. Mapeamento de hierarchyLevel para função
  const getFunctionName = (level) => {
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
    // Se já tem função definida, pula
    if (user.functionId && user.jobFunction) {
      skipped++;
      continue;
    }

    const targetFunctionName = getFunctionName(user.hierarchyLevel);
    const companyFunctions = functionsByCompany.get(user.companyId) || [];

    // Procura função existente
    let targetFunction = companyFunctions.find(
      (f) =>
        f.name.toLowerCase().includes(targetFunctionName.toLowerCase()) ||
        targetFunctionName
          .toLowerCase()
          .includes(f.name.toLowerCase().split(" ")[0]),
    );

    // Se não encontrar, cria nova função
    if (!targetFunction) {
      const canLead = user.hierarchyLevel <= 4;
      targetFunction = await prisma.jobFunction.create({
        data: {
          companyId: user.companyId,
          name: targetFunctionName,
          canLeadTeam: canLead,
          hierarchyLevel: user.hierarchyLevel,
        },
      });
      console.log(
        `✓ Criada função "${targetFunctionName}" (canLeadTeam: ${canLead})`,
      );
      created++;

      // Atualiza cache local
      companyFunctions.push(targetFunction);
    }

    // Atualiza o usuário com a função
    await prisma.user.update({
      where: { id: user.id },
      data: { functionId: targetFunction.id },
    });

    console.log(`✓ ${user.name || "Sem nome"} → ${targetFunction.name}`);
    updated++;
  }

  // 5. Garante que líderes de equipe tenham canLeadTeam=true
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
        `✓ Função "${team.supervisor.jobFunction.name}" agora pode liderar equipe`,
      );
      leadersFixed++;
    }
  }

  console.log("\n=== RESUMO ===");
  console.log(`Atualizados: ${updated}`);
  console.log(`Funções criadas: ${created}`);
  console.log(`Já tinham função: ${skipped}`);
  console.log(`Líderes corrigidos: ${leadersFixed}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
