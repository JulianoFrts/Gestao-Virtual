import { prisma } from "../src/lib/prisma/client";
import fs from "fs";
import path from "path";

async function main() {
  const files = [
    "permission_levels_rows.sql",
    "permission_modules_rows.sql",
    "permission_matrix_rows.sql",
    "user_roles_rows.sql",
  ];

  console.log("Starting SQL execution...");

  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.log(`[SKIP] ${file} not found.`);
      continue;
    }

    console.log(`[EXEC] Processing ${file}...`);
    const content = fs.readFileSync(filePath, "utf-8");
    const statements = content
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Skip empty commands
        if (!statement) continue;

        await prisma.$executeRawUnsafe(statement);
        successCount++;
      } catch (e: any) {
        // Ignore unique constraint violations (P2002) as they mean data exists
        if (e.code === "P2002") {
          // console.log(`  -> Skipped duplicate in ${file}`);
        } else {
          console.error(`  -> Error in ${file}: ${e.message.split("\n")[0]}`);
          errorCount++;
        }
      }
    }
    console.log(
      `[DONE] ${file}: ${successCount} entries inserted, ${errorCount} errors.`,
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
