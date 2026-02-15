import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const relPath = body.path;

    if (!relPath)
      return NextResponse.json({ error: "Caminho ausente" }, { status: 400 });
    if (relPath.includes(".."))
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));
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
