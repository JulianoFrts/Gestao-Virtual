import { prisma } from "../src/lib/prisma/client";
import fs from "fs";
import path from "path";

async function main() {
  const files = [
    "permission_levels_rows.sql",
    "permission_matrix_rows.sql",
    "permission_modules_rows.sql",
    "user_roles_rows.sql",
  ];

  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${file}`);
      continue;
    }

    console.log(`\nProcessing ${file}...`);
    const content = fs.readFileSync(filePath, "utf-8");

    // Split by semicolon, but simple split might break if semicolon is in data
    // Assuming these are simple dump files where each line might be a statement or statements are clear
    // We'll try splitting by ";\r\n" or ";\n" or just run the whole thing if it's one transaction block
    // BUT prisma executeRawUnsafe usually executes one statement.
    // If the file contains multiple INSERTs, we need to handle them.

    const statements = content.split(";").filter((s) => s.trim().length > 0);

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        process.stdout.write(".");
      } catch (e: any) {
        if (e.code === "P2002") {
          // Unique constraint failed
          process.stdout.write("s"); // skipped
        } else {
          console.error(`\nError executing statement in ${file}:`);
          console.error(statement.substring(0, 100) + "...");
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
