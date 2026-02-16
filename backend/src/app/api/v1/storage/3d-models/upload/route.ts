import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const relPath = formData.get("path") as string;

    if (!file || !relPath)
      return ApiResponse.badRequest("Dados ausentes");
    if (relPath.includes(".."))
      return ApiResponse.badRequest("Caminho inválido");

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, buffer);

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const publicUrl = `${protocol}://${host}/api/v1/storage/3d-models/get?path=${relPath}`;

    return ApiResponse.json({
      path: relPath,
      publicUrl,
    });
  } catch (err: any) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/upload/route.ts#POST");
  }
}
