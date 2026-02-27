import { PathLayer } from '@deck.gl/layers'
import { CatenaryCalculator } from './catenary-calculator'
import { TowerPhysics } from './tower-physics'
import {
  CableAnchorConfig,
  CableSettings,
  ModelTransform,
} from '../components/map/cable-config-modal'
import { TowerAnchorService } from './tower-anchor-service'

export interface CablePath {
  path: [number, number, number][]
  color: string
  width: number
  id: string
  isTerminalAtTarget?: boolean
  sourceIsDerivation?: boolean
  towerStartId: string
  towerEndId: string
  towerStartName?: string
  towerEndName?: string
  projectId?: string
  sourceType: 'manual' | 'auto_generated'
}

export interface CableGeneratorOptions {
  towers: any[]
  projectSpans: any[]
  cableSettings: CableSettings
  placemarkOverrides: Record<string, any>
  projectAnchors: Record<string, any[]>
  templateAnchors: Record<string, any[]>
  hiddenSpans: Set<string>
  hiddenPlacemarkIds: Set<string>
  projectId?: string
  getNumericId: (p: any) => number
  getLocKey: (t: any) => string
  localModelUrl: string
  getEffectiveTransform: (
    individual: ModelTransform | undefined,
    url: string
  ) => ModelTransform | undefined
  disableAutoGeneration?: boolean
  globalScale?: number
  getTerrainElevation?: (lng: number, lat: number) => number
}

