// ==============================================================================
// TESTE UNITÁRIO: 002.AuthValidators
// OBJETIVO: Validar os esquemas de dados (Zod) para Autenticação e Registro
// PADRÃO: Team OrioN - Qualidade Total (Comentários Exaustivos por Linha)
// LOCAL: backend/src/app/api/v1/audit/quality-tests/units.tests/AUTH/
// ==============================================================================

// Importação das ferramentas de teste do Jest
import { describe, it, expect } from '@jest/globals';
// Importação dos esquemas de validação do módulo de autenticação
import { loginSchema, registerSchema } from '@/lib/utils/validators/schemas';

// Início do bloco de testes para Validadores de Autenticação
describe('Auth Validators - Qualidade Total 002', () => {
  
  // Sub-bloco: Validação do Schema de Login (Entrada de usuário)
  describe('loginSchema', () => {
    // Teste 02.1: Verificar se aceita um login válido com email e senha corretos
    it('002.1 - deve validar corretamente um login com email e senha válidos', () => {
      // Criação de um objeto de payload simulando entrada do frontend
      const payload = { email: 'admin@gestaovirtual.com', password: 'SenhaForte123' };
      // Execução da validação via safeParse do Zod
      const result = loginSchema.safeParse(payload);
      // Asserção de que a validação foi um sucesso
      expect(result.success).toBe(true);
    });

    // Teste 02.2: Verificar se rejeita quando o email não segue o formato padrão
    it('002.2 - deve rejeitar login com formato de email inválido', () => {
      // Payload com string aleatória no campo de email
      const payload = { email: 'email_invalido', password: 'SenhaForte123' };
      // Execução do parser para capturar o erro
      const result = loginSchema.safeParse(payload);
      // Asserção de falha na validação
      expect(result.success).toBe(false);
    });
  });

  // Sub-bloco: Validação do Schema de Registro (Novos Usuários)
  describe('registerSchema', () => {
    // Teste 02.3: Verificar se aceita um registro completo e válido
    it('002.3 - deve validar corretamente um registro completo', () => {
      // Objeto com todos os campos obrigatórios preenchidos corretamente
      const payload = {
        email: 'novo@teste.com',
        name: 'Usuário Teste',
        password: 'SenhaForte123',
        confirmPassword: 'SenhaForte123'
      };
      // Chamada do validador de registro
      const result = registerSchema.safeParse(payload);
      // Confirmação de que os dados atendem aos requisitos do esquema
      expect(result.success).toBe(true);
    });

    // Teste 02.4: Verificar se a regra de confirmação de senha (matching) está funcionando
    it('002.4 - deve falhar se password e confirmPassword forem diferentes', () => {
      // Payload com senhas propositalmente divergentes
      const payload = {
        email: 'novo@teste.com',
        name: 'Usuário Teste',
        password: 'SenhaForte123',
        confirmPassword: 'SenhaDiferente'
      };
      // Execução da validação que possui regra de refinamento (superRefine)
      const result = registerSchema.safeParse(payload);
      // Asserção de que a divergência de senhas gerou um erro de validação
      expect(result.success).toBe(false);
    });
  });
});
