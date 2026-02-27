import { TowerPhysics } from './tower-physics'
import {
  CableAnchorConfig,
  CableSettings,
  ModelTransform,
} from '../components/map/cable-config-modal'

export interface TowerAnchorOptions {
  tower: any
  config: CableAnchorConfig
  role: 'vante' | 're'
  placemarkOverrides: Record<string, any>
  cableSettings: CableSettings
  projectAnchors: Record<string, any[]>
  templateAnchors: Record<string, any[]>
  localModelUrl: string
  getEffectiveTransform: (
    individual: ModelTransform | undefined,
    url: string
  ) => ModelTransform | undefined
  globalScale?: number
  getTerrainElevation?: (lng: number, lat: number) => number
}

export const TowerAnchorService = {
  getAnchor: (
    options: TowerAnchorOptions
  ): { x: number; y: number; z: number } => {
    const {
      tower,
      config,
      role,
      placemarkOverrides,
      cableSettings,
      projectAnchors,
      templateAnchors,
      localModelUrl,
      getEffectiveTransform,
      globalScale,
      getTerrainElevation,
    } = options

    const t = tower

    // Determinar elevação do terreno (Live Mapbox > Banco de Dados > KMZ)
    const terrainAlt = getTerrainElevation
      ? getTerrainElevation(t.coordinates.lng, t.coordinates.lat)
      : 0
    const finalTerrainBase =
      terrainAlt || t.elevation || t.coordinates?.altitude || 0

    const avgLat = t.coordinates.lat

    // Get individual overrides
    const docId =
      (t as any).document_id ||
      (t as any).projectId ||
      (t as any).project_id ||
      (t.extendedData as any)?.document_id
    const compositeId = `${docId}:::${t.id}`
    const override = placemarkOverrides[compositeId]

    // Get effective model URL
    const towerModelUrl =
      override?.customModelUrl || cableSettings?.customModelUrl || localModelUrl
    const transform = getEffectiveTransform(
      override?.customModelTransform,
      towerModelUrl
    )

    // Calculate effective tower height and scaling
    const baseHeight = override?.height ?? t.towerHeight ?? 30

    // Multiplicador Global de Escala (Sincronizado com Scenegraph)
    const scaleMultiplier = (globalScale ?? 100) / 100
    const scaleZ =
      (transform?.scale?.[2] ?? 1) *
      (transform?.baseHeight ?? 1) *
      scaleMultiplier

    const isParaRaio =
      config.id.toLowerCase().includes('para') ||
      config.id.toLowerCase().includes('opgw')
    const technicalFixHeight = isParaRaio
      ? t.fix_pararaio || t.fixParaRaio
      : t.fix_conductor || t.fixConductor

    const visibleHeight = baseHeight * scaleZ
    let effectiveAnchorZ = config.vRatio * visibleHeight

    if (technicalFixHeight && Number(technicalFixHeight) > 0) {
      effectiveAnchorZ = Number(technicalFixHeight) * scaleMultiplier
    }

    const baseRot =
      (t as any).calculatedHeading ||
      (t as any).heading ||
      (t as any).rotation ||
      0
    const pitch = transform?.rotation?.[0] ?? 0
    const roll = transform?.rotation?.[1] ?? 0
    const rotZ = transform?.rotation?.[2] ?? 0

    const towerPos = { lng: t.coordinates.lng, lat: t.coordinates.lat }

    const isPortico =
      towerModelUrl === 'procedural-portico' ||
      towerModelUrl.includes('PORTICO') ||
      /TRIO|PORTICO/i.test(t.name || '')

    let finalH = config.h

    if (isPortico) {
      effectiveAnchorZ = visibleHeight
      if (isParaRaio) {
        finalH = config.h < 0 ? -8.2 : 8.2
      } else {
        finalH = config.h * 1.4
      }
    }

    const offZ = transform?.offset?.[2] ?? 0

    // SYSTEM_Z_SHIFT agora é 0 para corresponder ao getTranslation
    // do TowerScenegraphService, mantendo a âncora na base solo.
    const SYSTEM_Z_SHIFT = 0

    // 3D ANCHOR LINKAGE: Prioritize exact 3D points
    const projectList = projectAnchors[t.id] || []
    const templateList =
      templateAnchors[t.towerId] || templateAnchors['default'] || []
    const towerAnchors = [...projectList, ...templateList]

    // SCALING FACTOR: Matches TowerScenegraph uses `scale = d.towerHeight * scaleMultiplier`.
    const scaleFactor = visibleHeight

    // Calculate Base Centroid to match TowerScenegraphService shift (using unit model logic)
    const baseAnchors = towerAnchors.filter((a: any) => {
      const name = (a.name || '').toUpperCase()
      return (
        name.includes('BASE') ||
        name.includes('FIXAÇÃO') ||
        name.includes('FIXACAO') ||
        name.includes('PE') ||
        name.includes('PÉ')
      )
    })

    let avgX = 0,
      avgY = 0,
      avgZ = 0
    if (baseAnchors.length > 0) {
      // Anchor units are normalized, so we scale by the physical height multiplier
      avgX =
        baseAnchors.reduce(
          (acc: number, a: any) =>
            acc + (a.position.x ?? a.position[0] ?? 0) * scaleFactor,
          0
        ) / baseAnchors.length
      avgY =
        baseAnchors.reduce(
          (acc: number, a: any) =>
            acc + (a.position.y ?? a.position[1] ?? 0) * scaleFactor,
          0
        ) / baseAnchors.length
      avgZ =
        baseAnchors.reduce(
          (acc: number, a: any) =>
            acc + (a.position.z ?? a.position[2] ?? 0) * scaleFactor,
          0
        ) / baseAnchors.length
    }

    if (towerAnchors.length > 0) {
      const findMatch = (targetRole: string) => {
        const search = targetRole.toUpperCase()
        return towerAnchors.find((a: any) => {
          const anchorName = (a.name || a.label || '').toUpperCase()
          if (config.manualAnchorName) {
            return (
              anchorName === config.manualAnchorName.toUpperCase() &&
              anchorName.includes(search)
            )
          }

          const phaseMatch =
            anchorName.includes(config.id.toUpperCase()) ||
            anchorName.includes(config.label.toUpperCase()) ||
            (config.phase && anchorName.includes(config.phase.toUpperCase()))

          const circuitMatch =
            !config.circuitId ||
            anchorName.includes(config.circuitId.toUpperCase())

          return phaseMatch && anchorName.includes(search) && circuitMatch
        })
      }

      let anchor = findMatch(role)
      if (!anchor && role === 're') anchor = findMatch('VANTE')

      if (!anchor) {
        anchor = towerAnchors.find(
          (a: any) =>
            (a.name || a.label || '').toUpperCase() ===
              config.id.toUpperCase() ||
            (a.name || a.label || '').toUpperCase() ===
              config.label.toUpperCase() ||
            (config.phase &&
              (a.name || a.label || '').toUpperCase() ===
                config.phase.toUpperCase())
        )
      }

      if (anchor) {
        const rawX =
          (anchor.position.x ?? anchor.position[0] ?? 0) * scaleFactor
        const rawY =
          (anchor.position.y ?? anchor.position[1] ?? 0) * scaleFactor
        const rawZ =
          (anchor.position.z ?? anchor.position[2] ?? 0) * scaleFactor

        const ax = rawX - avgX
        const ay = rawY - avgY
        const az = rawZ - avgZ

        const anchorPos = TowerPhysics.calculateAnchorPosition(
          towerPos,
          baseRot,
          ax,
          0,
          0,
          baseHeight,
          cableSettings.towerVerticalOffset,
          finalTerrainBase,
          rotZ,
          ay,
          pitch,
          roll
        )

        const individualOffset = transform?.anchorOverrides?.[config.id]
        const phaseOffset = config.phase
          ? transform?.phaseOverrides?.[config.phase]
          : null

        const manualDx =
          individualOffset?.x ??
          phaseOffset?.x ??
          transform?.anchorGlobalOffset?.x ??
          0
        const manualDy =
          individualOffset?.y ??
          phaseOffset?.y ??
          transform?.anchorGlobalOffset?.y ??
          0
        const manualDz =
          individualOffset?.z ??
          phaseOffset?.z ??
          transform?.anchorGlobalOffset?.z ??
          0

        const effectiveZ = az + offZ + manualDz + SYSTEM_Z_SHIFT

        const mToDegLat = 1 / 111320
        const mToDegLng =
          1 / (111320 * Math.cos((towerPos.lat * Math.PI) / 180))

        const radY = baseRot * (Math.PI / 180)
        const manualDxRot =
          manualDx * Math.cos(radY) + manualDy * Math.sin(radY)
        const manualDyRot =
          manualDy * Math.cos(radY) - manualDx * Math.sin(radY)

        return {
          x: anchorPos.lng + manualDxRot * mToDegLng,
          y: anchorPos.lat + manualDyRot * mToDegLat,
          z: anchorPos.alt + effectiveZ,
        }
      }
    }

    // Fallback to central physics
    const anchorPos = TowerPhysics.calculateAnchorPosition(
      towerPos,
      baseRot,
      finalH,
      config.vRatio,
      config.vOffset || 0,
      baseHeight,
      cableSettings.towerVerticalOffset,
      finalTerrainBase,
      rotZ,
      0,
      pitch,
      roll
    )

    const individualOffset = transform?.anchorOverrides?.[config.id]
    const phaseOffset = config.phase
      ? transform?.phaseOverrides?.[config.phase]
      : null

    const manualDx =
      individualOffset?.x ??
      phaseOffset?.x ??
      transform?.anchorGlobalOffset?.x ??
      0
    const manualDy =
      individualOffset?.y ??
      phaseOffset?.y ??
      transform?.anchorGlobalOffset?.y ??
      0
    const manualDz =
      individualOffset?.z ??
      phaseOffset?.z ??
      transform?.anchorGlobalOffset?.z ??
      0

    const mToDegLat = 1 / 111320
    const mToDegLng = 1 / (111320 * Math.cos((towerPos.lat * Math.PI) / 180))

    const radY_fb = baseRot * (Math.PI / 180)
    const manualDxRot_fb =
      manualDx * Math.cos(radY_fb) + manualDy * Math.sin(radY_fb)
    const manualDyRot_fb =
      manualDy * Math.cos(radY_fb) - manualDx * Math.sin(radY_fb)

    return {
      x: anchorPos.lng + manualDxRot_fb * mToDegLng,
      y: anchorPos.lat + manualDyRot_fb * mToDegLat,
      z: anchorPos.alt + offZ + manualDz + SYSTEM_Z_SHIFT,
    }
  },
}
