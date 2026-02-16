import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const relPath = body.path;

    if (!relPath)
      return ApiResponse.badRequest("Caminho ausente");
    if (relPath.includes(".."))
      return ApiResponse.badRequest("Caminho inválido");

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return ApiResponse.json({ success: true });
    }
    return ApiResponse.notFound("Arquivo não encontrado");
  } catch (err: any) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/remove/route.ts#DELETE");
  }
}
