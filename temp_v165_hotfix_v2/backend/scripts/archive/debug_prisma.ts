import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();
const prisma = new PrismaClient();
console.log(
  "Prisma Models:",
  Object.keys(prisma).filter((k) => !k.startsWith("$") && !k.startsWith("_")),
);
prisma.$disconnect();
