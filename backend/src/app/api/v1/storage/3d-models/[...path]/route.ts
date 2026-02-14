import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Proteção contra caminhos maliciosos
  if (filePath.includes("..")) {
    return new NextResponse("Caminho inválido", { status: 400 });
  }

  const fullPath = path.join(STORAGE_ROOT, filePath);

  try {
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      return new NextResponse("Arquivo não encontrado", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".glb": "model/gltf-binary",
      ".gltf": "model/gltf+json",
      ".bin": "application/octet-stream",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
