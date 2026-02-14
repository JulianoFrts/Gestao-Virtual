export interface MapLocation {
    id: string
    lat: number
    lng: number
    title: string
    description?: string
    category?: string
    icon?: string
    data?: Record<string, unknown>
}

export interface MapConfig {
    center: { lat: number; lng: number }
    zoom: number
    bounds?: [[number, number], [number, number]]
    mapTypeId?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'
    disableDefaultUI?: boolean
}
