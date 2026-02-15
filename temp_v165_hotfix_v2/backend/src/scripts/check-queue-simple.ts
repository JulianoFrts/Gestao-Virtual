import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

// Load env manually
const envPath = path.join(process.cwd(), ".env.local");
const envDefaultPath = path.join(process.cwd(), ".env");
const content = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(envDefaultPath, "utf8");

content.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : "";
    if (value.startsWith('"') && value.endsWith('"'))
      value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
});

const prisma = new PrismaClient();

async function check() {
  try {
    const counts = await prisma.taskQueue.groupBy({
      by: ["status"],
      _count: { id: true },
    });
    console.log("Status counts:", JSON.stringify(counts, null, 2));

    const recent = await prisma.taskQueue.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    console.log(
      "Recent tasks:",
      JSON.stringify(
        recent.map((t: any) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          error: t.error,
          createdAt: t.createdAt,
        })),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("Error querying database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
