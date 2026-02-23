import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT external_id 
      FROM "public"."map_element_technical_data"
      ORDER BY "sequence" 
      LIMIT 1000 OFFSET 0;
    `);

    // Organize to summarize easily
    const data = results as any[];
    return NextResponse.json({
      total: data.length,
      inicial: data.length > 0 ? data[0].external_id : null,
      final: data.length > 0 ? data[data.length - 1].external_id : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
