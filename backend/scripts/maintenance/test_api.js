import fetch from "node-fetch";

async function test() {
  console.log("Testing /api/v1/users...");
  try {
    const res = await fetch("/api/v1/users", {
      timeout: 5000,
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Success:", json.success);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

test();
