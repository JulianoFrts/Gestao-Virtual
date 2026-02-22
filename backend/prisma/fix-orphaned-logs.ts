import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Iniciando Reparação de Logs de Auditoria ---");

  // 1. Identificar o usuário e empresa principal
  const masterUser = await prisma.user.findFirst({
    where: {
      authCredential: {
        role: { in: ["SUPER_ADMIN_GOD", "ADMIN", "TI_SOFTWARE"] },
      },
    },
    select: { id: true, companyId: true, name: true },
  });

  if (!masterUser || !masterUser.companyId) {
    console.error(
      "Erro: Nenhum usuário MASTER com empresa vinculada encontrado.",
    );
    return;
  }

  console.log(
    `Empresa Alvo identificada: ${masterUser.companyId} (via usuário ${masterUser.name})`,
  );

  // 2. Atualizar GovernanceAuditHistory
  const updatedAudit = await (prisma as any).governanceAuditHistory.updateMany({
    where: { companyId: null },
    data: { companyId: masterUser.companyId },
  });

  console.log(
    `Logs de Auditoria Arquitetural atualizados: ${updatedAudit.count}`,
  );

  // 3. Atualizar RouteHealthHistory
  const updatedRoutes = await (prisma as any).routeHealthHistory.updateMany({
    where: { companyId: null },
    data: { companyId: masterUser.companyId },
  });

  console.log(`Logs de Sanidade de Rotas atualizados: ${updatedRoutes.count}`);

  console.log("--- Reparação concluída com sucesso ---");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
