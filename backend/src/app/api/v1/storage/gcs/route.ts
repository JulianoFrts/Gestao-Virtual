import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/infrastructure/gcs/gcs.client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    const file = bucket.file(path);
    const [exists] = await file.exists();

    if (!exists) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Baixa o arquivo diretamente (buffer). 
    // Isso evita problemas com Signed URLs em ambientes de dev sem service account key JSON completo
    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();

    // Verify origin for security
    const origin = request.headers.get("origin") || "";
    const isAllowedOrigin = process.env.NODE_ENV === "development" || 
                           origin.includes(process.env.FRONTEND_URL || "localhost");

    if (!isAllowedOrigin && process.env.NODE_ENV === "production") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": metadata.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("GCS Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
