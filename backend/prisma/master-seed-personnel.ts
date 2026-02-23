import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { DATA_PART_1 } from "./data-real-1";
import { DATA_PART_2 } from "./data-real-2";
import { DATA_PART_3 } from "./data-real-3";
import { DATA_PART_4 } from "./data-real-4";
import { DATA_PART_5 } from "./data-real-5";
import { DATA_PART_6 } from "./data-real-6";
import { DATA_PART_7 } from "./data-real-7";
import { JOB_HIERARCHY, PASSWORD_HASHES } from "../src/lib/constants/business";

dotenv.config();

const globalPrisma = new PrismaClient();

interface Person {
  nGeral: number;
  eap: string;
  desc: string;
  matricula: string;
  nome: string;
  funcao: string;
  moe: string;
  local: string;
  equ?: string;
  placa?: string;
}

export async function seedPersonnel(prisma: PrismaClient = globalPrisma) {
  const ALL_DATA: Person[] = [
    ...(DATA_PART_1 as Person[]),
    ...(DATA_PART_2 as Person[]),
    ...(DATA_PART_3 as Person[]),
    ...(DATA_PART_4 as Person[]),
    ...(DATA_PART_5 as Person[]),
    ...(DATA_PART_6 as Person[]),
    ...(DATA_PART_7 as Person[]),
  ];

  console.log(`Iniciando re-carga de ${ALL_DATA.length} funcionários...`);

  // 1. Localizar Projeto "LA TESTE"
  const project = await prisma.project.findFirst({
    where: { name: "LA TESTE" },
  });

  if (!project) {
    console.error(
      'Projeto "LA TESTE" não encontrado. Execute o seed do mapa primeiro.',
    );
    return;
  }

  const companyId = project.companyId;

  // 2. Mapear e Criar/Atualizar Funções Únicas
  const uniqueFunctions = Array.from(
    new Set(ALL_DATA.map((d) => d.funcao || d.nome).filter(Boolean)),
  );
  console.log(`Sincronizando ${uniqueFunctions.length} funções...`);

  const getHierarchy = (funcao: string) => {
    const f = funcao.toUpperCase();
    if (
      f.includes("PROJECT MANAGER") ||
      f.includes("SITE MANAGER") ||
      f.includes("RESIDENTE")
    )
      return JOB_HIERARCHY.MANAGER;
    if (f.includes("COORDENADOR") || f.includes("SUPERVISOR"))
      return JOB_HIERARCHY.COORDINATOR;
    if (f.includes("ENGENHEIRO")) return JOB_HIERARCHY.ENGINEER;
    if (f.includes("ENCARREGADO") || f.includes("LÍDER"))
      return JOB_HIERARCHY.LEADER;
    if (f.includes("TECNICO") || f.includes("TOPOGRAFO"))
      return JOB_HIERARCHY.TECHNICIAN;
    if (f.includes("MOTORISTA") || f.includes("OPERADOR"))
      return JOB_HIERARCHY.OPERATOR;
    if (
      f.includes("PEDREIRO") ||
      f.includes("CARPINTEIRO") ||
      f.includes("ARMADOR")
    )
      return JOB_HIERARCHY.SKILLED;
    if (f.includes("AJUDANTE") || f.includes("SERVENTE"))
      return JOB_HIERARCHY.HELPER;
    return JOB_HIERARCHY.DEFAULT;
  };

  for (const funcName of uniqueFunctions) {
    await prisma.jobFunction.upsert({
      where: { companyId_name: { companyId, name: funcName } },
      update: {
        hierarchyLevel: getHierarchy(funcName),
        canLeadTeam: getHierarchy(funcName) <= JOB_HIERARCHY.LEADER,
      },
      create: {
        id: crypto.randomUUID(),
        companyId,
        name: funcName,
        hierarchyLevel: getHierarchy(funcName),
        canLeadTeam: getHierarchy(funcName) <= JOB_HIERARCHY.LEADER,
        description: ALL_DATA.find((d) => d.funcao === funcName)?.moe || "MOD",
      },
    });
  }

  // 3. Criar Equipes baseadas na EAP (IDEMPOTENTE)
  const uniqueEaps = Array.from(new Set(ALL_DATA.map((d) => d.desc)));
  console.log(`Sincronizando ${uniqueEaps.length} equipes baseadas na EAP...`);

  const teamMap = new Map();

  for (const eapDesc of uniqueEaps) {
    let team = await prisma.team.findFirst({
      where: { name: eapDesc, companyId },
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: eapDesc,
          companyId,
          isActive: true,
        },
      });
    }
    teamMap.set(eapDesc, team.id);
  }

  // 4. Criar Usuários e Vincular aos Times
  console.log("Importando funcionários e montando composições...");
  const jobFunctions = await prisma.jobFunction.findMany({
    where: { companyId },
  });

  for (const person of ALL_DATA) {
    const actualFuncao = person.funcao || "AJUDANTE";
    const actualNome = person.nome || `Funcionário ${person.matricula}`;

    const func = jobFunctions.find((f) => f.name === actualFuncao);
    const email = `${person.matricula}@orion.pro`;

    let user = await prisma.user.findFirst({
      where: { authCredential: { email } },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: actualNome,
          registrationNumber: person.matricula,
          functionId: func?.id,
          hierarchyLevel: func?.hierarchyLevel || JOB_HIERARCHY.DEFAULT,
          affiliation: {
            upsert: {
              create: { projectId: project.id, companyId },
              update: { projectId: project.id },
            },
          },
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: actualNome,
          registrationNumber: person.matricula,
          functionId: func?.id,
          hierarchyLevel: func?.hierarchyLevel || JOB_HIERARCHY.DEFAULT,
          // role e status movidos para AuthCredential
          authCredential: {
            create: {
              email,
              password: PASSWORD_HASHES.DEFAULT_SEED,
              role: person.moe === "MOI" ? "MANAGER" : "USER", // Role enum usually has USER, ADMIN, etc. Assuming USER for WORKER equivalent or verify Enum
              status: "ACTIVE",
            },
          },
          affiliation: {
            create: {
              projectId: project.id,
              companyId: companyId,
            },
          },
        },
      });
    }

    // Vincular ao Time correspondente à EAP
    const teamId = teamMap.get(person.desc);
    if (teamId) {
      await prisma.teamMember.upsert({
        where: { userId: user.id },
        update: { teamId },
        create: { teamId, userId: user.id },
      });

      // Se for um encarregado ou superior (Lível <= 4), definir como supervisor do time
      if (func && func.hierarchyLevel <= 4) {
        await prisma.team.update({
          where: { id: teamId },
          data: { supervisorId: user.id },
        });
      }
    }
  }

  console.log("Carga massiva e composições de equipes concluídas com sucesso!");
}

// Self-run only if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedPersonnel(globalPrisma)
    .catch(console.error)
    .finally(() => globalPrisma.$disconnect());
}
