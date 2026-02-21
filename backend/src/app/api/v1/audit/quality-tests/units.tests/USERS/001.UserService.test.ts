// ==============================================================================
// TESTE UNITÁRIO: 001.UserService
// OBJETIVO: Validar o serviço de domínio de Usuários e o Mapeamento de Permissões
// PADRÃO: Team OrioN - Qualidade Total (Comentários Exaustivos por Linha)
// LOCAL: backend/src/app/api/v1/audit/quality-tests/units.tests/USERS/
// ==============================================================================

// Importação das ferramentas de teste do Jest
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
// Importação do serviço alvo do teste (Camada de Aplicação)
import { UserService } from '@/modules/users/application/user.service';

// Início do bloco de testes para o UserService
describe('UserService - Qualidade Total 001', () => {
  // Definição da variável do repositório mock
  let mockRepo: any;
  // Definição da variável da instância do serviço
  let service: UserService;

  // Configuração executada antes de cada teste unitário
  beforeEach(() => {
    // Criação de um objeto mockado para simular o PrismaUserRepository
    mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      getPermissions: jest.fn(),
    };
    // Inicialização do serviço injetando o repositório mockado (DIP - Inversão de Dependência)
    service = new UserService(mockRepo);
  });

  // Teste 01: Verificar se o serviço busca corretamente as permissões de um perfil
  it('001.1 - deve retornar o mapa de permissões corretamente com base na role', async () => {
    // Definição de uma role de teste
    const role = 'USER';
    // Definição do retorno esperado do repositório mock
    const mockPermissions = { 'daily_report.create': true, 'dashboard.view': true };
    
    // Configuração do mock para retornar as permissões simuladas
    mockRepo.getPermissions.mockResolvedValue(mockPermissions);

    // Chamada do método do serviço para obter o mapa de permissões
    const result = await service.getPermissionsMap(role, 'user-id-test');

    // Asserção de que o repositório foi chamado com os parâmetros corretos
    expect(mockRepo.getPermissions).toHaveBeenCalledWith(role);
    // Validação de que o resultado do serviço coincide com o retorno do repositório
    expect(result).toEqual(mockPermissions);
  });

  // Teste 02: Validar o tratamento de erros caso o repositório falhe
  it('001.2 - deve lançar erro caso o repositório falhe em buscar permissões', async () => {
    // Configura o mock para disparar uma exceção
    mockRepo.getPermissions.mockRejectedValue(new Error('DB_ERROR'));

    // Execução e asserção simultânea esperando que a promessa seja rejeitada
    await expect(service.getPermissionsMap('ADMIN', '1')).rejects.toThrow('DB_ERROR');
  });
});
