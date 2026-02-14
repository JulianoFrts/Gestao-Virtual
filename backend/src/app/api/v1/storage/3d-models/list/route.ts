import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";

  if (relPath.includes("..")) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));

  try {
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ data: [], error: null });
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
      return NextResponse.json({ data, error: null });
    }
    return NextResponse.json(
      { error: "O caminho não é um diretório" },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
