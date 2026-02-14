const axios = require("axios");

async function testCreateCompany() {
  try {
    console.log("Tentando logar para obter token...");
    const loginRes = await axios.post(
      "api/v1/auth/login",
      {
        email: "[EMAIL_ADDRESS]",
        password: "[PASSWORD]", // assumindo senha padrao de teste
      },
    );  

    const token = loginRes.data.access_token;
    console.log("Token obtido:", token.substring(0, 20) + "...");

    console.log("Cadastrando empresa...");
    const res = await axios.post(
      "/api/v1/companies",
      {
        name: "Empresa Teste " + Date.now(),
        taxId: "123456780001" + Math.floor(Math.random() * 99),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    console.log("SUCESSO:", res.data);
  } catch (err) {
    console.error("ERRO:", err.response?.data || err.message);
  }
}

testCreateCompany();
