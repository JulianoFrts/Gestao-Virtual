import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Encontrar o usuário na base de dados Auth (onde o e-mail fica guardado no Supabase/Postgres)
    const result = await prisma.$queryRaw`SELECT id FROM auth.users WHERE email = 'juliano@gestaovirtual.com' LIMIT 1`;
    
    // Type casting and validation based on $queryRaw return patterns
    const authUsers = result as any[];
    
    if (authUsers && authUsers.length > 0 && authUsers[0].id) {
      const userId = authUsers[0].id;
      
      // 2. Atualizar a tabela relacional do Prisma que contém as roles dentro do schema public
      const updateResult = await prisma.userAffiliation.updateMany({
        where: { userId: userId },
        data: { role: 'SUPER_ADMIN_GOD' }
      });
      
      console.log(\`✅ Sucesso! O usuário com ID \${userId} teve sua role atualizada para SUPER_ADMIN_GOD. Registros afetados: \${updateResult.count}\`);
      
    } else {
       console.log("❌ Erro: Não foi possível encontrar nenhum usuário na tabela 'auth.users' com este e-mail.");
    }
  } catch (error) {
    console.error("Erro durante a atualização:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
