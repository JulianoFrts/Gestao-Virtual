import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CONTEXT = {
  companyId: "65192551-60a2-4bac-9bcf-85323f769fa8",
  projectId: "0d6675ac-16d2-428b-9127-2de7a4398d0b",
  siteId: "dd752f40-5928-4bb6-9ad6-578038d5ce9d",
};

const NAMES = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Rodrigues",
  "Ferreira",
  "Alves",
  "Pereira",
  "Lima",
  "Gomes",
  "Costa",
  "Ribeiro",
  "Martins",
  "Carvalho",
  "Almeida",
  "Lopes",
  "Soares",
  "Fernandes",
  "Vieira",
  "Barbosa",
  "Rocha",
  "Dias",
  "Nascimento",
  "Andrade",
  "Moreira",
  "Nunes",
  "Marques",
  "Machado",
  "Mendes",
  "Freitas",
  "Cardoso",
  "Ramos",
  "Santana",
  "Teixeira",
  "Guimarães",
  "Araújo",
  "Melo",
  "Castro",
  "Pinto",
  "Oliveira",
];

const FIRST_NAMES = [
  "José",
  "João",
  "Antônio",
  "Francisco",
  "Carlos",
  "Paulo",
  "Pedro",
  "Lucas",
  "Luiz",
  "Marcos",
  "Luís",
  "Gabriel",
  "Rafael",
  "Daniel",
  "Marcelo",
  "Bruno",
  "Eduardo",
  "Felipe",
  "Rodrigo",
  "Manoel",
  "Sebastião",
  "Jorge",
  "André",
  "Luiz",
  "Fernando",
  "Alexandre",
  "Roberto",
  "Ricardo",
  "Claudio",
  "Samuel",
];

async function seed() {
  console.log(
    "🚀 Iniciando Simulação de 550 Funcionários com Serviços Preliminares...\n",
  );

  // Limpeza opcional: Se quiser remover simulações anteriores do LA TESTE para não duplicar equipes
  await prisma.teamMember.deleteMany({
    where: {
      team: { siteId: CONTEXT.siteId, name: { contains: "Simulação" } },
    },
  });
  await prisma.team.deleteMany({
    where: { siteId: CONTEXT.siteId, name: { contains: "Simulação" } },
  });

  // 1. Garantir Funções (JobFunctions)
  const jobFunctionData = [
    { name: "Encarregado de Turma", canLeadTeam: true },
    { name: "Motorista", canLeadTeam: false },
    { name: "Ajudante", canLeadTeam: false },
    { name: "Montador", canLeadTeam: false },
    { name: "Armador", canLeadTeam: false },
    { name: "Carpinteiro", canLeadTeam: false },
    { name: "Operador de Munck", canLeadTeam: false },
    { name: "Operador de Trator", canLeadTeam: false },
    { name: "Eletricista", canLeadTeam: false },
    { name: "Topógrafo", canLeadTeam: false },
    { name: "Nivelador", canLeadTeam: false },
  ];

  const jobFunctions: Record<string, string> = {};
  for (const f of jobFunctionData) {
    const jf = await prisma.jobFunction.upsert({
      where: { companyId_name: { companyId: CONTEXT.companyId, name: f.name } },
      update: { canLeadTeam: f.canLeadTeam },
      create: {
        companyId: CONTEXT.companyId,
        name: f.name,
        canLeadTeam: f.canLeadTeam,
      },
    });
    jobFunctions[f.name] = jf.id;
  }

  // 2. Criar ou Obter 550 Usuários
  console.log("👥 Preparando 550 usuários...");
  let users = await prisma.user.findMany({
    where: { authCredential: { email: { contains: "@orion-sim.com" } } },
    take: 550,
  });

  if (users.length < 550) {
    for (let i = users.length; i < 550; i++) {
      const firstName =
        FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = NAMES[Math.floor(Math.random() * NAMES.length)];
      const fullName = `${firstName} ${lastName} ${NAMES[Math.floor(Math.random() * NAMES.length)]}`;
      const email = `sim.${i + 1}@orion-sim.com`;

      const user = await prisma.user.create({
        data: {
          name: fullName,
          hierarchyLevel: 0,
          functionId: jobFunctions["Ajudante"],
          affiliation: {
            create: {
                companyId: CONTEXT.companyId,
                projectId: CONTEXT.projectId,
                siteId: CONTEXT.siteId
            }
          },
          authCredential: {
            create: {
                email: email,
                password: "$2b$10$EpWa/z.6q.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1.1", // hash dummy
                status: "ACTIVE",
                role: "USER" // ou WORKER se existir no enum Role
            }
          }
        },
      });
      users.push(user);
    }
  }

  // 3. Criar Equipes (Total 33)
  const teamConfigs = [
    {
      name: "Simulação Preliminar: Topografia",
      count: 3,
      spec: "Topógrafo",
      size: 16,
    },
    {
      name: "Simulação Preliminar: Acessos",
      count: 3,
      spec: "Operador de Trator",
      size: 17,
    },
    { name: "Simulação Fundação", count: 7, spec: "Armador", size: 16 },
    { name: "Simulação Montagem", count: 10, spec: "Montador", size: 17 },
    { name: "Simulação Lançamento", count: 10, spec: "Eletricista", size: 17 },
  ];

  let userIdx = 0;
  for (const config of teamConfigs) {
    for (let i = 1; i <= config.count; i++) {
      if (userIdx >= users.length) break;

      const teamName = `${config.name} ${i.toString().padStart(2, "0")}`;
      const supervisor = users[userIdx];

      const team = await prisma.team.create({
        data: {
          name: teamName,
          companyId: CONTEXT.companyId,
          siteId: CONTEXT.siteId,
          supervisorId: supervisor.id,
          isActive: true,
        },
      });

      console.log(`🏗️ Criada: ${teamName} (Líder: ${supervisor.name})`);

      // Membros fixos
      const members = [
        { user: users[userIdx++], function: "Encarregado de Turma" },
        { user: users[userIdx++], function: "Motorista" },
        { user: users[userIdx++], function: "Ajudante" },
        { user: users[userIdx++], function: "Ajudante" },
        { user: users[userIdx++], function: "Ajudante" },
        { user: users[userIdx++], function: "Ajudante" },
      ];

      // Especialistas
      while (members.length < config.size && userIdx < users.length) {
        members.push({ user: users[userIdx++], function: config.spec });
      }

      for (const m of members) {
        if (!m.user) continue;
        await prisma.user.update({
          where: { id: m.user.id },
          data: { functionId: jobFunctions[m.function] },
        });
        await prisma.teamMember.create({
          data: { teamId: team.id, userId: m.user.id },
        });
      }
    }
  }

  console.log(`\n✅ Simulação concluída com sucesso no projeto LA TESTE!`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
