import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

// Garantir que o diretório de storage exista
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path") || "";

  // Proteção contra caminhos maliciosos
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
          created_at: fStats.birthtime.toISOString(),
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
    } else {
      return NextResponse.json(
        { error: "O caminho não é um diretório" },
        { status: 400 },
      );
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const relPath = formData.get("path") as string;

    if (!file || !relPath) {
      return NextResponse.json(
        { error: "Arquivo ou caminho ausente" },
        { status: 400 },
      );
    }

    // Proteção contra caminhos maliciosos
    if (relPath.includes("..")) {
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
    }

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, buffer);

    return NextResponse.json({ data: { path: relPath }, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path");

  if (!relPath) {
    return NextResponse.json({ error: "Caminho ausente" }, { status: 400 });
  }

  // Proteção contra caminhos maliciosos
  if (relPath.includes("..")) {
    return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });
  }

  const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return NextResponse.json({ data: { success: true }, error: null });
    }
    return NextResponse.json(
      { error: "Arquivo não encontrado" },
      { status: 404 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
