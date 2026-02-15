import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "3d-models");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const relPath = formData.get("path") as string;

    if (!file || !relPath)
      return NextResponse.json({ error: "Dados ausentes" }, { status: 400 });
    if (relPath.includes(".."))
      return NextResponse.json({ error: "Caminho inválido" }, { status: 400 });

    const fullPath = path.join(STORAGE_ROOT, relPath.replace(/^models\//, ""));
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, buffer);

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host");
    const publicUrl = `${protocol}://${host}/api/v1/storage/3d-models/get?path=${relPath}`;

    return NextResponse.json({
      data: { path: relPath, publicUrl },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