export const CableLayerService = {
  generateCables: (options: CableGeneratorOptions): CablePath[] => {
    const {
      towers,
      projectSpans,
      cableSettings,
      placemarkOverrides,
      hiddenSpans,
      hiddenPlacemarkIds,
      projectId,
      getNumericId,
      getLocKey,
      localModelUrl,
      getEffectiveTransform,
      projectAnchors,
      templateAnchors,
      getTerrainElevation,
    } = options

    const paths: CablePath[] = []
    const processedSpanIdsFromManual = new Set<string>()
    const enabledAnchors = cableSettings.anchors.filter(a => a.enabled)

    const normalizeName = (name: string) => (name || '').trim().toUpperCase()
    const getSiteCore = (name: string) => {
      const n = normalizeName(name)
      const match = n.match(/^(\d+[/-]\d+)/)
      return match ? match[1] : n
    }

    // 1. Process Manual Spans (Priority)
    if (projectSpans && projectSpans.length > 0) {
      projectSpans.forEach(span => {
        let src = towers.find(
          p => p.id === span.tower_start_id || p.id === span.towerStartId
        )
        if (!src)
          src = towers.find(
            p =>
              getSiteCore(p.name) === getSiteCore(span.tower_start_id) ||
              getSiteCore(p.name) === getSiteCore(span.towerStartId)
          )

        let tgt = towers.find(
          p => p.id === span.tower_end_id || p.id === span.towerEndId
        )
        if (!tgt)
          tgt = towers.find(
            p =>
              getSiteCore(p.name) === getSiteCore(span.tower_end_id) ||
              getSiteCore(p.name) === getSiteCore(span.towerEndId)
          )

        if (src && tgt) {
          // Skip if either tower is hidden
          if (src.isHidden || tgt.isHidden) return

          const n1 = normalizeName(src.name)
          const n2 = normalizeName(tgt.name)
          const spanKeyAB = `${n1}:::${n2}`
          const spanKeyBA = `${n2}:::${n1}`
          const tProjId = span.project_id || projectId || 'default'

          // Ocultação Baseada em Nomes (KMZ/Virtual) ou ID (Persistente)
          if (
            hiddenSpans.has(spanKeyAB) ||
            hiddenSpans.has(spanKeyBA) ||
            (tProjId &&
              (hiddenPlacemarkIds.has(`${tProjId}:::${spanKeyAB}`) ||
                hiddenPlacemarkIds.has(`${tProjId}:::${spanKeyBA}`) ||
                hiddenPlacemarkIds.has(`${tProjId}:::${span.id}`)))
          ) {
            return
          }

          const logicalPairKey = [n1, n2].sort().join(':::')
          processedSpanIdsFromManual.add(logicalPairKey)

          enabledAnchors.forEach(config => {
            // Data-Driven Filtering (Professional V1):
            const spanConductors = (span as any)._conductors

            if (spanConductors && Array.isArray(spanConductors)) {
              // Normalize phase helper
              const normalizePhase = (p: string) =>
                (p || '').toUpperCase().replace(/FASE|PHASE|\s/g, '')
              const anchorP = normalizePhase(config.phase || config.label)

              const hasPhysicalConductor = spanConductors.some((c: any) => {
                const condP = normalizePhase(c.phase)
                const phaseMatch =
                  condP === anchorP ||
                  (config.phase && condP === normalizePhase(config.phase))
                const circuitMatch =
                  !c.circuitId ||
                  !config.circuitId ||
                  c.circuitId.toUpperCase() === config.circuitId.toUpperCase()
                return phaseMatch && circuitMatch
              })

              if (!hasPhysicalConductor) {
                return
              }
            } else {
              // Fallback Logic (Legacy Spans):
              const towerCircuits =
                (src as any).allCircuits ||
                (src.circuitId ? [src.circuitId] : [])
              if (config.circuitId && towerCircuits.length > 0) {
                const hasMatch = towerCircuits.some(
                  (c: string) =>
                    c.toUpperCase() === config.circuitId?.toUpperCase()
                )
                if (!hasMatch) return
              }
            }

            try {
              const startPoint = TowerAnchorService.getAnchor({
                tower: src!,
                config,
                role: 'vante',
                placemarkOverrides,
                cableSettings,
                projectAnchors,
                templateAnchors,
                localModelUrl,
                getEffectiveTransform,
                globalScale: options.globalScale,
                getTerrainElevation,
              })
              const endPoint = TowerAnchorService.getAnchor({
                tower: tgt!,
                config,
                role: 're',
                placemarkOverrides,
                cableSettings,
                projectAnchors,
                templateAnchors,
                localModelUrl,
                getEffectiveTransform,
                globalScale: options.globalScale,
                getTerrainElevation,
              })
              const points = CatenaryCalculator.generateCatenaryPoints(
                startPoint,
                endPoint,
                cableSettings.tension,
                60
              )

              paths.push({
                path: points.map(p => [p.x, p.y, p.z]),
                color: config.color,
                width: config.width,
                id: `manual-${span.id}-${config.id}`,
                towerStartId: src!.id,
                towerEndId: tgt!.id,
                towerStartName: src!.name,
                towerEndName: tgt!.name,
                projectId: span.project_id || projectId,
                sourceType: 'manual',
              })
            } catch (err) {
              console.error(
                `❌ Erro ao gerar âncora para vão manual ${span.id}:`,
                err
              )
            }
          })
        }
      })
    }

    // 2. Linear Graph Auto-Generation (KMZ Style)
    if (projectSpans.length === 0 && !options.disableAutoGeneration) {
      const autoProcessedPairs = new Set<string>()
      const towersByProj = new Map<string, any[]>()

      towers.forEach(t => {
        const pid = (t as any).projectId || (t as any).document_id || 'default'
        if (!towersByProj.has(pid)) towersByProj.set(pid, [])
        towersByProj.get(pid)?.push(t)
      })

      const getDistMeters = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
      ) => {
        const R = 6371e3
        const phi1 = (lat1 * Math.PI) / 180
        const phi2 = (lat2 * Math.PI) / 180
        const dPhi = ((lat2 - lat1) * Math.PI) / 180
        const dLambda = ((lon2 - lon1) * Math.PI) / 180
        const a =
          Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
          Math.cos(phi1) *
            Math.cos(phi2) *
            Math.sin(dLambda / 2) *
            Math.sin(dLambda / 2)
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      }

      towersByProj.forEach((projectTowers, pid) => {
        const siteMap = new Map<string, any[]>()
        projectTowers.forEach(t => {
          const key = getLocKey(t)
          if (!siteMap.has(key)) siteMap.set(key, [])
          siteMap.get(key)?.push(t)
        })

        const sortedSites = Array.from(siteMap.values())
          .map(tws => {
            const numericIds = tws
              .map(t => getNumericId(t))
              .filter(n => n !== undefined && !isNaN(n))
            const minSeq = numericIds.length > 0 ? Math.min(...numericIds) : 0
            return { towers: tws, minSeq }
          })
          .sort((a, b) => a.minSeq - b.minSeq)

        for (let i = 0; i < sortedSites.length - 1; i++) {
          const siteA = sortedSites[i]
          const siteB = sortedSites[i + 1]

          const dist = getDistMeters(
            siteA.towers[0].coordinates.lat,
            siteA.towers[0].coordinates.lng,
            siteB.towers[0].coordinates.lat,
            siteB.towers[0].coordinates.lng
          )
          if (dist > 2500) continue

          const srcSiblings = [...siteA.towers].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
          const tgtSiblings = [...siteB.towers].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
          )
          const linkCount = Math.min(srcSiblings.length, tgtSiblings.length)

          for (let k = 0; k < linkCount; k++) {
            const src = srcSiblings[k]
            const tgt = tgtSiblings[k]

            // Skip if either tower is hidden
            if (src.isHidden || tgt.isHidden) continue

            const n1 = normalizeName(src.name)
            const n2 = normalizeName(tgt.name)
            const logicalPairKey = [n1, n2].sort().join(':::')

            if (autoProcessedPairs.has(logicalPairKey)) continue
            if (processedSpanIdsFromManual.has(logicalPairKey)) continue

            const tProjId =
              (src as any).projectId || (src as any).document_id || pid
            const spanKeyAB = `${n1}:::${n2}`
            const spanKeyBA = `${n2}:::${n1}`
            if (
              hiddenSpans.has(spanKeyAB) ||
              hiddenSpans.has(spanKeyBA) ||
              hiddenPlacemarkIds.has(`${tProjId}:::${spanKeyAB}`) ||
              hiddenPlacemarkIds.has(`${tProjId}:::${spanKeyBA}`)
            )
              continue

            autoProcessedPairs.add(logicalPairKey)

            enabledAnchors.forEach(config => {
              const towerCircuits =
                (src as any).allCircuits ||
                (src.circuitId ? [src.circuitId] : [])
              if (config.circuitId && towerCircuits.length > 0) {
                const hasMatch = towerCircuits.some(
                  (c: string) =>
                    c.toUpperCase() === config.circuitId?.toUpperCase()
                )
                if (!hasMatch) return
              }

              try {
                const startAnchor = TowerAnchorService.getAnchor({
                  tower: src,
                  config,
                  role: 'vante',
                  placemarkOverrides,
                  cableSettings,
                  projectAnchors,
                  templateAnchors,
                  localModelUrl,
                  getEffectiveTransform,
                  globalScale: options.globalScale,
                  getTerrainElevation,
                })
                const endAnchor = TowerAnchorService.getAnchor({
                  tower: tgt,
                  config,
                  role: 're',
                  placemarkOverrides,
                  cableSettings,
                  projectAnchors,
                  templateAnchors,
                  localModelUrl,
                  getEffectiveTransform,
                  globalScale: options.globalScale,
                  getTerrainElevation,
                })
                const points = CatenaryCalculator.generateCatenaryPoints(
                  startAnchor,
                  endAnchor,
                  cableSettings.tension,
                  60
                )

                paths.push({
                  path: points.map(p => [p.x, p.y, p.z]),
                  color: config.color,
                  width: config.width,
                  id: `auto-${logicalPairKey}-${config.id}`,
                  towerStartId: src.id,
                  towerEndId: tgt.id,
                  towerStartName: src.name,
                  towerEndName: tgt.name,
                  projectId: tProjId,
                  sourceType: 'auto_generated',
                })
              } catch (err) {
                console.error(
                  `❌ Error generating auto cable for ${logicalPairKey}:`,
                  err
                )
              }
            })
          }
        }
      })
    }

    console.log(
      `✅ [CableLayerService] Total CablePaths generated: ${paths.length}`
    )
    return paths
  },

  getLayers: (
    options: CableGeneratorOptions & {
      selectedTowerId?: string | null
      selectedCableId?: string | null
      onSelect?: (info: any) => void
    }
  ): any[] => {
    const { getTerrainElevation } = options
    const paths = CableLayerService.generateCables(options)

    const cableLayer = new PathLayer({
      id: 'deck-cables-layer',
      data: paths,
      pickable: true,
      getPath: (d: any) => d.path,
      getColor: (d: any) => {
        const isSelected = options.selectedCableId === d.id
        const hexValue = (
          typeof d.color === 'string' ? d.color : '#cbd5e1'
        ).replace('#', '')
        const r = parseInt(hexValue.substring(0, 2), 16) || 203
        const g = parseInt(hexValue.substring(2, 4), 16) || 213
        const b = parseInt(hexValue.substring(4, 6), 16) || 225

        if (isSelected) return [0, 255, 255, 255] // Ciano para seleção
        return [r, g, b, 255]
      },
      getWidth: (d: any) => {
        const isSelected = options.selectedCableId === d.id
        return isSelected ? (d.width || 3) * 2 : d.width || 3
      },
      widthUnits: 'pixels',
      capRounded: true,
      jointRounded: true,
      opacity: options.cableSettings.globalOpacity ?? 1,
      parameters: { depthTest: true },
      onClick: options.onSelect,
      updateTriggers: {
        getColor: [options.selectedCableId],
        getWidth: [options.selectedCableId],
      },
    })

    return [cableLayer]
  },
}
