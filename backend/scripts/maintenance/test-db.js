const { checkDatabaseConnection } = require("./src/lib/prisma/client");

async function test() {
  console.log("Testing DB connection...");
  const result = await checkDatabaseConnection();
  console.log("Result:", JSON.stringify(result, null, 2));
  process.exit(0);
}

test();
