
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== PRISMA CLIENT DIAGNOSTIC ===");
  const keys = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
  console.log("Models found in Prisma Client:");
  console.log(JSON.stringify(keys, null, 2));
  
  if (keys.includes('taskQueue')) {
    console.log("✅ taskQueue model IS PRESENT");
  } else {
    console.log("❌ taskQueue model IS MISSING");
    // Check for "task_queue" just in case
    if (keys.includes('task_queue')) {
        console.log("💡 Found 'task_queue' instead (camelCase expected)");
    }
  }
}

main().finally(() => prisma.$disconnect());
