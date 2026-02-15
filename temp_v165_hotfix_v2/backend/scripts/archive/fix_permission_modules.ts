import { prisma } from "../src/lib/prisma/client";
import fs from "fs";
import path from "path";

async function main() {
  // Specifically targeting permission_modules as requested
  const files = ["permission_modules_rows.sql", "permission_matrix_rows.sql"];

  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${file}`);
      continue;
    }

    console.log(`\nProcessing ${file}...`);
    const content = fs.readFileSync(filePath, "utf-8");

    // Split by semicolon and filter empty lines
    const statements = content
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Found ${statements.length} statements.`);

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        process.stdout.write("✓");
      } catch (e: any) {
        if (e.code === "P2002") {
          // Unique constraint failed
          process.stdout.write("s"); // skipped
        } else {
          console.error(`\nError executing statement in ${file}:`);
          // console.error(statement.substring(0, 50) + '...');
          console.error(e.message);
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    console.log("\nDone.");
  });
