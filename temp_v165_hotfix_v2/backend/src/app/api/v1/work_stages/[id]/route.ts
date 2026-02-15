import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib";
import { getCurrentSession } from "@/lib/auth/session";

interface Params {
  params: Promise<{ id: string }>;
}

// GET: Fetch a single work stage
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const stage = await (prisma as any).workStage.findUnique({
      where: { id },
      include: {
        progress: {
          orderBy: { recordedAt: "desc" },
        },
        children: true,
      },
    });

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    return NextResponse.json(stage);
  } catch (error) {
    console.error("Error fetching work stage:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PUT: Update a work stage
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      name,
      description,
      weight,
      parentId,
      displayOrder,
      productionActivityId,
      metadata
    } = body;

    const stage = await (prisma as any).workStage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(weight !== undefined && { weight }),
        ...(parentId !== undefined && { parentId }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(productionActivityId !== undefined && { productionActivityId }),
        ...(metadata !== undefined && { metadata }),
      },
    });

    return NextResponse.json(stage);
  } catch (error) {
    console.error("Error updating work stage:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE: Delete a work stage
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await (prisma as any).workStage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting work stage:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
