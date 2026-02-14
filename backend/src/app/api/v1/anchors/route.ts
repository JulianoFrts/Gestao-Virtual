import { NextResponse, NextRequest } from "next/server";
import { handleApiError } from "@/lib/utils/api/response";
import { AnchorService } from "@/modules/map-elements/application/anchor.service";
import { PrismaAnchorRepository } from "@/modules/map-elements/infrastructure/prisma-anchor.repository";

// DI
const anchorService = new AnchorService(new PrismaAnchorRepository());

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const companyId = searchParams.get("companyId");
  const projectId = searchParams.get("projectId");
  const towerId = searchParams.get("towerId");
  const modelUrl = searchParams.get("modelUrl");

  try {
    const result = await anchorService.getAnchors({
      companyId,
      projectId,
      towerId,
      modelUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/anchors/route.ts#GET");
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await anchorService.saveAnchors(body);

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/anchors/route.ts#POST");
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const companyId = searchParams.get("companyId");
  const projectId = searchParams.get("projectId");
  const towerId = searchParams.get("towerId");

  try {
    await anchorService.deleteAnchors({
      id,
      companyId,
      projectId,
      towerId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "src/app/api/v1/anchors/route.ts#DELETE");
  }
}
