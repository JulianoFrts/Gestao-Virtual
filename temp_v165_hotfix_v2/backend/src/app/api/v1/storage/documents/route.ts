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
    const relativePath = path.join("documents", filename);
    const absolutePath = path.join(STORAGE_PATH, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    // Retorna o caminho relativo (o bucket/path que o front espera)
    return ApiResponse.created({
      path: relativePath,
      url: `/api/v1/storage/documents?path=${relativePath}`,
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
      const contentType = filePath.endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${path.basename(filePath)}"`,
        },
      });
    } catch {
      return ApiResponse.notFound("Arquivo não encontrado");
    }
  });
};
