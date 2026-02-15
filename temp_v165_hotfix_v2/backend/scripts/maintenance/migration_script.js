import fs from "fs";
import path from "path";
import { promisify } from "util";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function walk(dir) {
  const files = await readdir(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = await stat(filepath);
    if (stats.isDirectory()) {
      await walk(filepath);
    } else if (file === "route.ts") {
      await processFile(filepath);
    }
  }
}

async function processFile(filepath) {
  let content = await readFile(filepath, "utf8");
  let original = content;

  // Check availability with improved regex (multiline, optional semicolon)
  if (
    !content.includes("interface RouteParams") ||
    !content.match(/params:\s*\{\s*id:\s*string\s*;?\s*\}/)
  ) {
    return;
  }

  console.log(`Processing ${filepath}`);

  // 1. Replace Interface
  const interfaceRegex = /params:\s*\{\s*id:\s*string\s*;?\s*\}\s*;?/g;
  content = content.replace(interfaceRegex, "params: Promise<{ id: string }>;");

  // 2. Inject await in handlers
  const handlerRegex =
    /(export\s+async\s+function\s+\w+\s*\([^)]+\{\s*params\s*\}\s*:\s*RouteParams\s*\)\s*\{)/g;

  if (content.includes("await params")) {
    console.log(`Skipping injection for ${filepath} (already migrated?)`);
  } else {
    content = content.replace(handlerRegex, (match) => {
      return `${match}\n    const { id } = await params;`;
    });
  }

  // 3. Replace params.id -> id
  if (content !== original) {
    // Simple replace is safe because we introduced 'id' via destructuring
    content = content.replace(/params\.id/g, "id");
    await writeFile(filepath, content);
    console.log(`Saved ${filepath}`);
  }
}

// Start from src/app/api/v1
walk("./src/app/api/v1").catch(console.error);
