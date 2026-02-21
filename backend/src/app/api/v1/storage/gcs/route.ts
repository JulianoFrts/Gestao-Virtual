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

    // SECURITY CHECK: Prevent direct access via URL bar
    const referer = request.headers.get("referer") || "";
    const secFetchDest = request.headers.get("sec-fetch-dest") || "";

    // 1. Block direct navigation (referer is empty AND sec-fetch-dest is document)
    // When a user types the URL in the browser, sec-fetch-dest is usually "document" and referer is empty
    if (!referer && secFetchDest === "document") {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return NextResponse.redirect(`${frontendUrl.replace(/\/$/, '')}/dashboard`, 302);
    }

    // 2. Allow if it's explicitly loaded as an image/media from the frontend
    const isImageRequest = secFetchDest === "image" || secFetchDest === "video" || secFetchDest === "audio";
    
    // 3. Validate origin/referer belongs to our app
    const allowedOriginDomain = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : "localhost";
    const isAllowedReferer = referer.includes(allowedOriginDomain) || (process.env.NODE_ENV === "development" && referer.includes("localhost"));

    if (!isImageRequest && !isAllowedReferer) {
      if (process.env.NODE_ENV === "production") {
         return new NextResponse("Forbidden: Invalid request origin", { status: 403 });
      }
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
