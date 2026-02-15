import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  try {
    // Just check if the model has the field in dmmf or by trying to select it
    // We can inspect Prisma.dmmf if available, or just try a dummy query that would fail at runtime if invalid,
    // but here we want to check TYPING/Metadata mostly.

    // Actually, let's just print the DMMF to see if the field is there.
    const dmmf = await prisma._getDmmf();
    const userModel = dmmf.datamodel.models.find((m) => m.name === "User");
    const laborType = userModel.fields.find((f) => f.name === "laborType");

    if (laborType) {
      console.log("SUCCESS: laborType found in User model:", laborType);
    } else {
      console.error("FAILURE: laborType NOT found in User model");
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
