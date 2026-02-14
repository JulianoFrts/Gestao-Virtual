---
name: 3d-map-anchoring
description: Corrige problemas de ancoragem e rotação de torres e cabos 3D no mapa Mapbox. Use quando elementos 3D estiverem flutuando, deslizando ou com ângulos incorretos.
---

# Skill: Ancoragem e Rotação 3D no Mapa

Esta skill ajuda a diagnosticar e corrigir problemas com elementos 3D (torres, cabos) no mapa Mapbox.

## Quando usar esta skill

- Torres 3D "flutuando" ou "deslizando" ao mover o mapa
- Cabos conectando em posições erradas
- Ângulos/rotações de torres não correspondendo aos dados
- Elementos 3D desaparecendo ao inclinar o mapa

## Arquivos principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/components/map/mapbox-3d-layer.tsx` | Renderização de modelos 3D e popups |
| `src/components/map/cable-config-modal.tsx` | Configuração de cabos e transformações |
| `src/hooks/useEnrichedPlacemarks.ts` | Enriquecimento de dados de placemarks |

## Árvore de decisão

### Problema: Torre no ângulo errado

1. Verificar a função `dmsToDecimal()` em `mapbox-3d-layer.tsx`
   - Aceita formatos: `74.38`, `74°22'59"E`, `66°25'41"NE`
   - Direções compostas (NE, SE, SW, NW) são informativas para azimutes > 45°

2. Verificar como o ângulo é aplicado ao modelo:
   - Campo `rotation` no transform do modelo GLB
   - Offset de rotação base do modelo (alguns modelos têm orientação diferente)

3. Verificar o campo de origem:
   - `extendedData.deflection` ou `extendedData.go_forward`
   - Override: `placemarkOverrides[id].angle`

### Problema: Torre flutuando

1. Verificar `altitude` no componente `<Marker>`:
   ```tsx
   <Marker
     longitude={lng}
     latitude={lat}
     anchor="bottom"
     style={{ pointerEvents: 'none' }}
   />
   ```

2. Verificar se o modelo tem offset Z correto no transform

3. Verificar elevação do terreno:
   - `extendedData.object_elevation`
   - Override: `placemarkOverrides[id].elevation`

### Problema: Cabo no lugar errado

1. Verificar função `getAnchorPoint()`:
   - **Prioridade 1**: Usar dados técnicos `fix_conductor` (para condutores) ou `fix_pararaio` (para para-raios/OPGW) se disponíveis.
   - **Prioridade 2**: Cálculo visual baseado na escala do modelo 3D (`baseHeight * scaleZ`).

2. Verificar conexões em `projectSpans`:
   - Origem e destino corretos
   - Alturas de fixação (`heightStart`, `heightEnd`)

## Histórico de Melhorias Técnico-Operacionais

### 📅 23 de Janeiro, 2026 - OTIMIZAÇÃO DE PÓRTICOS E SINCRONIZAÇÃO DE ELEVAÇÃO
**Contexto:** Implementação de layout side-by-side para pórticos TRIO e correção de "cabos flutuantes" em altitudes manuais.

#### 1. Sincronização de Elevação (Elevation vs Terrain)
- **Problema:** Ao alterar a Elevação no card, os cabos subiam mas a torre ficava presa ao chão, ou vice-versa.
- **Solução:** Implementado `elevationOffset` (Diferença entre altitude absoluta definida e o terreno real).
- **Regra:** O modelo 3D recebe `model-translation` vertical baseado nessa diferença, enquanto o Deck.gl (cabos) usa a altitude absoluta final. Isso garante que subam e desçam em total sincronia.

#### 2. Layout de Cabos em Pórticos (TRIO)
- **Problema:** Cabos ficavam em formato "V" (padrão torre metálica) em cima da viga horizontal do pórtico.
- **Solução:** Implementada distribuição lateral `side-by-side` na viga de 14m.
- **Regras de Espaçamento:**
    - **Para-raios/OPGW:** Fixados nas pontas externas da viga (~8.2m de distância do centro).
    - **Condutores:** Espaçamento horizontal expandido em 1.4x para preencher o vão entre pilares.
    - **Alinhamento:** Forçado `vRatio = 1.0` para porticos, garantindo que todos os cabos se apoiem exatamente no topo da viga.

### 📅 23 de Janeiro, 2026 (Part 2) - SINCRONISMO COM ÂNCORAS 3D (LAB) E ESTABILIZAÇÃO
**Contexto:** Implementação de vínculo entre cabos de projeto e pontos de âncora salvos no Lab 3D, além de correção de loop de atualização.

#### 1. Sincronismo com Âncoras do Modelo (Lab 3D)
- **Regra de Ouro:** O sistema agora prioriza pontos salvos no **3D Anchor Lab** sobre o cálculo paramétrico.
- **Mapeamento:** O vínculo é feito pelo nome da Fase ou Label (ex: "FASE A", "FASE B").
- **Transformação:** As coordenadas locais da âncora (x, y, z) são rotacionadas pelo `baseRot` da torre para encontrar a posição real no mundo Mapbox.

