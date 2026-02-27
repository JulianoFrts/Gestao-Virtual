export interface Tower {
  id: string
  name: string
  coordinates: {
    lat: number
    lng: number
    altitude?: number
  }
  type?: string
  elementType?: string
  objectSeq?: string | number
  metadata?: Record<string, unknown>
  properties?: Record<string, any>
  displaySettings?: {
    groundElevation?: number
  }
  rotation?: number
  height?: number
  towerHeight?: number
  modelUrl?: string
  towerFunction?: string
  visible?: boolean
  sequence?: string | number
  sequencia?: number
  isLocal?: boolean
  latitude?: number
  longitude?: number
  elevation?: number
  activityStatuses?: Array<{
    activityId: string
    status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'BLOCKED'
    progressPercent: number
    plannedStartDate?: string
    plannedEndDate?: string
    plannedQuantity?: number
    plannedHhh?: number
    activity?: {
      name: string
      weight: number | string
    }
  }>
}

export interface Cable {
  from: Tower
  to: Tower
  path: number[][]
  color: number[]
  phase: string
  width: number
}

export interface Spacer {
  path: number[][]
  color: number[]
  thickness: number
  phaseId: string
}

export interface AnchorPlate {
  polygon: number[][]
}

export interface ImportTower {
  id?: string
  name?: string
  objectId?: string
  coordinates?: Tower['coordinates']
  lat?: number
  lng?: number
  longitude?: number
  altitude?: number
  isHidden?: boolean
}

export interface PhaseConfig {
  id: string
  name: string
  enabled: boolean
  color: [number, number, number] // RGB
  hexColor?: string
  tension: number
  verticalOffset: number
  horizontalOffset: number
  relativeHeight: number
  cableCount?: number
  bundleSpacing?: number
  width?: number
  spacerInterval?: number
  spacerSize?: number
  spacerThickness?: number
  spacerColor?: [number, number, number]
  cableType?: string
  signalSpheresEnabled?: boolean
  signalSphereInterval?: number
  signalSphereSize?: number
  signalSphereColor?: [number, number, number]
}
