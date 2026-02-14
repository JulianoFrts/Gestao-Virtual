import { NextResponse } from "next/server";
import { ApiResponse, withErrorHandler } from "@/lib/utils/api/response";
import fs from "fs/promises";
import path from "path";

const STORAGE_PATH = path.join(process.cwd(), "storage");

export const POST = async (request: Request) => {
  return withErrorHandler(async () => {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return ApiResponse.badRequest("Arquivo não enviado");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const relativePath = path.join("photos", filename);
    const absolutePath = path.join(STORAGE_PATH, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    return ApiResponse.created({
      path: relativePath,
      url: `/api/v1/storage/photos?path=${relativePath}`,
    });
  });
};

export const GET = async (request: Request) => {
  return withErrorHandler(async () => {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return ApiResponse.badRequest("Caminho não fornecido");
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
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return ApiResponse.notFound("Foto não encontrada");
    }
  });
};
