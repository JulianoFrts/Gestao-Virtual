import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { JOB_HIERARCHY } from "../src/lib/constants/business";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

/**
 * Seed de Infraestrutura: Empresa → Obra → Canteiro → Funções
 * Executar ANTES do seed de pessoal/equipes.
 */

const COMPANY = {
  name: "LA Construtora",
  taxId: "12345678000199",
  address: "Av. Brasil, 1000 - Rio de Janeiro/RJ",
  phone: "(21) 3333-4444",
};

const PROJECT = {
  name: "LA TESTE",
  code: "LA-001",
  description: "Linha de Transmissão LA TESTE - Projeto piloto",
  status: "active",
};

const SITES = [
  {
    name: "Canteiro Principal",
    code: "CP-001",
    locationDetails: "KM 0 - Base operacional principal",
  },
  {
    name: "Canteiro Frente A",
    code: "FA-001",
    locationDetails: "KM 50 - Frente de fundação e montagem",
  },
  {
    name: "Canteiro Frente B",
    code: "FB-001",
    locationDetails: "KM 120 - Frente de cabos e lançamento",
  },
];

const JOB_FUNCTIONS = [
  { name: "Project Manager", hierarchy: JOB_HIERARCHY.MANAGER, canLead: true },
  {
    name: "Engenheiro Residente",
    hierarchy: JOB_HIERARCHY.MANAGER,
    canLead: true,
  },
  {
    name: "Coordenador de Obra",
    hierarchy: JOB_HIERARCHY.COORDINATOR,
    canLead: true,
  },
  {
    name: "Supervisor de Campo",
    hierarchy: JOB_HIERARCHY.COORDINATOR,
    canLead: true,
  },
  {
    name: "Engenheiro Civil",
    hierarchy: JOB_HIERARCHY.ENGINEER,
    canLead: false,
  },
  {
    name: "Engenheiro Eletricista",
    hierarchy: JOB_HIERARCHY.ENGINEER,
    canLead: false,
  },
  {
    name: "Encarregado de Turma",
    hierarchy: JOB_HIERARCHY.LEADER,
    canLead: true,
  },
  { name: "Topógrafo", hierarchy: JOB_HIERARCHY.TECHNICIAN, canLead: false },
  {
    name: "Técnico de Segurança",
    hierarchy: JOB_HIERARCHY.TECHNICIAN,
    canLead: false,
  },
  { name: "Motorista", hierarchy: JOB_HIERARCHY.OPERATOR, canLead: false },
  {
    name: "Operador de Munck",
    hierarchy: JOB_HIERARCHY.OPERATOR,
    canLead: false,
  },
  {
    name: "Operador de Trator",
    hierarchy: JOB_HIERARCHY.OPERATOR,
    canLead: false,
  },
  { name: "Montador", hierarchy: JOB_HIERARCHY.SKILLED, canLead: false },
  { name: "Armador", hierarchy: JOB_HIERARCHY.SKILLED, canLead: false },
  { name: "Carpinteiro", hierarchy: JOB_HIERARCHY.SKILLED, canLead: false },
  { name: "Pedreiro", hierarchy: JOB_HIERARCHY.SKILLED, canLead: false },
  { name: "Eletricista", hierarchy: JOB_HIERARCHY.SKILLED, canLead: false },
  { name: "Nivelador", hierarchy: JOB_HIERARCHY.SKILLED, canLead: false },
  { name: "Ajudante", hierarchy: JOB_HIERARCHY.HELPER, canLead: false },
  { name: "Servente", hierarchy: JOB_HIERARCHY.HELPER, canLead: false },
];

export async function seedInfrastructure(prismaClient: PrismaClient = prisma) {
  console.log("🏗️  Iniciando seed de infraestrutura...");

  // ── 1. Empresa ──
  let company = await prismaClient.company.findFirst({
    where: { taxId: COMPANY.taxId },
  });

  if (!company) {
    company = await prismaClient.company.create({ data: COMPANY });
    console.log(`✅ Empresa criada: ${company.name} (${company.id})`);
  } else {
    console.log(`✔️  Empresa já existe: ${company.name}`);
  }

  // ── 2. Obra / Projeto ──
  let project = await prismaClient.project.findFirst({
    where: { name: PROJECT.name, companyId: company.id },
  });

  if (!project) {
    project = await prismaClient.project.create({
      data: {
        ...PROJECT,
        companyId: company.id,
      },
    });
    console.log(`✅ Obra criada: ${project.name} (${project.id})`);
  } else {
    console.log(`✔️  Obra já existe: ${project.name}`);
  }

  // ── 3. Canteiros ──
  for (const siteData of SITES) {
    let site = await prismaClient.site.findFirst({
      where: { projectId: project.id, code: siteData.code },
    });

    if (!site) {
      site = await prismaClient.site.create({
        data: {
          ...siteData,
          projectId: project.id,
        },
      });
      console.log(`  ✅ Canteiro criado: ${site.name} (${site.code})`);
    } else {
      console.log(`  ✔️  Canteiro já existe: ${site.name}`);
    }
  }

  // ── 4. Funções de Trabalho (JobFunction) ──
  console.log(`Sincronizando ${JOB_FUNCTIONS.length} funções...`);
  for (const func of JOB_FUNCTIONS) {
    const existing = await prismaClient.jobFunction.findFirst({
      where: { companyId: company.id, name: func.name },
    });

    if (existing) {
      await prismaClient.jobFunction.update({
        where: { id: existing.id },
        data: {
          hierarchyLevel: func.hierarchy,
          canLeadTeam: func.canLead,
        },
      });
    } else {
      await prismaClient.jobFunction.create({
        data: {
          id: crypto.randomUUID(),
          companyId: company.id,
          name: func.name,
          hierarchyLevel: func.hierarchy,
          canLeadTeam: func.canLead,
        },
      });
    }
  }
  console.log(`✅ ${JOB_FUNCTIONS.length} funções sincronizadas!`);

  // ── 5. Vincular SUPER_ADMIN_GOD à empresa/projeto ──
  const superAdmin = await prismaClient.authCredential.findUnique({
    where: { email: "juliano@gestaovirtual.com" },
  });

  if (superAdmin) {
    await prismaClient.userAffiliation.upsert({
      where: { userId: superAdmin.userId },
      update: {
        companyId: company.id,
        projectId: project.id,
      },
      create: {
        userId: superAdmin.userId,
        companyId: company.id,
        projectId: project.id,
      },
    });
    console.log("✅ SUPER_ADMIN vinculado à empresa e obra.");
  }

  console.log("🏗️  Infraestrutura pronta!");
  return { companyId: company.id, projectId: project.id };
}

// Self-run only if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedInfrastructure()
    .catch((e) => {
      console.error("❌ Erro:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