#### 2. Rotação de Cabos (Yaw do Modelo)
- **Problema:** Cabos ficavam "presos" ao centro da torre se o modelo fosse rotacionado manualmente (`rotZ`).
- **Solução:** A função `getAnchor` agora soma a rotação base da torre com o `rotZ` (Yaw) do transform do modelo.
- **Resultado:** Os cabos acompanham o giro das travessas da torre perfeitamente.

#### 3. Estabilização de Performance (Infinite Loop)
- **Problema:** Erro de "Maximum update depth exceeded" ao mover a câmera 3D.
- **Solução:** 
    - Uso de seletores individuais no `Viewer3D.tsx` (Zustand).
    - Implementação de threshold de movimento (0.05m) no `Scene.tsx`.
    - Bloqueio de atualizações recursivas via `isUpdatingRef`.

#### 4. Regra de Marcadores (UI)
- **Importante:** Os marcadores interativos (ícones das torres) devem permanecer sempre no **solo** (`anchor="bottom"` e `offset={[0,0]}`).
- **Integração:** Devem ser `draggable={false}` para evitar cliques fantasmas que arrastam o mapa.
- **Ocultação:** LineString (cabos 2D) devem ser ocultados quando o 3D estiver ativo em `mapbox-kmz-layer.tsx`.

### 📅 23 de Janeiro, 2026 (Part 3) - LAB 3D: IMPORTAÇÃO, NAVEGAÇÃO FPS E ALINHAMENTO
**Contexto:** Refinamento total do **3D Anchor Lab** para permitir importação de JSON, navegação estilo jogo (FPS) e correção definitiva de orientação visual.

#### 1. Importação e Contexto (Standalone vs Integrado)
- **Problema:** O Lab travava ao tentar salvar sem estar vinculado a uma obra ("Context Error") e não permitia carregar JSONs externos.
- **Solução:**
    - Adicionado botão **Importar JSON** no painel lateral.
    - Implementada lógica de **Fallback API**: Se `companyId`/`projectId` faltarem na URL, o sistema cria/usa automaticamente uma **"Empresa Padrão"** e **"Obra Padrão"** (ocultas nas listas gerais) para permitir o salvamento.
    - Ocultação: Filtros na API (`route.ts`) escondem esses registros padrão (`STD-001`) dos menus do usuário.

#### 2. Navegação FPS / Fly Mode
- **Funcionalidade:** Adicionado controle de câmera estilo jogo para facilitar inspeção de detalhes.
- **Controles:**
    - `WASD`: Move a câmera (Frente, Trás, Esquerda, Direita).
    - `Mouse Right-Click + Drag`: Gira a visão (Look).
    - `Scroll`: Zoom focado na posição do cursor (`dollyToCursor`).
    - `Ctrl + WASD`: Velocidade Turbo.

#### 3. Alinhamento Geométrica (Tower + Anchors)
- **Problema:** Torre ficava deitada (eixo Y horizontal) ou afundada no chão, e âncoras ficavam desalinhadas.
- **Solução Definitiva:**
    - **Unified Group:** Em `Scene.tsx`, Torre e Âncoras foram agrupadas em um único `<group>` com rotação `[Math.PI/2, 0, 0]`.
    - **Center:** O componente `Model` usa `<Center bottom>` para garantir que a base da torre (pivot) esteja no Z=0 (chão) do grupo.
    - Resultado: Torre em pé, no nível do solo, e âncoras giram junto com ela, mantendo a posição relativa correta.

#### 4. Precisão de Renderização no Mapa
- **Ajuste:** Ao usar uma âncora explícita (vinda do Lab), o sistema agora **ignora** qualquer `vOffset` ou `verticalOffset` paramétrico em `mapbox-3d-layer.tsx`.
- **Motivo:** Se o usuário marcou o ponto visualmente no Lab, aquele ponto é absoluto e exato. Somar offsets adicionais causava desalinhamento ("cabo flutuando").

### 📅 23 de Janeiro, 2026 (Part 4) - PADRONIZAÇÃO DE ESCALA E TEMPLATES
**Contexto:** Definição rígida de escala e posição para o modelo padrão da torre para garantir consistência com o sistema de templates.

#### 1. Configuração Imutável do Modelo Padrão
- **Escala:** `4.5` (Obrigatória para visualização correta).
- **Posição (Offset):** `[0, 4, 0]` (Obrigatória para alinhamento com âncoras).
- **Importante:** Se a altura ou escala do modelo 3D for alterada no código, **todas** as âncoras salvas no banco precisarão ser refeitas.
- **Arquivo:** `src/components/scene/Model.tsx`

#### 2. Sistema de Templates
- **Template Padrão:** As torres agora podem carregar um conjunto de âncoras padrão (`loadTemplateAnchors`).
- **Auto-Load:** Se uma torre não tiver âncoras específicas no projeto, o sistema tenta carregar o template padrão automaticamente.
- **Isolamento:** Âncoras carregadas via template recebem novos IDs únicos para o projeto atual, evitando alterações acidentais no template global.
