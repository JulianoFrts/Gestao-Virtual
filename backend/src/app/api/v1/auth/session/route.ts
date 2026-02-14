import { NextResponse } from "next/server";
import { getCurrentSession, requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (session?.user) {
      // requireAuth sincroniza permissões com o banco
      await requireAuth();
    }

    return NextResponse.json(session || {});
  } catch (error) {
    return NextResponse.json({}, { status: 200 });
  }
}
