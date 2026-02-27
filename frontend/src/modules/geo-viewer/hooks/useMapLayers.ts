import { useMemo } from 'react'
import { ScatterplotLayer, TextLayer, PathLayer } from '@deck.gl/layers'
import { ScenegraphLayer } from '@deck.gl/mesh-layers'
import { CatenaryCalculator } from '@/services/catenary-calculator'
import { Tower, Cable, Spacer } from '../types/geo-viewer'
import { PhaseConfig } from '@/components/map/CableConfigModal'

interface UseMapLayersProps {
  towers: Tower[]
  phases: PhaseConfig[]
  connections: { from: string; to: string }[]
  towerElevation: number
  scale: number
  individualAltitudes: Record<string, number>
  hiddenTowers: Set<number>
  hiddenTowerIds: Set<string>
  selectedStartTower: number | null
  selectedSwapTower?: number | null
  viewState: { zoom: number }
  TOWER_MODEL_URL: string
  handleTowerClick: (info: any, index: number) => void
  setContextMenu: (menu: any) => void
  debugPoints: any[]
  towerTypeConfigs?: import('../hooks/useProjectConfig').TowerTypeConfig[]
}

export function useMapLayers({
  towers,
  phases,
  connections,
  towerElevation,
  scale,
  individualAltitudes,
  hiddenTowers,
  hiddenTowerIds,
  selectedStartTower,
  selectedSwapTower,
  viewState,
  TOWER_MODEL_URL,
  handleTowerClick,
  setContextMenu,
  debugPoints,
  towerTypeConfigs,
}: UseMapLayersProps) {
  const { cables, spacers, signalSpheres } = useMemo(() => {
    if (towers.length < 2 && connections.length === 0) {
      return { cables: [], spacers: [], signalSpheres: [] }
    }

    const newCables: Cable[] = []
    const newSpacers: Spacer[] = []
    const newSignalSpheres: any[] = []

    const spacerAccumulatedDists: Record<string, number> = {}

    phases.forEach((p, idx) => {
      const staggerFactor = (idx % 3) / 3
      if (p.spacerInterval) {
        spacerAccumulatedDists[p.id] = p.spacerInterval * staggerFactor
      }
    })

    if (connections.length > 0) {
      const towerMap = new Map(
        towers.map(t => [t.name.trim().toUpperCase(), t])
      )

      connections.forEach(conn => {
        const startName = conn.from.trim().toUpperCase()
        const endName = conn.to.trim().toUpperCase()
        const start = towerMap.get(startName)
        const end = towerMap.get(endName)

        if (start && end) {
          const startIndex = towers.indexOf(start)
          const endIndex = towers.indexOf(end)

          if (
            !hiddenTowers.has(startIndex) &&
            !hiddenTowers.has(endIndex) &&
            !hiddenTowerIds.has(start.name) &&
            !hiddenTowerIds.has(end.name)
          ) {
            const dLon = end.coordinates.lng - start.coordinates.lng
            const y =
              Math.sin((dLon * Math.PI) / 180) *
              Math.cos((end.coordinates.lat * Math.PI) / 180)
            const x =
              Math.cos((start.coordinates.lat * Math.PI) / 180) *
                Math.sin((end.coordinates.lat * Math.PI) / 180) -
              Math.sin((start.coordinates.lat * Math.PI) / 180) *
                Math.cos((end.coordinates.lat * Math.PI) / 180) *
                Math.cos((dLon * Math.PI) / 180)
            const bearing = Math.atan2(y, x)
            const perpAngle = bearing + Math.PI / 2
            const metersToLat = 1 / 111111
            const metersToLng =
              1 / (111111 * Math.cos((start.coordinates.lat * Math.PI) / 180))

            phases.forEach(phase => {
              if (!phase.enabled) return

              const count = phase.cableCount || 1
              const spacing = (phase.bundleSpacing || 0.4) * (scale / 50)
              const hBase = phase.horizontalOffset * (scale / 50)
              const recedeOffset = 0.3 * (scale / 50)
              const hAdjusted =
                hBase + (hBase > 0 ? recedeOffset : -recedeOffset)

              const hLatOffset = Math.cos(perpAngle) * hAdjusted * metersToLat
              const hLngOffset = Math.sin(perpAngle) * hAdjusted * metersToLng

              const startAlt =
                individualAltitudes[start.name] !== undefined
                  ? individualAltitudes[start.name]
                  : start.coordinates.altitude || 0
              const endAlt =
                individualAltitudes[end.name] !== undefined
                  ? individualAltitudes[end.name]
                  : end.coordinates.altitude || 0

              const cp1 = {
                x: start.coordinates.lng + hLngOffset,
                y: start.coordinates.lat + hLatOffset,
                z:
                  startAlt +
                  phase.verticalOffset * (scale / 50) +
                  towerElevation,
              }
              const cp2 = {
                x: end.coordinates.lng + hLngOffset,
                y: end.coordinates.lat + hLatOffset,
                z:
                  endAlt + phase.verticalOffset * (scale / 50) + towerElevation,
              }

              const anchorZOffset = count === 4 ? -1.5 : 0
              const dx = end.coordinates.lng - start.coordinates.lng
              const dy = end.coordinates.lat - start.coordinates.lat
              const groundDist = Math.sqrt(
                Math.pow(
                  dx *
                    111111 *
                    Math.cos((start.coordinates.lat * Math.PI) / 180),
                  2
                ) + Math.pow(dy * 111111, 2)
              )
              const uLng = dx / Math.max(0.1, groundDist)
              const uLat = dy / Math.max(0.1, groundDist)
              const termOffset = 0.6

              const cp1_short = {
                x: cp1.x + uLng * termOffset,
                y: cp1.y + uLat * termOffset,
                z: cp1.z + anchorZOffset,
              }
              const cp2_short = {
                x: cp2.x - uLng * termOffset,
                y: cp2.y - uLat * termOffset,
                z: cp2.z + anchorZOffset,
              }

              const centerPath = CatenaryCalculator.generateCatenaryPoints(
                cp1_short,
                cp2_short,
                phase.tension,
                30
              )

              // Bundled cables
              for (let i = 0; i < count; i++) {
                let bundleHOffset = 0
                let bundleVOffset = 0
                if (count === 4) {
                  bundleHOffset =
                    i === 0 || i === 2 ? -spacing / 2 : spacing / 2
                  bundleVOffset =
                    i === 0 || i === 1 ? spacing / 2 : -spacing / 2
                } else if (count === 3) {
                  if (i === 0) {
                    bundleHOffset = 0
                    bundleVOffset = spacing * 0.577
                  } else if (i === 1) {
                    bundleHOffset = -spacing / 2
                    bundleVOffset = -spacing * 0.288
                  } else {
                    bundleHOffset = spacing / 2
                    bundleVOffset = -spacing * 0.288
                  }
                } else if (count === 2) {
                  bundleHOffset = i === 0 ? -spacing / 2 : spacing / 2
                }

                const bhLat = Math.cos(perpAngle) * bundleHOffset * metersToLat
                const bhLng = Math.sin(perpAngle) * bundleHOffset * metersToLng

                const p1 = {
                  x: cp1.x + bhLng + uLng * termOffset,
                  y: cp1.y + bhLat + uLat * termOffset,
                  z: cp1.z + bundleVOffset,
                }
                const p2 = {
                  x: cp2.x + bhLng - uLng * termOffset,
                  y: cp2.y + bhLat - uLat * termOffset,
                  z: cp2.z + bundleVOffset,
                }

                const pathPoints = CatenaryCalculator.generateCatenaryPoints(
                  p1,
                  p2,
                  phase.tension,
                  20
                )
                newCables.push({
                  from: start,
                  to: end,
                  path: pathPoints.map(p => [p.x, p.y, p.z]),
                  color: phase.color,
                  phase: `${phase.id}-${i}`,
                  width: phase.width || 0.15,
                })
              }
            })
          }
        }
      })
    }
    return {
      cables: newCables,
      spacers: newSpacers,
      signalSpheres: newSignalSpheres,
    }
  }, [
    towers,
    phases,
    hiddenTowers,
    hiddenTowerIds,
    connections,
    towerElevation,
    scale,
    individualAltitudes,
  ])

  const layers = useMemo(() => {
    const currentZoom = viewState.zoom
    const visibleTowers = towers.filter(
      (t, i) =>
        !hiddenTowers.has(i) &&
        !hiddenTowerIds.has(t.name) &&
        !hiddenTowerIds.has(t.id)
    )

    const towerLayers =
      currentZoom < 14
        ? [
            new ScatterplotLayer({
              id: 'tower-dots-low-zoom',
              data: visibleTowers,
              getPosition: (d: Tower) => [
                d.coordinates.lng,
                d.coordinates.lat,
                0,
              ],
              getFillColor: [0, 255, 170, 255],
              getRadius: 50,
              radiusUnits: 'meters',
              radiusMinPixels: 4,
              pickable: true,
              onContextMenu: (info, event) => {
                if (event.srcEvent) event.srcEvent.preventDefault()
                if (info.object) {
                  setContextMenu({ x: info.x, y: info.y, tower: info.object })
                }
              },
            }),
          ]
        : (() => {
            // Group towers by their model URL for ScenegraphLayer instances
            const modelGroups: Record<string, Tower[]> = {}
            visibleTowers.forEach(t => {
              const typeConfig = towerTypeConfigs?.find(c => c.type === t.type)
              let model = typeConfig?.modelUrl || TOWER_MODEL_URL
              if (model === 'INTERNAL_DEFAULT') model = TOWER_MODEL_URL
              if (!modelGroups[model]) modelGroups[model] = []
              modelGroups[model].push(t)
            })

            return Object.entries(modelGroups).map(([modelUrl, group], idx) => {
              return new ScenegraphLayer({
                id: `towers-layer-${idx}`,
                data: group,
                scenegraph: modelUrl,
                getPosition: (d: Tower) => {
                  const typeConfig = towerTypeConfigs?.find(
                    c => c.type === d.type
                  )
                  const elev = typeConfig?.elevation ?? towerElevation
                  return [
                    d.coordinates.lng,
                    d.coordinates.lat,
                    (individualAltitudes[d.name] !== undefined
                      ? individualAltitudes[d.name]
                      : d.coordinates.altitude || 0) + elev,
                  ]
                },
                getOrientation: (d: Tower) => [0, -(d.rotation || 0), 90],
                sizeScale: 1,
                getScale: (d: Tower) => {
                  const typeConfig = towerTypeConfigs?.find(
                    c => c.type === d.type
                  )
                  const targetH =
                    (d as any).towerHeight ||
                    (d.metadata as any)?.towerHeight ||
                    (d.metadata as any)?.height ||
                    30
                  const s =
                    (targetH / 1.0) * ((scale + (typeConfig?.scale ?? 0)) / 30)
                  return [s, s, s]
                },
                _lighting: 'pbr',
                pickable: true,
                onClick: info => {
                  if (info.object) {
                    const originalIndex = towers.findIndex(
                      t => t.name === info.object.name
                    )
                    if (originalIndex !== -1)
                      handleTowerClick(info, originalIndex)
                  }
                },
                onContextMenu: (info, event) => {
                  if (event.srcEvent) event.srcEvent.preventDefault()
                  if (info.object) {
                    setContextMenu({ x: info.x, y: info.y, tower: info.object })
                  }
                },
                autoHighlight: true,
                highlightColor: [0, 255, 170, 150],
                getColor: (d: Tower) => {
                  if (
                    selectedStartTower !== null &&
                    towers[selectedStartTower]?.name === d.name
                  ) {
                    return [0, 255, 255, 255] // Cyan for connect mode
                  }
                  if (
                    selectedSwapTower !== null &&
                    selectedSwapTower !== undefined &&
                    towers[selectedSwapTower]?.name === d.name
                  ) {
                    return [168, 85, 247, 255] // Purple for swap mode
                  }
                  return [255, 255, 255]
                },
              })
            })
          })()

    return [
      ...towerLayers,
      new PathLayer({
        id: 'cables-layer',
        data: cables,
        pickable: true,
        widthScale: 1,
        widthUnits: 'meters',
        widthMinPixels: 1.5,
        getPath: d => d.path,
        getColor: d => d.color,
        getWidth: d => d.width || 0.15,
      }),
      new ScatterplotLayer({
        id: 'debug-points-layer',
        data: debugPoints || [],
        getPosition: (d: any) => d?.position || [0, 0, 0],
        getFillColor: [255, 59, 48, 255],
        getRadius: 1.8,
        radiusUnits: 'meters',
        radiusMinPixels: 4,
        pickable: true,
        parameters: { depthTest: false },
      }),
      new TextLayer({
        id: 'tower-labels',
        data: visibleTowers,
        getPosition: (d: Tower) => [
          d.coordinates.lng,
          d.coordinates.lat,
          (individualAltitudes[d.name] !== undefined
            ? individualAltitudes[d.name]
            : d.coordinates.altitude || 0) +
            towerElevation +
            2,
        ],
        getText: (d: Tower) => d.name,
        getSize: 16,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        getColor: [255, 255, 255],
        background: true,
        getBackgroundColor: [0, 0, 0, 180],
        billboard: true,
      }),
    ]
  }, [
    towers,
    cables,
    hiddenTowers,
    hiddenTowerIds,
    scale,
    selectedStartTower,
    debugPoints,
    towerElevation,
    individualAltitudes,
    viewState.zoom,
    handleTowerClick,
    setContextMenu,
    TOWER_MODEL_URL,
    towerTypeConfigs,
    selectedSwapTower,
  ])

  return { layers }
}
