import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🛠️  Iniciando Migração de Dados de Roles...");

  // 1. Converter SUPER_ADMIN_GOD para ADMIN
  const gods = await prisma.authCredential.updateMany({
    where: { role: "SUPER_ADMIN_GOD" as any },
    data: { role: "ADMIN" as any }
  });
  console.log(`✅ ${gods.count} usuários SUPER_ADMIN_GOD migrados para ADMIN.`);

  // 2. Converter SYSTEM_ADMIN para ADMIN (Se houver)
  const systemAdmins = await prisma.authCredential.updateMany({
    where: { role: "SYSTEM_ADMIN" as any },
    data: { role: "ADMIN" as any }
  });
  console.log(`✅ ${systemAdmins.count} usuários SYSTEM_ADMIN migrados para ADMIN.`);

  // 3. Garantir que HELPER_SYSTEM permaneça (ou migrar se houver algum padrão antigo)
  // Nota: Se HELPER_SYSTEM já for uma opção no Enum, o updateMany acima não o afetará.

  console.log("✨ Migração de dados concluída!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
