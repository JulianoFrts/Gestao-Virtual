---
name: security-audit
description: Auditoria de segurança e proteção de rotas da API ORION. Use para verificar autenticação, autorização e validação de tokens em endpoints.
---

# Skill: Auditoria de Segurança da API

Esta skill orienta a verificação e correção de problemas de segurança na API ORION.

## Quando usar esta skill

- Verificar se rotas estão protegidas por autenticação
- Diagnosticar erros 401 (Não Autorizado) ou 403 (Proibido)
- Implementar validação de token em novas rotas
- Auditar permissões por role (Super Admin, Admin, Ti Software)
- Verificar se todas as rotas estão sendo passadas via Signals conforme o FrontEnd Solicitado.


## Arquivos principais

| Sistema | Arquivo | Responsabilidade |
|---------|---------|------------------|
| Backend | `src/middleware.ts` | Validação global de autenticação |
| Backend | `src/lib/auth/requireAuth.ts` | Helper de proteção de rotas |
| Backend | `src/app/api/v1/auth/login/route.ts` | Geração de tokens JWT |
| Frontend | `src/integrations/orion/client.ts` | Cliente API com token |
| Frontend | `src/contexts/AuthContext.tsx` | Gerenciamento de sessão |

## Rotas públicas (SEM autenticação)

```
✅ /api/v1/ping
✅ /api/v1/health
✅ /api/v1/auth/login
✅ /api/v1/auth/[...nextauth]
✅ /api/v1/rpc/resolve_login_identifier
```

## Árvore de decisão

### Problema: Erro 401 - Unauthorized

2. Verificar se o token está sendo enviado:
   - Header `Authorization: Bearer <token>`
   - `OrionApiClient.loadToken()` está funcionando

3. Verificar se o token é válido (não expirado)

### Problema: Erro 403 - Forbidden

1. Token existe e é válido
2. Verificar role do usuário no token (decodificar JWT)
3. Comparar com permissão exigida pela rota

### Problema: Rota não protegida

1. Verificar se a rota usa `requireAuth()`:
   ```typescript
   export async function GET(request: NextRequest) {
       const auth = await requireAuth(request);
       if ('error' in auth) return auth.error;
       // ... resto da lógica
   }
   ```

2. Se não usa, adicionar proteção

## Checklist de segurança detalhado

### Backend
- [ ] Todas as rotas /api/v1/* passam pelo middleware
- [ ] Rotas sensíveis usam requireAuth()
- [ ] Tokens JWT têm expiração configurada e usam `httpOnly cookies`
- [ ] CORS configurado para domínios autorizados
- [ ] Rate limiting implementado
- [ ] **LGPD**: Dados sensíveis anonimizados em respostas de API
- [ ] **Data**: Validação de datas para evitar "Invalid Date"

### Frontend
- [ ] Token salvo após login bem-sucedido (preferencialmente via cookie)
- [ ] Token incluído em todas as requisições
- [ ] Interceptor de erro 401 redireciona para login
- [ ] Token renovado antes de expirar
- [ ] Logout limpa todos os dados de sessão
- [ ] **Privacidade**: Nomes completos substituídos por iniciais/IDs em dashboards públicos

## Rotina de Auditoria
Para uma execução completa, utilize o workflow:
`/.agent/workflows/security-audit-routine.md`

## Exemplo: Proteger uma rota e validar data

```typescript
// src/app/api/v1/minha-rota/route.ts
import { requireAuth } from '@/lib/auth/requireAuth';
import { safeDate } from '@/lib/utils/date';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request);
    if ('error' in auth) return auth.error;

    const queryDate = request.nextUrl.searchParams.get('date');
    const validatedDate = safeDate(queryDate);
    
    if (!validatedDate) {
        return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    // Lógica da rota...
    return NextResponse.json({ data: [] });
}
```

## Testes de segurança
 - Executar scripts de auditoria em `backend/scripts/security-check.ts` (se disponível)
 - Verificar logs de acesso em `backend/logs/access.log`
