
import { prisma } from "./backend/src/lib/prisma/client";

async function diagnose() {
    console.log("--- PROJECT & COMPANY LIST ---");

    const projects = await prisma.project.findMany({
        select: { id: true, name: true, companyId: true }
    });
    console.log("Projects:", JSON.stringify(projects, null, 2));

    const companies = await prisma.company.findMany({
        select: { id: true, name: true }
    });
    console.log("Companies:", JSON.stringify(companies, null, 2));

    process.exit(0);
}

diagnose().catch(err => {
    console.error("Diagnostic failed:", err);
    process.exit(1);
});
