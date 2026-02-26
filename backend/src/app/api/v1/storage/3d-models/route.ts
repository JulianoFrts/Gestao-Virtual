import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

// Garantir que o diretório de storage exista
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path") || "";

    // Proteção contra caminhos maliciosos
    if (relPath.includes("..")) {
      return ApiResponse.badRequest("Caminho inválido");
    }

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));

    if (!fs.existsSync(fullPath)) {
      return ApiResponse.json({ data: [], error: null });
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(fullPath);
      const data = files.map((file) => {
        const fStats = fs.statSync(path.join(fullPath, file));
        return {
          name: file,
          id: file,
          updated_at: fStats.mtime.toISOString(),
          created_at: fStats.birthtime.toISOString(),
          last_modified: fStats.mtime.toISOString(),
          metadata: {
            size: fStats.size,
            mimetype: file.endsWith(".glb") ? "model/gltf-binary" : "model/gltf+json",
          },
        };
      });
      return ApiResponse.json({ data, error: null });
    } else {
      return ApiResponse.badRequest("O caminho não é um diretório");
    }
  } catch (err: unknown) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/route.ts#GET");
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const relPath = formData.get("path") as string;

    if (!file || !relPath) {
      return ApiResponse.badRequest("Arquivo ou caminho ausente");
    }

    // Proteção contra caminhos maliciosos
    if (relPath.includes("..")) {
      return ApiResponse.badRequest("Caminho inválido");
    }

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, buffer);

    return ApiResponse.json({ data: { path: relPath }, error: null });
  } catch (err: unknown) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/route.ts#POST");
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return ApiResponse.badRequest("Caminho ausente");
    }

    // Proteção contra caminhos maliciosos
    if (relPath.includes("..")) {
      return ApiResponse.badRequest("Caminho inválido");
    }

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return ApiResponse.json({ data: { success: true }, error: null });
    }

    return ApiResponse.notFound("Arquivo não encontrado");
  } catch (err: unknown) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/route.ts#DELETE");
  }
}
