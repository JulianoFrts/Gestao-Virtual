/**
 * Utility to convert UTM coordinates (Universal Transverse Mercator) to LngLat (WGS84).
 * This is a simplified version suitable for most applications.
 */

export function utmToLatLng(east: number, north: number, zone: number, southHemi: boolean) {
    const a = 6378137;
    const f = 1 / 298.257223563;
    const b = a * (1 - f);
    const e = Math.sqrt(1 - (b * b) / (a * a));
    const eip = Math.sqrt((a * a) / (b * b) - 1);

    const drad = Math.PI / 180;
    const k0 = 0.9996;

    const x = east - 500000;
    const y = southHemi ? north - 10000000 : north;

    const esq = e * e;
    const e6 = esq * esq * esq;
    const eipsq = eip * eip;

    const M = y / k0;
    const mu = M / (a * (1 - esq / 4 - 3 * e6 / 64 - 5 * esq * e6 / 256));

    const phi1rad = mu + (3 * eip / 2 - 27 * eipsq * eip / 32) * Math.sin(2 * mu)
        + (21 * eipsq * eipsq / 16 - 55 * eipsq * eipsq * eipsq / 32) * Math.sin(4 * mu)
        + (151 * eipsq * eipsq * eipsq / 96) * Math.sin(6 * mu);

    const N1 = a / Math.sqrt(1 - esq * Math.sin(phi1rad) * Math.sin(phi1rad));
    const T1 = Math.tan(phi1rad) * Math.tan(phi1rad);
    const C1 = eipsq * Math.cos(phi1rad) * Math.cos(phi1rad);
    const R1 = a * (1 - esq) / Math.pow(1 - esq * Math.sin(phi1rad) * Math.sin(phi1rad), 1.5);
    const D = x / (N1 * k0);

    let lat = phi1rad - (N1 * Math.tan(phi1rad) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eipsq) * Math.pow(D, 4) / 24
        + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eipsq - 3 * C1 * C1) * Math.pow(D, 6) / 720);
    lat = lat / drad;

    let lng = (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eipsq + 24 * T1 * T1) * Math.pow(D, 5) / 120) / Math.cos(phi1rad);
    lng = (zone * 6 - 183) + lng / drad;

    return { lat, lng };
}

/**
 * Parses a zone string like "23S", "24L", "22" and returns numeric zone and hemisphere
 */
export function parseUTMZone(zoneStr: string): { zone: number, southHemi: boolean } | null {
    if (!zoneStr) return null;
    const cleanZone = zoneStr.trim().replace(/\s+/g, '');
    const match = cleanZone.match(/^(\d+)([A-Z])?$/i);
    if (!match) return null;

    const zone = parseInt(match[1]);
    const letter = match[2]?.toUpperCase() || 'S'; // Default to South if not specified (common in Brazil)

    // Letters N-X are Northern Hemisphere, C-M are Southern Hemisphere
    // However, in Brazil, 'S' is often used to literally mean South.
    // Standard UTM: N-X is North, C-M is South.
    const southHemi = letter < 'N' || letter === 'S';

    return { zone, southHemi };
}
