import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { HTTP_STATUS, API } from "@/lib/constants";
import { requireAuth } from "@/lib/auth/session";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  try {
    await requireAuth();
    const { path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Proteção contra caminhos maliciosos
  if (filePath.includes("..")) {
    return new NextResponse("Caminho inválido", { status: HTTP_STATUS.BAD_REQUEST });
  }

  const fullPath = path.join(STORAGE_ROOT, filePath);

  try {
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      return new NextResponse("Arquivo não encontrado", { status: HTTP_STATUS.NOT_FOUND });
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
        "Cache-Control": `public, max-age=${API.CACHE.TTL_EXTREME}, immutable`,
      },
    });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        return new NextResponse(message, { status: HTTP_STATUS.INTERNAL_ERROR });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de autenticação ou processamento";
      return new NextResponse(message, { status: HTTP_STATUS.UNAUTHORIZED });
    }
  }
  
