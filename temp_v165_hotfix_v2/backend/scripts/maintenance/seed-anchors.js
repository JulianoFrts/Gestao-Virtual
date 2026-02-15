const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const STANDARD_COMPANY_ID = "00000000-0000-0000-0000-000000000000";
const STANDARD_PROJECT_ID = "00000000-0000-0000-0000-000000000000";
const STANDARD_TOWER_ID = "default-tower";

async function main() {
  console.log("🚀 Iniciando Seed de Âncoras Padrão...");

  // 1. Ensure Standard Company exists
  let existingCompany = await prisma.company.findFirst({
    where: {
      OR: [{ id: STANDARD_COMPANY_ID }, { taxId: "00000000000000" }],
    },
  });

  let finalCompanyId = STANDARD_COMPANY_ID;
  if (!existingCompany) {
    await prisma.company.create({
      data: {
        id: STANDARD_COMPANY_ID,
        name: "Empresa Padrão",
        taxId: "00000000000000",
        isActive: true,
      },
    });
  } else {
    finalCompanyId = existingCompany.id;
  }

  // 2. Ensure Project exists
  let existingProject = await prisma.project.findFirst({
    where: {
      OR: [{ id: STANDARD_PROJECT_ID }, { code: "STD-001" }],
    },
  });

  let finalProjectId = STANDARD_PROJECT_ID;
  if (!existingProject) {
    await prisma.project.create({
      data: {
        id: STANDARD_PROJECT_ID,
        companyId: finalCompanyId,
        name: "Obra Padrão",
        code: "STD-001",
        status: "active",
      },
    });
  } else {
    finalProjectId = existingProject.id;
  }

  const anchors = [
    {
      id: "opgw-vante",
      name: "CABO OPGW VANTE",
      type: "cable_attach",
      position: [0, 30, 0],
      meshName: "opgw",
    },
    {
      id: "opgw-re",
      name: "CABO OPGW RÉ",
      type: "cable_attach",
      position: [0, 30, 0],
      meshName: "opgw",
    },

    {
      id: "38-vante",
      name: "CABO 3/8 VANTE",
      type: "cable_attach",
      position: [2, 30, 0],
      meshName: "cabo38",
    },
    {
      id: "38-re",
      name: "CABO 3/8 RÉ",
      type: "cable_attach",
      position: [2, 30, 0],
      meshName: "cabo38",
    },

    {
      id: "a1-vante",
      name: "FASE A1 VANTE",
      type: "cable_attach",
      position: [-5, 25, 0],
      meshName: "faseA1",
    },
    {
      id: "a1-re",
      name: "FASE A1 RÉ",
      type: "cable_attach",
      position: [-5, 25, 0],
      meshName: "faseA1",
    },

    {
      id: "a2-vante",
      name: "FASE A2 VANTE",
      type: "cable_attach",
      position: [5, 25, 0],
      meshName: "faseA2",
    },
    {
      id: "a2-re",
      name: "FASE A2 RÉ",
      type: "cable_attach",
      position: [5, 25, 0],
      meshName: "faseA2",
    },

    {
      id: "a3-vante",
      name: "FASE A3 VANTE",
      type: "cable_attach",
      position: [-7, 20, 0],
      meshName: "faseA3",
    },
    {
      id: "a3-re",
      name: "FASE A3 RÉ",
      type: "cable_attach",
      position: [-7, 20, 0],
      meshName: "faseA3",
    },

    {
      id: "a4-vante",
      name: "FASE A4 VANTE",
      type: "cable_attach",
      position: [7, 20, 0],
      meshName: "faseA4",
    },
    {
      id: "a4-re",
      name: "FASE A4 RÉ",
      type: "cable_attach",
      position: [7, 20, 0],
      meshName: "faseA4",
    },

    {
      id: "b1-vante",
      name: "FASE B1 VANTE",
      type: "cable_attach",
      position: [-5, 15, 0],
      meshName: "faseB1",
    },
    {
      id: "b1-re",
      name: "FASE B1 RÉ",
      type: "cable_attach",
      position: [-5, 15, 0],
      meshName: "faseB1",
    },

    {
      id: "b2-vante",
      name: "FASE B2 VANTE",
      type: "cable_attach",
      position: [5, 15, 0],
      meshName: "faseB2",
    },
    {
      id: "b2-re",
      name: "FASE B2 RÉ",
      type: "cable_attach",
      position: [5, 15, 0],
      meshName: "faseB2",
    },
  ];

  await prisma.model3DAnchor.upsert({
    where: {
      companyId_projectId_towerId: {
        companyId: finalCompanyId,
        projectId: finalProjectId,
        towerId: STANDARD_TOWER_ID,
      },
    },
    update: { anchors },
    create: {
      companyId: finalCompanyId,
      projectId: finalProjectId,
      towerId: STANDARD_TOWER_ID,
      anchors,
    },
  });

  console.log("✅ Template Global criado com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
