async function testJobCreation() {
  const payload = {
    type: "EMPLOYEE_IMPORT",
    payload: {
      data: [
        {
          fullName: "Test Employee Async",
          email: "test.async@example.com",
          registrationNumber: "ASYNC001",
          companyId: "00000000-0000-0000-0000-000000000000", // System Company
          projectId: "any", // Will fail if validation is strict, but good for test
          siteId: "any",
          laborType: "MOD",
        },
      ],
    },
  };

  console.log("Testing job creation...");
  try {
    // Note: This needs a valid session/token if auth is strict
    // In local dev, we might need to bypass or use a real cookie
    console.log("Please manualy test via UI as it requires Auth Session.");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testJobCreation();
