// ==============================================================================
// TESTE UNITÁRIO: 001.Security
// OBJETIVO: Validar o Middleware de Segurança, CORS e Proteção de Rotas API
// PADRÃO: Team OrioN - Qualidade Total (Comentários Exaustivos por Linha)
// ==============================================================================

// Importação dos utilitários do Jest para definição de suíte e testes
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
// Importação do middleware principal que será o alvo do teste unitário
import { middleware } from '@/middleware';
// Importação do NextResponse para permitir o mock de respostas do Next.js
import { NextResponse } from 'next/server';

// Mock global do NextServer para controlar o comportamento das respostas
jest.mock('next/server', () => ({
  // Simulando a classe NextResponse com métodos estáticos necessários
  NextResponse: {
    // Mock do método next() que indica prosseguimento da requisição
    next: jest.fn(() => ({ headers: { set: jest.fn() } })),
    // Mock do método json() para simular retornos de erro em formato JSON
    json: jest.fn((data: any, init: any) => ({ 
      // Retornando a estrutura básica que o middleware espera manipular
      ...data, 
      status: init?.status, 
      headers: { set: jest.fn() } 
    })),
  },
}));

// Início da suíte de testes dedicada à Camada de Segurança (Middleware)
describe('Security Middleware - Qualidade Total 001', () => {
  
  // Configuração inicial executada antes de cada caso de teste individual
  beforeEach(() => {
    // Reseta todos os estados dos mocks para evitar interferência entre testes
    jest.clearAllMocks();
    // Define a variável de ambiente NODE_ENV como production usando Object.defineProperty para evitar erro de read-only
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true
    });
  });

  // Teste 01: Verificar bloqueio de acesso quando a requisição não vem via Cloudflare ou Proxy Interno
  it('001.1 - deve bloquear acesso se não houver cabeçalho de segurança (Cloudflare/Proxy)', async () => {
    // Criação de um mock de requisição simulada sem os headers obrigatórios
    const mockRequest: any = {
      // Definindo a URL da requisição como uma rota de API protegida
      nextUrl: { pathname: '/api/v1/users' },
      // Simulando o objeto de cabeçalhos sem cf-ray ou x-internal-proxy-key
      headers: { get: jest.fn(() => null) },
    };

    // Execução da função de middleware com a requisição mockada
    const response: any = await middleware(mockRequest);

    // Verificação se o status retornado foi 403 (Forbidden/Acesso Restrito)
    expect(response.status).toBe(403);
    // Validação da mensagem de erro retornada ao solicitante
    expect(response.message).toBe('Acesso restrito.');
  });

  // Teste 02: Verificar permissão de acesso para rotas públicas mesmo sem autenticação
  it('001.2 - deve permitir acesso a rotas públicas (ex: /api/v1/health)', async () => {
    // Configuração de ambiente para modo remoto/produção simulado
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'remote',
      configurable: true
    });
    // Mock de requisição para um endpoint de saúde do sistema (público)
    const mockRequest: any = {
      // Definindo o caminho da rota como saudável/público
      nextUrl: { pathname: '/api/v1/health' },
      // Simulando presença de cabeçalho Cloudflare para passar no primeiro check
      headers: { 
        get: jest.fn((key: string) => {
          if (key === 'cf-ray') return 'mock-ray-id';
          return null;
        }) 
      },
    };

    // Chamada do middleware aguardando o processamento da rota pública
    await middleware(mockRequest);

    // Verificação se o middleware permitiu o prosseguimento chamando NextResponse.next()
    expect(NextResponse.next).toHaveBeenCalled();
  });

  // Teste 03: Verificar bloqueio de rotas privadas quando o token de autorização está ausente
  it('001.3 - deve retornar 401 para rotas privadas sem token Bearer', async () => {
    // Mock de requisição para rota de usuários (privada)
    const mockRequest: any = {
      // Alvo: lista de usuários (altamente sensível)
      nextUrl: { pathname: '/api/v1/users' },
      // Método GET padrão
      method: 'GET',
      // Headers com Cloudflare mas sem Authorization
      headers: { 
        get: jest.fn((key: string) => {
          if (key === 'cf-ray') return 'mock-ray';
          if (key === 'authorization') return null;
          return null;
        }) 
      },
    };

    // Execução do middleware para validar a falta de credenciais
    const response: any = await middleware(mockRequest);

    // Validação do status 401 (Unauthorized/Não autenticado)
    expect(response.status).toBe(401);
    // Confirmação da mensagem de erro específica de autenticação
    expect(response.message).toBe('Não autenticado');
  });
});
