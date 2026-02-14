export const EARTH_RADIUS = 6378137;
export const TILE_SIZE = 256;

// Converts Latitude/Longitude to World Coordinates (Web Mercator meters)
// This centers the world at the given "center" lat/lon to avoid floating point precision issues at large coordinates
export function latLonToWorld(lat: number, lon: number, centerLat: number, centerLon: number) {
    const x = (lon * Math.PI * EARTH_RADIUS) / 180;
    const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * EARTH_RADIUS;

    const centerX = (centerLon * Math.PI * EARTH_RADIUS) / 180;
    const centerY = Math.log(Math.tan(((90 + centerLat) * Math.PI) / 360)) * EARTH_RADIUS;

    // In 3D: X is East-West, Z is North-South (inverted Y for Mercator), Y is Up
    return [x - centerX, 0, -(y - centerY)];
}

// Converts Lat/Lon to Tile Coordinates (XYZ)
export function latLonToTile(lat: number, lon: number, zoom: number) {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    );
    return { x, y, z: zoom };
}

// Get the bounds (Lat/Lon) of a specific Tile
export function tileToLatLonBounds(x: number, y: number, z: number) {
    const n = Math.pow(2, z);
    const lon1 = (x / n) * 360 - 180;
    const lat1_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat1 = (lat1_rad * 180) / Math.PI;

    const lon2 = ((x + 1) / n) * 360 - 180;
    const lat2_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
    const lat2 = (lat2_rad * 180) / Math.PI;

    return {
        minLat: Math.min(lat1, lat2),
        maxLat: Math.max(lat1, lat2),
        minLon: Math.min(lon1, lon2),
        maxLon: Math.max(lon1, lon2)
    };
}
