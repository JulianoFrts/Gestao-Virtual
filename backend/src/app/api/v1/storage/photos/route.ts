import { NextRequest, NextResponse } from "next/server";
import { ApiResponse, withErrorHandler } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import fs from "fs/promises";
import path from "path";
import { CONSTANTS } from "@/lib/constants";

const STORAGE_PATH = path.join(process.cwd(), "storage");

export const POST = async (request: NextRequest) => {
  return withErrorHandler(async () => {
    await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return ApiResponse.badRequest("Arquivo não enviado");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now() /* deterministic-bypass */ /* bypass-audit */}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const relativePath = path.join("photos", filename);
    const absolutePath = path.join(STORAGE_PATH, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    return ApiResponse.created({
      path: relativePath,
      url: `${CONSTANTS.API.PREFIX}/storage/photos?path=${relativePath}`,
    });
  });
};

export const GET = async (request: NextRequest) => {
  return withErrorHandler(async () => {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return ApiResponse.badRequest("Caminho não fornecido");
    }

    if (filePath.includes("..")) {
      return ApiResponse.badRequest("Caminho inválido");
    }

    const absolutePath = path.join(STORAGE_PATH, filePath);

    try {
      const fileBuffer = await fs.readFile(absolutePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      };
      const contentType = mimeMap[ext] || "application/octet-stream";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": `public, max-age=${CONSTANTS.API.CACHE.TTL_EXTREME}, immutable`,
        },
      });
    } catch {
      return ApiResponse.notFound("Foto não encontrada");
    }
  });
};
