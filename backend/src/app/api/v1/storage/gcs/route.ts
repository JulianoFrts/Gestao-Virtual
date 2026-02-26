import { NextRequest, NextResponse } from "next/server";
import { bucket } from "@/infrastructure/gcs/gcs.client";
import { HTTP_STATUS } from "@/lib/constants";

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (!path) {
      return new NextResponse("Missing path parameter", { status: HTTP_STATUS.BAD_REQUEST });
    }

    const file = bucket.file(path);
    const [exists] = await file.exists();

    if (!exists) {
      return new NextResponse("File not found", { status: HTTP_STATUS.NOT_FOUND });
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
      const frontendUrl = process.env.FRONTEND_URL || "https://orion.gestaovirtual.com";
      return NextResponse.redirect(`${frontendUrl.replace(/\/$/, '')}/dashboard`, HTTP_STATUS.FOUND);
    }

    const isImageRequest = secFetchDest === "image" || secFetchDest === "video" || secFetchDest === "audio";
    
    const allowedOriginDomain = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : "orion.gestaovirtual.com";
    const isAllowedReferer = referer.includes(allowedOriginDomain) || (process.env.NODE_ENV === "development" && referer.includes("localhost"));

    if (!isImageRequest && !isAllowedReferer) {
      if (process.env.NODE_ENV === "production") {
         return new NextResponse("Forbidden: Invalid request origin", { status: HTTP_STATUS.FORBIDDEN });
      }
    }

    const ONE_YEAR_IN_SECONDS = 31536000;
    return new NextResponse(buffer as unknown, {
      status: HTTP_STATUS.OK,
      headers: {
        "Content-Type": metadata.contentType || "image/jpeg",
        "Cache-Control": `public, max-age=${ONE_YEAR_IN_SECONDS}, immutable`,
      },
    });
  } catch (error: unknown) {
    console.error("GCS Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: HTTP_STATUS.INTERNAL_ERROR });
  }
}
