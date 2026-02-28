import { useMemo } from 'react'
import { ScatterplotLayer, TextLayer, PathLayer } from '@deck.gl/layers'
import { ScenegraphLayer, SimpleMeshLayer } from '@deck.gl/mesh-layers'
import { SphereGeometry } from '@luma.gl/engine'
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
  selectedStages?: string[]
  onScanModel?: (tower: Tower, modelInfo: any) => void
  selectedBox?: import('../hooks/useBoundingBox').BoundingBox | null
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
  selectedStages = [],
  onScanModel,
  selectedBox,
}: UseMapLayersProps) {

  // Ordem cronológica das atividades para o filtro evolutivo
  const ACTIVITY_SEQUENCE = [
    'Acesso',
    'Supressão',
    'Escavação',
    'Armação',
    'Concretagem',
    'Arrancamento',
    'Fundação 100%',
    'Aterramento',
    'Transporte',
    'Distribuição',
    'Pré-montagem',
    'Montagem',
    'Içamento',
    'Revisão Final',
    'Lançamento'
  ];

  // Função auxiliar para verificar se a torre atingiu ou passou de uma determinada etapa
  const towerReachedStage = (tower: Tower, stageNames: string[]) => {
    if (stageNames.length === 0) return true;

    // Encontrar o maior índice entre as etapas selecionadas no filtro
    const minRequiredIndex = Math.max(...stageNames.map(name => 
      ACTIVITY_SEQUENCE.findIndex(s => name.toLowerCase().includes(s.toLowerCase()))
    ));

    if (minRequiredIndex === -1) return true; 

    // Verificar se a torre tem progresso (>0%) em QUALQUER etapa que seja igual ou posterior à filtrada
    return tower.activityStatuses?.some(status => {
      const activityName = status.activity?.name || '';
      const activityIndex = ACTIVITY_SEQUENCE.findIndex(s => activityName.toLowerCase().includes(s.toLowerCase()));
      
      // Se a torre já está em uma atividade posterior ou igual à filtrada com progresso
      return activityIndex >= minRequiredIndex && status.progressPercent > 0;
    });
  };

  const { cables, spacers, signalSpheres } = useMemo(() => {
    if (towers.length < 2 && connections.length === 0) {
      return { cables: [], spacers: [], signalSpheres: [] }
    }

    const newCables: Cable[] = []
    const newSpacers: Spacer[] = []
    const newSignalSpheres: any[] = []

    const spacerAccumulatedDists: Record<string, number> = {}
    const scaleFactor = scale / 50
    const metersToLat = 1 / 111111

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

          // Lógica de Filtro Evolutivo para Cabos
          const isStartVisible = towerReachedStage(start, selectedStages);
          const isEndVisible = towerReachedStage(end, selectedStages);

          if (
            !hiddenTowers.has(startIndex) &&
            !hiddenTowers.has(endIndex) &&
            !hiddenTowerIds.has(start.name) &&
            !hiddenTowerIds.has(end.name) &&
            isStartVisible && isEndVisible
          ) {
            const scaleFactor = scale / 50;
            const metersToLat = 1 / 111111;
            const metersToLng = 1 / (111111 * Math.cos((start.coordinates.lat * Math.PI) / 180));

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

            phases.forEach(phase => {
              if (!phase.enabled) return

              const count = phase.cableCount || 1
              const spacing = (phase.bundleSpacing || 0.4) * (scale / 50)
              
              const startAlt = individualAltitudes[start.name] !== undefined ? individualAltitudes[start.name] : start.coordinates.altitude || 0
              const endAlt = individualAltitudes[end.name] !== undefined ? individualAltitudes[end.name] : end.coordinates.altitude || 0

              // Cálculos de Ancoragem baseados na Rotação da Torre (Mísulas)
              const getAnchorPoint = (tower: Tower, isVante: boolean) => {
                const angleRad = (tower.rotation || 0) * (Math.PI / 180)
                
                // hBase é a distância do centro até a ponta da mísula
                const hBase = phase.horizontalOffset * (scale / 50)
                const vBase = phase.verticalOffset * (scale / 50)
                
                // Deslocamento para frente (Vante) ou para trás (Ré) na mísula
                // Para evitar que o cabo atravesse o metal da torre
                const yOffset = (isVante ? 1.5 : -1.5) * (scale / 50)

                // Rotação do vetor (hBase, yOffset) pelo ângulo da torre
                const rotX = hBase * Math.cos(angleRad) - yOffset * Math.sin(angleRad)
                const rotY = hBase * Math.sin(angleRad) + yOffset * Math.cos(angleRad)

                return {
                  x: tower.coordinates.lng + rotX * metersToLng,
                  y: tower.coordinates.lat + rotY * metersToLat,
                  z: (individualAltitudes[tower.name] ?? tower.coordinates.altitude ?? 0) + vBase + towerElevation
                }
              }

              // Torre Start -> Lança o cabo pela Vante
              const cp1 = getAnchorPoint(start, true)
              // Torre End -> Recebe o cabo pela Ré
              const cp2 = getAnchorPoint(end, false)

              const anchorZOffset = count === 4 ? -1.5 : 0
              const dx = end.coordinates.lng - start.coordinates.lng
              const dy = end.coordinates.lat - start.coordinates.lat
              const groundDist = Math.sqrt(
                Math.pow(dx * 111111 * Math.cos((start.coordinates.lat * Math.PI) / 180), 2) + Math.pow(dy * 111111, 2)
              )
              const uLng = dx / Math.max(0.1, groundDist)
              const uLat = dy / Math.max(0.1, groundDist)
              const termOffset = 0.6 // Distância extra de isolador

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

              // 1. Spacers Logic
              if (count > 1 && phase.spacerInterval && phase.spacerInterval > 0) {
                const spInterval = phase.spacerInterval
                let currentDist = spacerAccumulatedDists[phase.id] || 0
                for (let j = 0; j < centerPath.length - 1; j++) {
                  const pA = centerPath[j]
                  const pB = centerPath[j + 1]
                  const segLen = Math.sqrt(
                    Math.pow((pB.x - pA.x) * 111111 * Math.cos(pA.y * Math.PI / 180), 2) +
                    Math.pow((pB.y - pA.y) * 111111, 2) +
                    Math.pow(pB.z - pA.z, 2)
                  )
                  if (currentDist + segLen >= spInterval) {
                    const ratio = (spInterval - currentDist) / segLen
                    const spacerX = pA.x + (pB.x - pA.x) * ratio
                    const spacerY = pA.y + (pB.y - pA.y) * ratio
                    const spacerZ = pA.z + (pB.z - pA.z) * ratio
                    newSpacers.push({
                      position: [spacerX, spacerY, spacerZ],
                      color: phase.spacerColor || [20, 20, 20],
                      size: phase.spacerSize || 1.1,
                      type: count,
                      rotation: perpAngle * (180 / Math.PI),
                    })
                    currentDist = segLen * (1 - ratio)
                  } else {
                    currentDist += segLen
                  }
                }
              }

              // 2. Signal Spheres Logic
              if (phase.signalSpheresEnabled && phase.signalSphereInterval && phase.signalSphereInterval > 0) {
                const sphInterval = phase.signalSphereInterval
                let currentDist = 0 // Spheres usually start fresh per span
                for (let j = 0; j < centerPath.length - 1; j++) {
                  const pA = centerPath[j]
                  const pB = centerPath[j + 1]
                  const segLen = Math.sqrt(
                    Math.pow((pB.x - pA.x) * 111111 * Math.cos(pA.y * Math.PI / 180), 2) +
                    Math.pow((pB.y - pA.y) * 111111, 2) +
                    Math.pow(pB.z - pA.z, 2)
                  )
                  if (currentDist + segLen >= sphInterval) {
                    const ratio = (sphInterval - currentDist) / segLen
                    newSignalSpheres.push({
                      position: [
                        pA.x + (pB.x - pA.x) * ratio,
                        pA.y + (pB.y - pA.y) * ratio,
                        pA.z + (pB.z - pA.z) * ratio
                      ],
                      color: phase.signalSphereColor || [255, 100, 0],
                      radius: (phase.signalSphereSize || 0.6) * (scale / 50),
                    })
                    currentDist = segLen * (1 - ratio)
                  } else {
                    currentDist += segLen
                  }
                }
              }

              // Bundled cables (Lógica de Distribuição Simétrica ao redor do ponto de ancoragem)
              for (let i = 0; i < count; i++) {
                let bundleHOffset = 0
                let bundleVOffset = 0
                
                // Distribuição baseada na quantidade de condutores (Engenharia de LT)
                if (count === 4) {
                  // Formação em Quadrado
                  bundleHOffset = i === 0 || i === 3 ? -spacing / 2 : spacing / 2
                  bundleVOffset = i === 0 || i === 1 ? spacing / 2 : -spacing / 2
                } else if (count === 3) {
                  // Formação em Triângulo equilátero
                  if (i === 0) { bundleHOffset = 0; bundleVOffset = spacing * 0.577; }
                  else if (i === 1) { bundleHOffset = -spacing / 2; bundleVOffset = -spacing * 0.288; }
                  else { bundleHOffset = spacing / 2; bundleVOffset = -spacing * 0.288; }
                } else if (count === 2) {
                  // Formação Horizontal
                  bundleHOffset = i === 0 ? -spacing / 2 : spacing / 2
                }

                // Cálculo dos pontos P1 e P2 rotacionados para cada cabo do feixe
                const getBundlePoint = (tower: Tower, isVante: boolean) => {
                  const angleRad = (tower.rotation || 0) * (Math.PI / 180)
                  
                  // Posição base (Mísula + Offset do Feixe)
                  const hTotal = (phase.horizontalOffset * scaleFactor) + bundleHOffset
                  const vTotal = (phase.verticalOffset * scaleFactor) + bundleVOffset
                  
                  const yOffset = (isVante ? 1.5 : -1.5) * scaleFactor

                  // Rotação Euleriana
                  const rotX = hTotal * Math.cos(angleRad) - yOffset * Math.sin(angleRad)
                  const rotY = hTotal * Math.sin(angleRad) + yOffset * Math.cos(angleRad)

                  return {
                    x: tower.coordinates.lng + rotX * metersToLng,
                    y: tower.coordinates.lat + rotY * metersToLat,
                    z: (individualAltitudes[tower.name] ?? tower.coordinates.altitude ?? 0) + vTotal + towerElevation + anchorZOffset
                  }
                }

                const p1 = getBundlePoint(start, true)
                const p2 = getBundlePoint(end, false)

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
    selectedStages,
  ])

  const layers = useMemo(() => {
    const currentZoom = viewState.zoom
    const visibleTowers = towers.filter((t, i) => {
      const isHidden = hiddenTowers.has(i) ||
        hiddenTowerIds.has(t.name) ||
        hiddenTowerIds.has(t.id)

      if (isHidden) return false

      // Filtro Evolutivo por Etapa:
      return towerReachedStage(t, selectedStages);
    })

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
                  const typeConfig = towerTypeConfigs?.find(c => c.type === d.type)
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
                  const typeConfig = towerTypeConfigs?.find(c => c.type === d.type)
                  const targetH = (d as any).towerHeight || (d.metadata as any)?.towerHeight || 30
                  // Se a escala for 50 (padrão), usamos a altura alvo em metros
                  const s = (targetH / 1.0) * ((scale + (typeConfig?.scale ?? 0)) / 30)
                  return [s, s, s]
                },
                _lighting: 'pbr',
                pickable: true,
                // LÓGICA DE MANIPULAÇÃO DO MODELO (DYNAMICO)
                onDataLoad: (scenegraph) => {
                  // Aqui podemos pré-processar o modelo se necessário
                },
                _nodes: {
                  // Controle de visibilidade por nome de nó conforme o progresso da torre
                  // Nota: Deck.gl permite passar funções para os nós
                },
                updateTriggers: {
                  getScale: [scale, towerTypeConfigs],
                  getPosition: [towerElevation, individualAltitudes],
                },
                // Injetamos a lógica de visibilidade e posicionamento por objeto individual
                _nodeTransform: (node, { index, data }) => {
                  const tower = data[index] as Tower
                  if (!tower) return

                  const typeConfig = towerTypeConfigs?.find(c => c.type === tower.type)
                  const targetH = (tower as any).towerHeight || (tower.metadata as any)?.towerHeight || 30
                  
                  // LÓGICA DE AUTO-GROUNDING (Correção de Pivot)
                  // Se o nó for a raiz da cena, aplicamos uma translação para subir a torre
                  // assumindo que a maioria dos modelos do Sketchfab tem o pivot no centro (Z=0 no meio)
                  if (node.name === 'root' || node.name === 'Sketchfab_model' || node.name === 'Collada_visual_scene_group') {
                    // Sobe o modelo em 50% da sua altura base para que os pés fiquem em Z=0
                    // Nota: 0.5 é um fator comum, mas podemos ajustar via metadados no futuro
                    node.position = [0, 0, 0.5 * (targetH / ((scale + (typeConfig?.scale || 0)) / 30))]
                  }

                  const statuses = tower.activityStatuses || []
                  const isConcreteDone = statuses.some(s => s.activity?.name?.includes('Concretagem') && s.progressPercent > 0)
                  const isAssemblyStarted = statuses.some(s => s.activity?.name?.includes('Montagem') && s.progressPercent > 0)

                  const nodeName = node.name?.toLowerCase() || ''

                  // Regra: Nó 'extra' (concreto/bases) só aparece se houver progresso em Concretagem
                  if (nodeName.includes('extra')) {
                    node.visible = isConcreteDone
                  }

                  // Regra: Nó 'main' (ferro/estrutura) só aparece se a Montagem começou
                  if (nodeName.includes('main')) {
                    node.visible = isAssemblyStarted
                  }
                },
                onClick: info => {
                  if (info.object) {
                    const originalIndex = towers.findIndex(
                      t => t.name === info.object.name
                    )
                    if (originalIndex !== -1)
                      handleTowerClick(info, originalIndex)
                    
                    // Diagnóstico 3D (Escaneamento de nós do GLB)
                    if (onScanModel) {
                      onScanModel(info.object, info)
                    }
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
      new SimpleMeshLayer({
        id: 'signal-spheres-layer',
        data: signalSpheres,
        mesh: new SphereGeometry({
          radius: 1,
          nlat: 32,
          nlong: 32,
        }),
        sizeScale: 1,
        getPosition: (d: any) => d.position,
        getColor: (d: any) => d.color,
        getScale: (d: any) => [d.radius, d.radius, d.radius],
        getOrientation: [0, 0, 0],
        pickable: false,
        _lighting: 'pbr', // Ativa o brilho e materiais realistas
      }),
      // Spacers representados como barras pequenas ou cruzes dependendo do bundle
      new PathLayer({
        id: 'spacers-layer',
        data: spacers.flatMap((s: any) => {
          const w = s.size / 2;
          const r = s.rotation * (Math.PI / 180);
          const dx = w * Math.cos(r) * (1 / 111111);
          const dy = w * Math.sin(r) * (1 / 111111);
          const pos = s.position;
          
          if (s.type === 2) {
            return [{ path: [[pos[0]-dx, pos[1]-dy, pos[2]], [pos[0]+dx, pos[1]+dy, pos[2]]], color: s.color }];
          } else if (s.type === 4) {
            return [
              { path: [[pos[0]-dx, pos[1]-dy, pos[2]-w], [pos[0]+dx, pos[1]+dy, pos[2]+w]], color: s.color },
              { path: [[pos[0]-dx, pos[1]-dy, pos[2]+w], [pos[0]+dx, pos[1]+dy, pos[2]-w]], color: s.color }
            ];
          }
          return [];
        }),
        pickable: false,
        widthScale: 1,
        widthUnits: 'meters',
        widthMinPixels: 2,
        getPath: d => d.path,
        getColor: d => d.color,
        getWidth: 0.1,
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
      // Bounding Box Layer (Neon Debug Cage)
      ...(selectedBox && selectedStartTower !== null ? [
        new PathLayer({
          id: 'bounding-box-layer',
          data: (() => {
            const t = towers[selectedStartTower];
            if (!t) return [];
            const { min, max } = selectedBox;
            const pos = [t.coordinates.lng, t.coordinates.lat, (individualAltitudes[t.name] ?? 0) + towerElevation];
            
            // Simples representação de caixa 3D convertida para o mapa (aproximado)
            const mToLat = 1 / 111111;
            const mToLng = 1 / (111111 * Math.cos(t.coordinates.lat * Math.PI / 180));
            
            const points = [
              [min[0], min[1], min[2]], [max[0], min[1], min[2]], [max[0], max[1], min[2]], [min[0], max[1], min[2]], [min[0], min[1], min[2]], // Base
              [min[0], min[1], max[2]], [max[0], min[1], max[2]], [max[0], max[1], max[2]], [min[0], max[1], max[2]], [min[0], min[1], max[2]], // Topo
            ].map(p => [
              pos[0] + p[0] * mToLng * (scale/50), 
              pos[1] + p[1] * mToLat * (scale/50), 
              pos[2] + p[2] * (scale/50)
            ]);

            return [{ path: points, color: [255, 255, 0, 200] }];
          })(),
          getPath: d => d.path,
          getColor: d => d.color,
          getWidth: 0.2,
          widthUnits: 'meters',
        })
      ] : []),
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
    spacers,
    signalSpheres,
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
