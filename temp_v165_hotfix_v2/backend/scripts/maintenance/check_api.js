import http from "http";

function check(path) {
  http
    .get("http://localhost:3000" + path, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(
          `PATH: ${path} | STATUS: ${res.statusCode} | DATA: ${data.substring(0, 100)}`,
        );
      });
    })
    .on("error", (err) => {
      console.log(`PATH: ${path} | ERROR: ${err.message}`);
    });
}

check("/api/v1/ping");
check("/api/v1/health");
check("/api/v1/docs");
check("/health");
