import { useCallback } from 'react'
import { Tower } from '../types/geo-viewer'

/**
 * Hook para analisar e escanear a estrutura interna de modelos 3D (.GLB)
 * Útil para identificar pontos de ancoragem nas mísulas.
 */
export function useModelScanner() {
  const scanModelNodes = useCallback((tower: Tower, modelInfo: any) => {
    if (!modelInfo) return

    console.log(`%c[3D SCANNER] Analisando Torre: ${tower.name} (Tipo: ${tower.type})`, 'color: #8b5cf6; font-weight: bold; font-size: 12px');
    
    // Árvore de nós do modelo GLB carregado pelo Deck.gl/Scenegraph
    const nodes: any[] = []
    
    // Função recursiva para percorrer o modelo
    const traverse = (node: any, depth = 0) => {
      if (!node) return
      
      const nodeName = node.name || 'Unnamed Node'
      const indent = '  '.repeat(depth)
      
      // Coletamos informações de posição local se existirem
      const position = node.position ? `[${node.position[0].toFixed(2)}, ${node.position[1].toFixed(2)}, ${node.position[2].toFixed(2)}]` : 'N/A'
      
      nodes.push({ name: nodeName, depth, position })
      
      // Se o nome parecer uma mísula ou ponto de ancoragem, destacamos no log
      const lowerName = nodeName.toLowerCase()
      const isAnchor = lowerName.includes('misula') || 
                       lowerName.includes('arm') || 
                       lowerName.includes('pont') || 
                       lowerName.includes('anchor') ||
                       lowerName.includes('extre')

      if (isAnchor) {
        console.log(`${indent}%c🎯 Encontrado provável ponto de ancoragem: ${nodeName} @ ${position}`, 'color: #10b981; font-weight: bold');
      } else {
        console.log(`${indent}├─ ${nodeName} (${position})`);
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, depth + 1))
      }
    }

    // O Deck.gl ScenegraphLayer guarda o modelo carregado em layer.state.scenegraph
    const scenegraph = modelInfo.layer?.state?.scenegraph || modelInfo.scenegraph

    if (scenegraph) {
      // Se for um modelo do luma.gl, ele pode ter uma estrutura de 'nodes' ou 'scenes'
      const rootNode = scenegraph.scenes ? scenegraph.scenes[0] : scenegraph
      traverse(rootNode)
    } else {
      console.warn('[3D SCANNER] O modelo ainda não está acessível no estado da camada.');
      console.log('Dica: Verifique se o modelo terminou de carregar visualmente antes de clicar.');
    }
    
    console.log(`%c[3D SCANNER] Scan concluído. ${nodes.length} nós analisados.`, 'color: #8b5cf6; font-style: italic');
  }, [])

  return { scanModelNodes }
}
