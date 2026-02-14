export interface KMLPlacemark {
    id: string
    name: string
    description?: string
    coordinates: {
        lat: number
        lng: number
        altitude?: number
        heading?: number // Rotation in degrees (0-360)
    }
    type: 'point' | 'linestring' | 'polygon'
    path?: { lat: number; lng: number }[] // Para linhas e polígonos
    style?: KMLStyle
    extendedData?: Record<string, string>
}

export interface KMLStyle {
    iconUrl?: string
    iconScale?: number
    lineColor?: string
    lineWidth?: number
    fillColor?: string
    fillOpacity?: number
}

export interface KMLDocument {
    id?: string
    name: string
    description?: string
    visible: boolean
    bounds?: [[number, number], [number, number]]
    placemarks: KMLPlacemark[]
    styles: Record<string, KMLStyle>
}
