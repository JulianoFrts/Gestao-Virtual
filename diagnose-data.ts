
import { prisma } from "./backend/src/lib/prisma/client";

async function diagnose() {
    console.log("--- NEARING DATA CHECK ---");

    const unknownElements = await prisma.mapElementTechnicalData.findMany({
        where: { externalId: "UNKNOWN" }
    });
    console.log(`Elements with externalId "UNKNOWN": ${unknownElements.length}`);

    const allElements = await prisma.mapElementTechnicalData.findMany({
        select: { projectId: true, externalId: true }
    });

    const duplicates = [];
    const seen = new Set();
    for (const el of allElements) {
        const key = `${el.projectId}:${el.externalId}`;
        if (seen.has(key)) {
            duplicates.push(key);
        }
        seen.add(key);
    }

    console.log(`Duplicate projectId:externalId pairs: ${duplicates.length}`);
    if (duplicates.length > 0) {
        console.log("Samples:", duplicates.slice(0, 5));
    }

    process.exit(0);
}

diagnose().catch(err => {
    console.error("Diagnostic failed:", err);
    process.exit(1);
});
