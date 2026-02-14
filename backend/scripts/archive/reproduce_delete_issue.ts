import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function diagnoseDelete(userId: string) {
  console.log(`Diagnosing deletion for user ID: ${userId}`);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        sessions: true,
        auditLogs: true,
        createdDocuments: true,
        dailyReports: true,
        scheduledActivities: true,
        teamMemberships: true,
        supervisedTeams: true,
        timeRecordsCreated: true,
        timeRecords: true,
        stageProgressUpdates: true,
        receivedMessages: true,
        auditPerformed: true,
        routeChecksPerformed: true,
      },
    });

    if (!user) {
      console.log("User not found");
      return;
    }

    console.log("User found:", {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    // Check which relations have records
    const relations = [
      "accounts",
      "sessions",
      "auditLogs",
      "createdDocuments",
      "dailyReports",
      "scheduledActivities",
      "teamMemberships",
      "supervisedTeams",
      "timeRecordsCreated",
      "timeRecords",
      "stageProgressUpdates",
      "receivedMessages",
      "auditPerformed",
      "routeChecksPerformed",
    ];

    for (const rel of relations) {
      const data = (user as any)[rel];
      const count = Array.isArray(data) ? data.length : data ? 1 : 0;
      if (count > 0) {
        console.log(`- Relation [${rel}] has ${count} records.`);
      }
    }

    console.log(
      "\nAttempting dry-run delete (inside transaction that will rollback)...",
    );

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.delete({ where: { id: userId } });
        console.log("✅ Delete successful in transaction (would work!).");
        throw new Error("ROLLBACK"); // We don't want to actually delete yet
      });
    } catch (err: any) {
      if (err.message === "ROLLBACK") {
        console.log("Transaction rolled back successfully.");
      } else {
        console.error("❌ Delete failed with error:");
        console.error(err);

        if (err.code === "P2003") {
          console.error(
            "Foreign key constraint failed. This confirms a relation is blocking the delete.",
          );
          console.error("Field causing error:", err.meta?.field_name);
        }
      }
    }
  } catch (error) {
    console.error("Unexpected error during diagnosis:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get the first non-admin user to test
async function findTestUser() {
  const users = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
    },
    take: 1,
  });
  if (users.length > 0) {
    diagnoseDelete(users[0].id);
  } else {
    console.log("No non-admin users found to test.");
    await prisma.$disconnect();
  }
}

findTestUser();
