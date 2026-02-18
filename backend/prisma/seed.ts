import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { seedAdmin } from "./seed-admin";
import { seedProduction } from "./seed-production";
import { seedPersonnel } from "./master-seed-personnel";
import { seedGlobalUsers } from "./seed-global";
import { fileURLToPath } from "url";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 STARTING UNIFIED SEEDING 🌱");
    console.log("===============================");

    try {
        // 0. Global Master Users (Juliano, Socio, etc)
        await seedGlobalUsers(prisma);

        // 1. Admin & Basic Users
        await seedAdmin(prisma);

        // 2. Production Config (Categories/Activities)
        await seedProduction(prisma);

        // 3. Personnel & Teams (Implementation Check: only if project exists or safe to run?)
        // This seed depends on "LA TESTE" project existing basically.
        // Assuming seed-map or similar runs before? Or maybe we should be careful.
        // For now, let's include it as it's idempotent.
        // Note: master-seed-personnel expects "LA TESTE" project initiated elsewhere (e.g. initial-data).
        // If it fails, we catch it.
        await seedPersonnel(prisma);

    } catch (e) {
        console.error("❌ Link Error in Unified Seed:", e);
        // Don't throw, let other seeds try? Or throw to stop CI.
        throw e;
    }

    console.log("===============================");
    console.log("✅ UNIFIED SEEDING COMPLETE ✅");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
