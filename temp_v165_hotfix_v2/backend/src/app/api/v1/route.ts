import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Orion System API v1 is running",
    version: "1.0.0",
    endpoints: ["/health", "/User", "/projects", "/sites", "/teams"],
  });
}
