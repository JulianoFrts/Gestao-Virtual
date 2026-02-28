import { useState, useCallback } from 'react'

export interface BoundingBox {
  min: [number, number, number]
  max: [number, number, number]
  center: [number, number, number]
  size: [number, number, number]
}

export function useBoundingBox() {
  const [activeBox, setActiveBox] = useState<BoundingBox | null>(null)

  const calculateBox = useCallback((modelInfo: any) => {
    const node = modelInfo.layer?.state?.scenegraph || modelInfo.scenegraph
    
    if (!node) {
      setActiveBox(null)
      return
    }

    const rootNode = node.scenes ? node.scenes[0] : node
    
    let min: [number, number, number] = [Infinity, Infinity, Infinity]
    let max: [number, number, number] = [-Infinity, -Infinity, -Infinity]

    const traverseForBounds = (n: any) => {
      // Tenta extrair limites se o nó tiver geometria ou posição
      if (n.position) {
        min[0] = Math.min(min[0], n.position[0])
        min[1] = Math.min(min[1], n.position[1])
        min[2] = Math.min(min[2], n.position[2])
        
        max[0] = Math.max(max[0], n.position[0])
        max[1] = Math.max(max[1], n.position[1])
        max[2] = Math.max(max[2], n.position[2])
      }
      
      // Se o Deck.gl já calculou os bounds para este nó (v9+)
      if (n.model?.getBounds) {
        const bounds = n.model.getBounds();
        if (bounds) {
          min[0] = Math.min(min[0], bounds[0][0]);
          max[0] = Math.max(max[0], bounds[1][0]);
        }
      }

      if (n.children) n.children.forEach(traverseForBounds)
    }

    traverseForBounds(rootNode)

    // Se as coordenadas são válidas
    if (min[0] !== Infinity) {
      const box: BoundingBox = {
        min,
        max,
        center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
        size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
      }
      setActiveBox(box)
      console.log('%c[3D BOX] Dimensões do Modelo:', 'color: #f59e0b; font-weight: bold', box.size);
    }
  }, [])

  return { activeBox, calculateBox, setActiveBox }
}
