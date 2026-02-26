import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const DEFAULT_SKIP = 50;
    const DEFAULT_TAKE = 50;
    const SAMPLE_SIZE = 10;
    const PREVIEW_SIZE = 5;

    const skipStr = request.nextUrl.searchParams.get("skip");
    const takeStr = request.nextUrl.searchParams.get("take");

    const skip = skipStr ? parseInt(skipStr) : DEFAULT_SKIP;
    const take = takeStr ? parseInt(takeStr) : DEFAULT_TAKE;

    const legacyElements = await prisma.mapElementTechnicalData.findMany({
      where: { elementType: "TOWER" },
      orderBy: { sequence: "asc" },
      skip,
      take,
      select: { externalId: true, sequence: true },
    });

    const externalIds = legacyElements.map((e: { externalId: string }) => e.externalId);

    const towers = await prisma.towerProduction.findMany({
      where: { towerId: { in: externalIds } },
      select: { towerId: true },
    });

    const constructions = await prisma.towerConstruction.findMany({
      where: { towerId: { in: externalIds } },
      select: { towerId: true },
    });

    // Check what is missing
    const towerMissing = externalIds.filter(
      (id: string) => !towers.some((t: { towerId: string }) => t.towerId === id),
    );
    const tcMissing = externalIds.filter(
      (id: string) => !constructions.some((t: { towerId: string }) => t.towerId === id),
    );

    return ApiResponse.json({
      skip,
      take,
      legacyCount: legacyElements.length,
      towersFound: towers.length,
      constructionsFound: constructions.length,
      towerMissingCount: towerMissing.length,
      towerMissingSample: towerMissing.slice(0, SAMPLE_SIZE),
      tcMissingCount: tcMissing.length,
      tcMissingSample: tcMissing.slice(0, SAMPLE_SIZE),
      firstLegacyIds: externalIds.slice(0, PREVIEW_SIZE),
    });
  } catch (error: unknown) {
    return handleApiError(error, "src/app/api/v1/debug/sequences/route.ts#GET");
  }
}
