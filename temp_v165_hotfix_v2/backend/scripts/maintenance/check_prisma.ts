import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    // @ts-expect-error - _getDmmf is internal but useful here
    const dmmf = await prisma._getDmmf();
    const userModel = dmmf.datamodel.models.find((m: any) => m.name === "User");
    const laborType = userModel.fields.find((f: any) => f.name === "laborType");

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
