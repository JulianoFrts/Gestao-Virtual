export interface Tower {
  id: string
  name: string
  coordinates: {
    lat: number
    lng: number
    altitude: number
  }
  type?: string
  elementType?: string
  metadata?: Record<string, unknown>
  properties?: Record<string, any>
  displaySettings?: {
    groundElevation?: number
  }
  rotation?: number
  isLocal?: boolean
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
