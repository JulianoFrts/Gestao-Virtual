import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const skipStr = request.nextUrl.searchParams.get("skip");
    const takeStr = request.nextUrl.searchParams.get("take");

    const skip = skipStr ? parseInt(skipStr) : 50;
    const take = takeStr ? parseInt(takeStr) : 50;

    const legacyElements = await prisma.mapElementTechnicalData.findMany({
      where: { elementType: "TOWER" },
      orderBy: { sequence: "asc" },
      skip,
      take,
      select: { externalId: true, sequence: true },
    });

    const externalIds = legacyElements.map((e: any) => e.externalId);

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
      (id: string) => !towers.some((t: any) => t.towerId === id),
    );
    const tcMissing = externalIds.filter(
      (id: string) => !constructions.some((t: any) => t.towerId === id),
    );

    return ApiResponse.json({
      skip,
      take,
      legacyCount: legacyElements.length,
      towersFound: towers.length,
      constructionsFound: constructions.length,
      towerMissingCount: towerMissing.length,
      towerMissingSample: towerMissing.slice(0, 10),
      tcMissingCount: tcMissing.length,
      tcMissingSample: tcMissing.slice(0, 10),
      first5LegacyIds: externalIds.slice(0, 5),
    });
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/debug/sequences/route.ts#GET");
  }
}
