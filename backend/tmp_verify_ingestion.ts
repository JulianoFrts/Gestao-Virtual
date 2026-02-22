import { DataIngestionService } from "./src/modules/data-ingestion/services/DataIngestionService";

async function test() {
  const service = new DataIngestionService();

  console.log("Testing Template Generation...");
  try {
    const towerTemplate = service.getTemplate("tower");
    console.log("Tower Template:", towerTemplate);
    const employeeTemplate = service.getTemplate("employee");
    console.log("Employee Template:", employeeTemplate);
  } catch (err) {
    console.error("Template Error:", err);
  }

  console.log("\nTesting File Detection...");
  // @ts-ignore
  console.log("Detect CSV:", service["detectFileType"]("test.csv", "text/csv"));
  // @ts-ignore
  console.log(
    "Detect Excel:",
    service["detectFileType"](
      "test.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ),
  );
}

test().catch(console.error);
