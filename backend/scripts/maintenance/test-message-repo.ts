import { prisma } from "./src/lib/prisma/client";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  try {
    console.log("Testing systemMessage.findMany...");
    const messages = await prisma.systemMessage.findMany({
      take: 1,
      include: {
        recipientUser: {
          select: {
            id: true,
            name: true,
            authCredential: { select: { email: true } },
          },
        },
      },
    });
    console.log("Success!", JSON.stringify(messages, null, 2));
  } catch (error: any) {
    console.error("FAILED:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
