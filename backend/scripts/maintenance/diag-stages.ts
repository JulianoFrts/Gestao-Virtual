import dotenv from "dotenv";
dotenv.config();
import { prisma } from "./src/lib/prisma/client";

async function run() {
  try {
    console.log("Searching for WorkStages...");
    const stages = await (prisma as any).workStage.findMany({
      take: 10,
      include: {
        site: true
      }
    });
    
    console.log("Found stages sample:");
    console.log(JSON.stringify(stages, null, 2));
    
    if (stages.length > 0) {
      const stage = stages[0];
      console.log("Stage fields:", Object.keys(stage));
    }

    const projects = await prisma.project.findMany({ take: 3 });
    for (const p of projects) {
        const count = await (prisma as any).workStage.count({
            where: {
                site: { projectId: p.id }
            }
        });
        console.log(`Project ${p.name} has ${count} stages (via sites)`);
    }

  } catch (error) {
    console.error("Diagnosis error:", error);
  } finally {
    process.exit();
  }
}

run();
