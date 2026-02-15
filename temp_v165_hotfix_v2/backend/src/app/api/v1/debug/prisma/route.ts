import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
    try {
        // @ts-ignore - Propriedade especial de diagnóstico do v82
        const state = prisma.$state;

        // Teste de conexão real
        let connectionStatus = "offline";
        try {
            await prisma.$queryRaw`SELECT 1`;
            connectionStatus = "online";
        } catch (e: any) {
            connectionStatus = `error: ${e.message}`;
        }

        return NextResponse.json({
            version: "v82-diagnostic",
            connection: connectionStatus,
            prismaState: state,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
