import { useMemo } from 'react'
import { ColumnLayer, ScatterplotLayer } from '@deck.gl/layers'
import { ScenegraphLayer } from '@deck.gl/mesh-layers'
import { Tower } from '../types/geo-viewer'

interface useProgressLayersProps {
  towers: Tower[]
  towerTypeConfigs: any[]
  scale: number
  towerElevation: number
  individualAltitudes: Record<string, number>
  visible: boolean
}

export const useProgressLayers = ({
  towers,
  towerTypeConfigs,
  scale,
  towerElevation,
  individualAltitudes,
  visible
}: useProgressLayersProps) => {
  const progressLayers = useMemo(() => {
    if (!visible || towers.length === 0) return []

    const layers: any[] = []
    const scaleFactor = scale / 50

    // 1. Unificar Elementos de Solo (Escavação e Concreto) em uma única Camada Eficiente
    // Filtramos torres que tenham QUALQUER um desses progressos
    const groundProgressData = towers.flatMap(t => {
      const statuses = t.activityStatuses || []
      const items = []
      const alt = individualAltitudes[t.name] ?? t.coordinates.altitude ?? 0
      const angleRad = (t.rotation || 0) * (Math.PI / 180)
      
      // Cálculo de offsets simplificado
      const baseSize = 1.2 * scaleFactor
      const mToLat = 1 / 111111
      const mToLng = 1 / (111111 * Math.cos(t.coordinates.lat * Math.PI / 180))

      const getRotatedPos = (ox: number, oy: number) => {
        const rx = ox * Math.cos(angleRad) - oy * Math.sin(angleRad)
        const ry = ox * Math.sin(angleRad) + oy * Math.cos(angleRad)
        return [t.coordinates.lng + rx * mToLng, t.coordinates.lat + ry * mToLat]
      }

      const isConcrete = statuses.some(s => s.activity?.name?.includes('Concretagem') && s.progressPercent >= 100)
      const isExcavation = !isConcrete && statuses.some(s => s.activity?.name?.includes('Escavação') && s.progressPercent > 0)

      if (isConcrete || isExcavation) {
        const offsets = [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]]
        offsets.forEach(off => {
          const pos = getRotatedPos(off[0] * scaleFactor, off[1] * scaleFactor)
          items.push({
            position: [pos[0], pos[1], isExcavation ? alt - 0.3 : alt],
            color: isConcrete ? [180, 180, 185, 255] : [35, 25, 15, 255],
            elevation: isConcrete ? 0.5 : 0.35,
            radius: isConcrete ? 2.2 * scaleFactor : 1.8 * scaleFactor
          })
        })
      }
      return items
    })

    if (groundProgressData.length > 0) {
      layers.push(new ColumnLayer({
        id: 'progress-ground-elements',
        data: groundProgressData,
        getPosition: (d: any) => d.position,
        getFillColor: (d: any) => d.color,
        getElevation: (d: any) => d.elevation,
        radius: 1, // Usaremos o rádio dinâmico via accessor se necessário, mas fixo é mais rápido
        elevationScale: 1,
        pickable: false, // PERFORMANCE: Desativar clique em buraquinhos
        updateTriggers: {
          getFillColor: [towers],
          getPosition: [towers, individualAltitudes]
        }
      }))
    }

    // 2. Bolinhas de Ensaio (Scatterplot é muito leve)
    const testTowers = towers.filter(t => 
      t.activityStatuses?.some(s => s.activity?.name?.includes('Ensaio de Arrancamento'))
    )

    if (testTowers.length > 0) {
      layers.push(new ScatterplotLayer({
        id: 'progress-tests',
        data: testTowers,
        getPosition: (t: any) => [t.coordinates.lng, t.coordinates.lat, (individualAltitudes[t.name] ?? 0) + 1.5],
        getFillColor: (t: any) => {
          const status = t.activityStatuses.find((s: any) => s.activity?.name?.includes('Ensaio de Arrancamento'))
          return status.progressPercent >= 100 ? [34, 197, 94] : [239, 68, 68]
        },
        getRadius: 1.2 * scaleFactor,
        pickable: false
      }))
    }

    // 3. Pré-montagem (O Scenegraph é o mais pesado, vamos filtrar rigorosamente)
    const preAssemblyTowers = towers.filter(t => 
      t.activityStatuses?.some(s => s.activity?.name?.includes('Pré-montagem') && s.progressPercent >= 100) &&
      !t.activityStatuses?.some(s => s.activity?.name?.includes('Içamento') && s.progressPercent >= 100)
    )

    if (preAssemblyTowers.length > 0) {
      layers.push(new ScenegraphLayer({
        id: 'progress-pre-assembly',
        data: preAssemblyTowers,
        getPosition: (t: any) => [t.coordinates.lng + 0.00005, t.coordinates.lat, individualAltitudes[t.name] ?? 0],
        getOrientation: (t: any) => [0, -(t.rotation || 0) + 90, 90],
        getScale: [0.2 * scaleFactor, 0.2 * scaleFactor, 0.2 * scaleFactor],
        scenegraph: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
        _lighting: 'pbr'
      }))
    }

    return layers
  }, [towers, towerTypeConfigs, scale, towerElevation, individualAltitudes, visible])

  return { progressLayers }
}
