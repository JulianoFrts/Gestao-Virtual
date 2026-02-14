import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";
import { getCurrentSession } from "@/lib/auth/session";

// GET: Fetch unit costs for a project
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 },
      );
    }

    // Multitenancy Check
    const { isUserAdmin } = await import("@/lib/auth/session");
    if (!isUserAdmin(session.user.role)) {
      const project = await (prisma as any).project.findFirst({
        where: { id: projectId, companyId: (session.user as any).companyId },
      });
      if (!project) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const costs = await (prisma as any).activityUnitCost.findMany({
      where: { projectId },
      include: { activity: true },
    });

    return NextResponse.json(costs);
  } catch (error) {
    console.error("Error fetching unit costs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST: Upsert unit costs
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, costs } = body;

    if (!projectId || !Array.isArray(costs)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Multitenancy Check
    const { isUserAdmin } = await import("@/lib/auth/session");
    if (!isUserAdmin(session.user.role)) {
      const project = await (prisma as any).project.findFirst({
        where: { id: projectId, companyId: (session.user as any).companyId },
      });
      if (!project) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const results = [];

    for (const cost of costs) {
      const result = await (prisma as any).activityUnitCost.upsert({
        where: {
          projectId_activityId: {
            projectId,
            activityId: cost.activityId,
          },
        },
        update: {
          unitPrice: cost.unitPrice,
          measureUnit: cost.measureUnit,
        },
        create: {
          projectId,
          activityId: cost.activityId,
          unitPrice: cost.unitPrice,
          measureUnit: cost.measureUnit || "UN",
        },
      });
      results.push(result);
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (error) {
    console.error("Error saving unit costs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
