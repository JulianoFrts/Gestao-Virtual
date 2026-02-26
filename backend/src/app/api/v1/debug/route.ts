import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { HTTP_STATUS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();

    const results = await prisma.$queryRaw`
      SELECT external_id 
      FROM "public"."map_element_technical_data"
      ORDER BY "sequence" 
      LIMIT 1000 OFFSET 0
    `;

    // Organize to summarize easily
    const data = results as unknown[];
    return NextResponse.json({
      total: data.length,
      inicial: data.length > 0 ? data[0].external_id : null,
      final: data.length > 0 ? data[data.length - 1].external_id : null,
    });
  } catch (error: unknown) {
    const status = error.status || HTTP_STATUS.INTERNAL_ERROR;
    return NextResponse.json({ error: error.message }, { status });
  }
}
