import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

console.log("DATABASE_URL from env:", process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function check() {
  console.log("--- DB STATS ---");
  try {
    const count = await prisma.user.count();
    console.log("Total Users:", count);
  } catch (err) {
    console.error("Error:", err);
  }
}

check().finally(() => prisma.$disconnect());
