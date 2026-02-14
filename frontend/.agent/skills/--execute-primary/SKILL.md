Quando se candidatar
Consulte estas diretrizes quando:

- Escrever novos componentes React ou páginas Next.js
- Implementação da coleta de dados (lado do cliente ou do servidor)
- Analisando o código em busca de problemas de desempenho.
- Refatoração de código React/Next.js existente
- Otimizando o tamanho do pacote ou os tempos de carregamento.

## Categorias de regras por prioridade

| Prioridade | Categoria | Impacto | Prefixo |
|------------|-------------|---------|---------|
| 1 | Eliminando Cachoeiras | CRÍTICO | async- |
| 2 | Otimização do tamanho do pacote | CRÍTICO | bundle- |
| 3 | Desempenho do lado do servidor | ALTO | server- |
| 4 | Obtenção de dados no lado do cliente | MÉDIO-ALTO | client- |
| 5 | Otimização de renderização | MÉDIO | rerender- |
| 6 | Desempenho de renderização | MÉDIO | rendering- |
| 7 | Desempenho do JavaScript | BAIXO-MÉDIO | js- |
| 8 | Padrões avançados | BAIXO | advanced- |



**Referência rápida**

**1. Eliminar Cascatas (CRÍTICO)**
async-defer-await- Mova o await para os branches onde ele é realmente usado.
async-parallel- Use Promise.all() para operações independentes
async-dependencies- Use better-all para dependências parciais
async-api-routes- Inicie as promessas cedo e aguarde até o final nas rotas da API.
async-suspense-boundaries- Use o Suspense para transmitir conteúdo

**2. Otimização do tamanho do pacote (CRÍTICO)**
bundle-barrel-imports- Importe diretamente, evite arquivos de barril
bundle-dynamic-imports- Use next/dynamic para componentes pesados
bundle-defer-third-party- Carregar análises/registros após a hidratação
bundle-conditional- Carregar módulos somente quando o recurso estiver ativado
bundle-preload- Pré-carregamento ao passar o cursor/focalizar para velocidade percebida

**3. Desempenho do lado do servidor (ALTO)**
server-auth-actions- Autenticar ações do servidor, como rotas de API
server-cache-react- Use React.cache() para desduplicação por requisição
server-cache-lru- Use o cache LRU para o armazenamento em cache entre solicitações.
server-dedup-props- Evite a serialização duplicada nas propriedades RSC
server-serialization- Minimizar a quantidade de dados passados ​​para os componentes do cliente.
server-parallel-fetching- Reestruturar componentes para paralelizar as buscas
server-after-nonblocking- Use after() para operações não bloqueantes

**4. Obtenção de dados no lado do cliente (MÉDIO-ALTO)**
client-swr-dedup- Use o SWR para desduplicação automática de solicitações
client-event-listeners- Remover ouvintes de eventos globais duplicados
client-passive-event-listeners- Use ouvintes passivos para rolagem
client-localstorage-schema- Versionar e minimizar dados do localStorage

**5. Otimização de renderização (MÉDIO)**
rerender-defer-reads- Não se inscreva no estado usado apenas em callbacks.
rerender-memo- Extrair tarefas dispendiosas em componentes memorizados
rerender-memo-with-default-value- Levantar adereços não primitivos padrão
rerender-dependencies- Use dependências primitivas em efeitos
rerender-derived-state- Inscreva-se em valores booleanos derivados, não em valores brutos.
rerender-derived-state-no-effect- Derivar o estado durante a renderização, não os efeitos.
rerender-functional-setstate- Use setState funcional para callbacks estáveis
rerender-lazy-state-init- Passe a função para useState para valores dispendiosos
rerender-simple-expression-in-memo- Evite usar memorandos para primitivas simples.
rerender-move-effect-to-event- Coloque a lógica de interação nos manipuladores de eventos.
rerender-transitions- Use startTransition para atualizações não urgentes
rerender-use-ref-transient-values- Use referências para valores frequentes transitórios


**6. Desempenho de renderização (MÉDIO)**
rendering-animate-svg-wrapper- Animar o elemento div que o envolve, não o elemento SVG.
rendering-content-visibility- Use a visibilidade de conteúdo para listas longas
rendering-hoist-jsx- Extrair JSX estático de componentes externos
rendering-svg-precision- Reduzir a precisão das coordenadas SVG
rendering-hydration-no-flicker- Use script embutido para dados exclusivos do cliente.
rendering-hydration-suppress-warning- Suprimir incompatibilidades esperadas
rendering-activity- Utilize o componente Activity para mostrar/ocultar
rendering-conditional-render- Use o operador ternário, não o operador &&, para condicionais.
rendering-usetransition-loading- Prefira usar `useTransition` para o estado de carregamento.

**7. Desempenho do JavaScript (BAIXO-MÉDIO)**
js-batch-dom-css- Agrupe as alterações de CSS por meio de classes ou cssText.
js-index-maps- Criar mapa para pesquisas repetidas
js-cache-property-access- Armazenar em cache as propriedades do objeto em loops
js-cache-function-results- A função de cache resulta em um mapa em nível de módulo.
js-cache-storage- Armazenar em cache as leituras do localStorage/sessionStorage
js-combine-iterations- Combinar vários filtros/mapas em um único loop
js-length-check-first- Verifique o comprimento da matriz antes de realizar comparações dispendiosas.
js-early-exit- Retornar antecipadamente das funções
js-hoist-regexp- Içar a criação de expressões regulares para fora dos loops
js-min-max-loop- Use um loop para mínimo/máximo em vez de ordenar.
js-set-map-lookups- Use Set/Map para pesquisas O(1)
js-tosorted-immutable- Use toSorted() para imutabilidade


**8. Padrões Avançados (BAIXO)**
advanced-event-handler-refs- Armazene os manipuladores de eventos em referências.
advanced-init-once- Inicializar o aplicativo uma vez por carregamento do aplicativo
advanced-use-latest- useLatest para referências de retorno de chamada estáveis
