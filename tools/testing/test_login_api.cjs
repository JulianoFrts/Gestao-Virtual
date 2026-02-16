
const axios = require('axios');

async function testLogin() {
    console.log('🧪 Iniciando teste de login na API local...');

    const loginData = {
        email: 'juliano@gestaovirtual.com',
        password: 'orion123'
    };

    try {
        // Tenta conectar no backend local (assumindo que está rodando na porta 3000)
        const response = await axios.post('http://localhost:3000/api/v1/auth/login', loginData);

        console.log('✅ SUCESSO! Resposta da API:', response.status);
        console.log('Token recebido:', response.data.access_token ? 'Sim (JWT)' : 'Não');
        console.log('Dados do usuário:', response.data.user.name);

    } catch (error) {
        console.error('❌ ERRO no login:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Mensagem:', error.response.data.message || error.response.data.error);
        } else {
            console.error('Mensagem:', error.message);
        }
        console.log('\n👉 Verifique se o servidor backend está rodando (npm run dev -w backend)');
    }
}

testLogin();
