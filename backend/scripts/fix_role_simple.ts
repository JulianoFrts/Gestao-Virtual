import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({
      where: { name: 'Administrador Mestre' },
      select: { id: true, name: true, isSystemAdmin: true }
    });

    if (user) {
      // 1. Update the role inside AuthCredential
      const authResult = await prisma.authCredential.updateMany({
        where: { userId: user.id },
        data: { role: 'SUPER_ADMIN_GOD' }
      });
      
      console.log(`✅ Sucesso! O usuário ${user.name} (ID: ${user.id}) teve a ROLE definida como SUPER_ADMIN_GOD em AuthCredential. Registros afetados: ${authResult.count}`);
    } else {
       console.log("❌ Erro: Não foi encontrado usuário 'Administrador Mestre'");
    }
  } catch (error) {
    console.error("Erro durante a atualização:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
