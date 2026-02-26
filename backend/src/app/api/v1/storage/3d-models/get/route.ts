import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ApiResponse } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import { HTTP_STATUS } from "@/lib/constants";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath || relPath.includes("..")) {
      return ApiResponse.badRequest("Caminho inválido");
    }

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));

    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      return ApiResponse.notFound("Arquivo não encontrado");
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
  } catch (err: unknown) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/get/route.ts#GET");
  }
}
