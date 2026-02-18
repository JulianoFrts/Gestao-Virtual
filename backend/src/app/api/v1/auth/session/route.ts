import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();
    return NextResponse.json(session || {});
  } catch (error) {
    const { HTTP_STATUS } = await import("@/lib/constants");
    return NextResponse.json({}, { status: HTTP_STATUS.OK });
  }
}
