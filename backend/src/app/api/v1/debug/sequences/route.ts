import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.mapElementTechnicalData.findMany({
      where: { elementType: "TOWER" },
      orderBy: { sequence: "asc" },
      select: { externalId: true, sequence: true },
    });

    const missing = [];
    const seqs = data.map((d) => d.sequence);

    if (seqs.length > 0) {
      let last = seqs[0] - 1;
      for (let i = 0; i < seqs.length; i++) {
        if (seqs[i] !== last + 1) {
          missing.push(
            `Jump from ${last} to ${seqs[i]} (items: ${data[i - 1]?.externalId || "none"} to ${data[i].externalId})`,
          );
        }
        last = seqs[i];
      }
    }

    return ApiResponse.json({
      total: data.length,
      minSeq: seqs[0],
      maxSeq: seqs[seqs.length - 1],
      jumpsCount: missing.length,
      jumpsSample: missing.slice(0, 10),
      first100: data.slice(0, 100),
    });
  } catch (error: any) {
    return handleApiError(error, "src/app/api/v1/debug/sequences/route.ts#GET");
  }
}
