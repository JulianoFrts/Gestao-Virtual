---
description: Como utilizar o Lab 3D para definir âncoras, importar JSON e aplicar no mapa
---

# Uso do Lab 3D de Ancoragem (3D Anchor Lab)

Este workflow descreve como usar as novas funcionalidades do Lab 3D para definir pontos exatos de fixação de cabos nas torres.

## 1. Acesso ao Lab
Existem duas formas de acessar:
- **Via Obra:** Dentro do mapa, clique com botão direito em uma torre 3D -> "Configurar Âncoras 3D".
- **Modo Standalone:** Acesse `/lab/3d`. Use se quiser apenas visualizar ou corrigir um JSON sem vínculo imediato.

## 2. Controles de Câmera (Novo: FPS Mode)
A navegação foi atualizada para estilo de jogo (FPS) para facilitar a inspeção rápida:

- **WASD**: Move a câmera (`W` Frente, `S` Trás, `A` Esquerda, `D` Direita).
- **Botão Direito + Arrastar**: Gira a câmera (Olhar ao redor).
- **Scroll do Mouse**: Zoom focado exatamente onde o mouse está apontando (`Zoom to Cursor`).
- **Ctrl + WASD**: Aumenta a velocidade de movimento (Turbo).

## 3. Importação e Exportação
Se você já tem coordenadas salvas ou quer testar um modelo:
1. Clique no ícone de **Upload** na barra lateral direita.
2. Selecione seu arquivo `.json` de âncoras.
3. As âncoras aparecerão imediatamente no modelo como esferas coloridas.

## 4. Salvando e Aplicando
Ao finalizar a configuração:
1. Clique em **"Aplicar Configuração"**.
2. Se estiver em uma obra, salva na obra.
3. Se estiver no modo Standalone, o sistema usa automaticamente a **"Obra Padrão"** para garantir que os dados sejam salvos sem erro.
4. Volte ao mapa 3D: Os cabos agora se conectarão **exatamente** nos pontos marcados (esferas), ignorando qualquer cálculo genérico antigo.

## 5. Sistema de Templates
Agora é possível carregar configurações padronizadas para torres:
- **Usar Padrão**: Se a torre não tiver âncoras configuradas, este botão carrega o template padrão da empresa para este tipo de torre.
- **Salvar como Padrão**: (Cuidado) Atualiza o template padrão que será usado como base para todas as novas torres deste tipo.
- **Auto-Load**: Ao abrir uma torre sem configuração específica, o sistema tentará carregar o template automaticamente.

## 6. Persistência de Sessão
O sistema agora se "lembra" da última obra, empresa e torre que você estava editando.
- Se você atualizar a página ou fechar e abrir novamente, ele restaurará automaticamente o contexto de trabalho anterior, evitando a necessidade de selecionar tudo novamente.
