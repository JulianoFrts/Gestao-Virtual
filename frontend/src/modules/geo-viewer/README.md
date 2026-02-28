# Módulo de Visualização de Progresso Físico 3D (Cockpit 3D)

Este módulo estende as funcionalidades do `GeoViewer` para permitir o monitoramento visual em tempo real das etapas de construção de Linhas de Transmissão diretamente no mapa 3D.

## Componentes Adicionados
- **`GeoViewerFilters.tsx`**: Painel lateral que permite isolar torres por status de atividade (Escavação, Concretagem, Montagem, etc).
- **`useProgressLayers.ts`**: Hook que gerencia as camadas do Deck.gl para renderização de elementos físicos no solo.
- **`metadataSync.ts`**: Utilitário de sincronização que vincula o módulo de **Produção** ao **Mapa 3D**.

## Lógica de Visualização 3D (Camadas)
| Atividade | Gatilho (Metadata) | Elemento 3D no Mapa |
| :--- | :--- | :--- |
| **Escavação** | `progress > 0%` | 4 cilindros escuros (simulando cavas) na base da torre. |
| **Concretagem** | `progress == 100%` | Bloco sólido cinza (concreto) na base da torre. |
| **Ensaio Arrancamento** | `Concluído` | Esfera lateral (Verde = Aprovado / Vermelho = Falha/Andamento). |
| **Transporte** | `Concluído` | Representação de materiais metálicos ao lado da torre. |
| **Pré-montagem** | `Concluído` | Estrutura da torre "deitada" no solo (escala reduzida). |
| **Montagem** | `Concluído` | Modelo 3D da torre completo e em pé (verticalizado). |

## Fluxo de Sincronização
1. O encarregado registra o avanço no `ActivityStatusModal`.
2. O sistema dispara `syncTowerMetadata`.
3. O metadado da torre na tabela `map_elements` é atualizado.
4. O `GeoViewer` reflete a mudança visual sem necessidade de recarregar a página.

---
*Documentação gerada automaticamente pela Gemini CLI - Gestão Virtual.*
