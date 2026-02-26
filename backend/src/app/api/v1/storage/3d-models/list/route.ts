import { NextRequest } from "next/server";
import { ApiResponse, handleApiError } from "@/lib/utils/api/response";
import { requireAuth } from "@/lib/auth/session";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path") || "";

    if (relPath.includes("..")) {
      return ApiResponse.badRequest("Caminho inválido");
    }

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));

    if (!fs.existsSync(fullPath)) {
      return ApiResponse.json([]);
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
          last_modified: fStats.mtime.toISOString(),
          metadata: {
            size: fStats.size,
            mimetype: file.endsWith(".glb")
              ? "model/gltf-binary"
              : "model/gltf+json",
          },
        };
      });
      return ApiResponse.json(data);
    }
    return ApiResponse.badRequest("O caminho não é um diretório");
  } catch (err: unknown) {
    return handleApiError(err, "src/app/api/v1/storage/3d-models/list/route.ts#GET");
  }
}
