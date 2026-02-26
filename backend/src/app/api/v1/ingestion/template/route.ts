import { NextResponse } from "next/server";
import { DataIngestionService } from "@/modules/data-ingestion/services/DataIngestionService";
import { HTTP_STATUS } from "@/lib/constants";

import { requireAuth } from "@/lib/auth/session";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json(
        { error: "Template type is required" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const service = new DataIngestionService();
    const csvContent = service.getTemplate(type);

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="template_${type}.csv"`,
      },
    });
  } catch (error: unknown) {
    console.error("Template export error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}
