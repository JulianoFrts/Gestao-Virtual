import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { fakerPT_BR as faker } from "@faker-js/faker";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 INICIANDO MANUTENÇÃO MASSIVA (VIA ADAPTER)...");

  try {
    // 1. Carregar Funções
    const allFunctions = await prisma.jobFunction.findMany();
    const funcMap = new Map(allFunctions.map((f) => [f.id, f]));
    console.log(`📊 Funções: ${allFunctions.length}`);

    // 2. Anonimizar Usuários
    const allUsers = await prisma.user.findMany({
      where: { NOT: { authCredential: { role: "SUPER_ADMIN_GOD" } } },
      include: { authCredential: true }
    });

    console.log(`👥 Processando ${allUsers.length} usuários...`);
    let count = 0;
    for (const user of allUsers) {
      const email = user.authCredential?.email;
      // Exceções de segurança
      if (
        email === "admin@orion.com" ||
        email === "julianogitiz@gmail.com" ||
        email === "teste@gestaovirtual.com"
      )
        continue;

      const fullName = `${faker.person.firstName()} ${faker.person.lastName()}`;
      const func = user.functionId ? funcMap.get(user.functionId) : null;
      const isMOI =
        func?.description === "MOI" ||
        (user.hierarchyLevel && user.hierarchyLevel <= 5);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: fullName,
          cpf: faker.string.numeric("###.###.###-##"),
          phone: faker.helpers.replaceSymbols("(##) 9####-####"),
          authCredential: {
              update: {
                  email: `${user.id.slice(-8)}@orion.ficticio`,
                  role: isMOI ? "MANAGER" : "WORKER"
              }
          }
        },
      });
      count++;
      if (count % 200 === 0)
        console.log(`   ✅ ${count} usuários anonimizados...`);
    }
    console.log(`   ✨ Total de ${count} usuários anonimizados.`);

    // 3. Auditoria de Equipes
    const teams = await prisma.team.findMany({
      include: {
        members: { include: { user: { include: { jobFunction: true } } } },
        supervisor: { include: { jobFunction: true } },
      },
    });

    console.log(`🏗️ Auditando ${teams.length} equipes...`);
    for (const team of teams) {
      if (team.members.length === 0) continue;

      // Liderança
      const currentSupervisor = team.supervisor;
      const supervisorCanLead =
        currentSupervisor?.jobFunction?.canLeadTeam ||
        (currentSupervisor?.hierarchyLevel &&
          currentSupervisor.hierarchyLevel <= 4);

      if (!supervisorCanLead) {
        const potentialLeader = team.members.find(
          (m) =>
            m.user.jobFunction?.canLeadTeam ||
            (m.user.hierarchyLevel && m.user.hierarchyLevel <= 4),
        );
        if (potentialLeader) {
          await prisma.team.update({
            where: { id: team.id },
            data: { supervisorId: potentialLeader.user.id },
          });
        }
      }

      // Segregação MOD/MOI
      const memberTypes = team.members.map(
        (m) => m.user.jobFunction?.description || "MOD",
      );
      if (memberTypes.includes("MOD") && memberTypes.includes("MOI")) {
        const modCount = memberTypes.filter((t) => t === "MOD").length;
        const targetType = modCount >= team.members.length / 2 ? "MOD" : "MOI";
        for (const member of team.members) {
          if ((member.user.jobFunction?.description || "MOD") !== targetType) {
            await prisma.teamMember.delete({ where: { id: member.id } });
          }
        }
      }
    }
    console.log("✅ MANUTENÇÃO CONCLUÍDA COM SUCESSO!");
  } catch (err) {
    console.error("❌ ERRO NA MANUTENÇÃO:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
