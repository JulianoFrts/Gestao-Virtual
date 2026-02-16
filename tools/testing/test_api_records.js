async function checkTimeRecords() {
  try {
    // 1. Login
    const loginRes = await fetch("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "juliano@gestaovirtual.com",
        password: "orion123",
      }),
    });

    if (!loginRes.ok) {
      console.log("Login failed:", loginRes.status, await loginRes.text());
      return;
    }

    const loginData = await loginRes.json();
    console.log(
      "Login response structure:",
      JSON.stringify(loginData, null, 2),
    );

    // Tenta diferentes formatos possíveis
    const token =
      loginData.access_token ||
      loginData.token ||
      (loginData.data && loginData.data.access_token) ||
      (loginData.session && loginData.session.access_token);

    if (!token) {
      console.log("No token found in response");
      return;
    }
    console.log("Login successful, token:", token.substring(0, 20) + "...");

    // 2. Fetch Records
    const response = await fetch(
      "http://localhost:3000/api/v1/time_records?limit=5",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log("Status:", response.status);

    if (response.ok) {
      const json = await response.json();
      const items = json.data.items || json.data || [];
      console.log("Found", items.length, "items");
      if (items.length > 0) {
        console.log("Sample Data:", JSON.stringify(items[0], null, 2));
      }
    } else {
      console.log("Error:", await response.text());
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

checkTimeRecords();
