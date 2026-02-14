import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";
import { getCurrentSession } from "@/lib/auth/session";

// DELETE: Delete all stages for a site
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "Site ID required" }, { status: 400 });
    }

    await (prisma as any).workStage.deleteMany({
      where: { siteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting all work stages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
