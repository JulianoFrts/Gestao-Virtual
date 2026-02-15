import { openApiSpec } from "../lib/docs/openapi";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, "../../openapi.json");

try {
  fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));
  console.log(`✅ OpenAPI spec exported to ${outputPath}`);
} catch (error) {
  console.error("❌ Failed to export OpenAPI spec:", error);
  process.exit(1);
}
