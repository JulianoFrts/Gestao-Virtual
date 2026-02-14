import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";
import { getCurrentSession } from "@/lib/auth/session";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";


// GET: Fetch work stages for a site/project
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");
    const projectId = searchParams.get("projectId");
    const companyId = searchParams.get("companyId");
    const linkedOnly = searchParams.get("linkedOnly") === "true";

    // Normalize parameters to handle mock or invalid values from frontend hydration
    const effectiveProjectId = (!projectId || projectId === 'all' || projectId === 'undefined' || projectId === 'null') ? null : projectId;
    const effectiveSiteId = (!siteId || siteId === 'all' || siteId === 'none' || siteId === 'undefined' || siteId === 'null') ? null : siteId;

    // We MUST have at least a projectId to function properly at project level
    // Return empty array instead of 400 to be more resilient during initial load
    if (!effectiveProjectId && !effectiveSiteId) {
      return NextResponse.json([]);
    }

    const where: any = {};
    
    if (linkedOnly) {
      where.productionActivityId = { not: null };
    }
    
    if (effectiveSiteId) {
        where.siteId = effectiveSiteId;
    } else if (effectiveProjectId) {
        // Return stages linked directly to project OR linked to a site in the project
        where.OR = [
           { projectId: effectiveProjectId },
           { site: { projectId: effectiveProjectId } }
        ];
    }

    // Optional company filter if provided
    if (companyId) {
       // Se já temos filtro por site, adicionamos companyId.
       // Caso contrário, precisamos garantir que buscamos em sites da empresa ou projeto da empresa
       // Mas simplificando: se filtrar por company, garantimos que o projeto pertence à company
       // ou o site pertence.
       // Por segurança, se companyId for fornecido, adicionamos uma verificação extra
       // Mas dada a complexidade do OR acima, é melhor confiar no projectId se presente.
    }

    const stages = await (prisma as any).workStage.findMany({
      where,
      include: {
        progress: {
          orderBy: { recordedDate: "desc" },
          take: 1,
        },
        site: {
          include: {
            project: true
          }
        }
      },
      orderBy: { displayOrder: "asc" },
    });

    return NextResponse.json(stages);
  } catch (error) {
    console.error("Error fetching work stages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Create a new work stage
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      siteId,
      projectId, // Added support for project-level stages
      name,
      description,
      weight,
      parentId,
      displayOrder,
      productionActivityId,
    } = body;

    // Se siteId for 'all', 'none' ou vazio, tratamos como nulo (nível de projeto)
    const effectiveSiteId = (!siteId || siteId === 'all' || siteId === 'none') ? null : siteId;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    if (!effectiveSiteId && !projectId) {
      return NextResponse.json(
        { error: "Site ID or Project ID is required" },
        { status: 400 },
      );
    }

    // Validação de productionActivityId: Ignorar se for um ID de mock (ex: cat-*, act-*) 
    // ou se não for um UUID válido, para evitar erro P2003 do Prisma.
    let effectiveActivityId = productionActivityId;
    if (effectiveActivityId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(effectiveActivityId);
      if (!isUuid) {
        console.warn(`[WORK-STAGES POST] Ignoring invalid/mock productionActivityId: ${effectiveActivityId}`);
        effectiveActivityId = null;
      } else {
        // Verificar se existe no banco para evitar P2003
        const exists = await prisma.productionActivity.findUnique({ where: { id: effectiveActivityId } });
        if (!exists) {
          console.warn(`[WORK-STAGES POST] Production activity ${effectiveActivityId} not found. Clearing.`);
          effectiveActivityId = null;
        }
      }
    }

    // Se projectId for 'all' ou vazio, tratamos como nulo
    const effectiveProjectId = (!projectId || projectId === 'all') ? null : projectId;

    const stage = await (prisma as any).workStage.create({
      data: {
        siteId: effectiveSiteId,
        projectId: effectiveProjectId,
        name,
        description: description || null,
        weight: weight || 1.0,
        parentId: parentId || null,
        displayOrder: displayOrder || 0,
        productionActivityId: effectiveActivityId || null,
      },
    });

    return ApiResponse.created(stage, "Etapa criada com sucesso");
  } catch (error: any) {
    console.error("Error creating work stage:", error);
    return handleApiError(error);
  }
}
