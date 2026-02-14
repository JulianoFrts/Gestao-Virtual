import "dotenv/config";
import { prisma } from "./src/lib/prisma/client";

async function checkData() {
  try {
    const userCount = await prisma.user.count();
    console.log(`User count: ${userCount}`);

    const firstUsers = await prisma.user.findMany({ take: 5 });
    console.log(
      "First 5 users IDs and Names:",
      firstUsers.map((u) => ({ id: u.id, name: u.name })),
    );

    const credentialCount = await prisma.authCredential.count();
    console.log(`AuthCredential count: ${credentialCount}`);

    const projectCount = await prisma.project.count();
    console.log(`Project count: ${projectCount}`);

    const companyCount = await prisma.company.count();
    console.log(`Company count: ${companyCount}`);

    const affiliationCount = await prisma.userAffiliation.count();
    console.log(`UserAffiliation count: ${affiliationCount}`);
  } catch (error) {
    console.error("Error checking data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
