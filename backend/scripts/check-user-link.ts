import { prisma } from "../src/lib/prisma/client";

async function main() {
  const email = "juliano@gestaovirtual.com";
  console.log(`🔍 Analisando perfil do usuário: ${email}`);
  
  const user = await prisma.user.findFirst({
    where: { authCredential: { email } },
    include: {
      authCredential: true,
      affiliation: {
        include: {
          company: true,
          project: true
        }
      }
    }
  });

  if (!user) {
    console.error("❌ Usuário não encontrado no banco.");
    return;
  }

  console.log("👤 Dados do Usuário:");
  console.log(`   - Nome: ${user.name}`);
  console.log(`   - Role: ${user.authCredential?.role}`);
  console.log(`   - System Admin: ${user.authCredential?.isSystemAdmin}`);
  
  console.log("🏢 Afiliação Atual:");
  console.log(`   - Empresa: ${user.affiliation?.company?.name || "Nenhuma"}`);
  console.log(`   - Projeto: ${user.affiliation?.project?.name || "Nenhum"}`);

  const project = await prisma.project.findFirst({
    where: { name: { contains: "LA TESTE", mode: "insensitive" } },
    include: { company: true }
  });

  if (project) {
    console.log("\n🏗️ Dados do Projeto 'LA TESTE':");
    console.log(`   - ID: ${project.id}`);
    console.log(`   - Empresa: ${project.company?.name}`);
    
    const isSameCompany = user.affiliation?.companyId === project.companyId;
    console.log(`\n🧐 Diagnóstico:`);
    if (user.authCredential?.role === "ADMIN" || user.authCredential?.role === "HELPER_SYSTEM") {
      console.log("   ✅ Você é ADMIN/HELPER. Deveria ver TUDO.");
    } else if (isSameCompany) {
      console.log("   ✅ Você está na mesma empresa.");
    } else {
      console.log("   ❌ Empresa diferente.");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
