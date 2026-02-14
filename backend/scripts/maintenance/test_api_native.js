import http from "http";

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/v1/users",
  method: "GET",
  headers: {
    Accept: "application/json",
  },
};

console.log("Requesting /api/v1/users...");

const req = http.request(options, (res) => {
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", JSON.stringify(res.headers));

  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Response body:", data.substring(0, 500));
  });
});

req.on("error", (e) => {
  console.error("Problem with request:", e.message);
});

req.end();
