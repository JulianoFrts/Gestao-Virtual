import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";
import { getCurrentSession } from "@/lib/auth/session";

// PUT: Reorder stages
export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { updates } = body;
    // updates: { id: string, displayOrder: number }[]

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 },
      );
    }

    // Update each stage's displayOrder
    for (const update of updates) {
      await (prisma as any).workStage.update({
        where: { id: update.id },
        data: { displayOrder: update.displayOrder },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering work stages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
