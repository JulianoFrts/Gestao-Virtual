/**
 * Tower Physics Service
 * Provides centralized geometric and physical calculations for towers and anchors.
 */

export interface Point2D {
    lng: number;
    lat: number;
}

export interface Point3D extends Point2D {
    alt: number;
}

export const TowerPhysics = {
    /**
     * Calculates the bearing for a tower in a sequence.
     * Returns angle in degrees CW from North (Mapbox style).
     * Methods: 'bisector' (default), 'tangential' (forward only)
     */
    calculateTowerBearing: (index: number, towers: any[], method: 'bisector' | 'tangential' = 'bisector', suffix?: string): number => {
        const d = towers[index];
        if (!d) return 0;

        const getCoord = (t: any): Point2D => {
            if (t.coordinates) return t.coordinates;
            return { lat: t.lat, lng: t.lng };
        };

        // Filter neighbors to only those with the same suffix to avoid A<->B<->C side-by-side interference
        let filteredTowers = towers;
        let filteredIndex = index;

        if (suffix) {
            filteredTowers = towers.filter(t => {
                const name = (t.name || '').toUpperCase();
                return name.endsWith(suffix.toUpperCase());
            });
            filteredIndex = filteredTowers.findIndex(t => t.id === d.id);
        }

        const prev = filteredTowers[filteredIndex - 1];
        const next = filteredTowers[filteredIndex + 1];

        if (prev && next) {
            const pCoord = getCoord(prev);
            const dCoord = getCoord(d);
            const nCoord = getCoord(next);

            const b1 = TowerPhysics.calculateBearing(pCoord, dCoord);
            const b2 = TowerPhysics.calculateBearing(dCoord, nCoord);

            if (method === 'tangential') return b1;

            // Average bearing (bisector)
            let diff = b2 - b1;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;
            return (b1 + diff / 2 + 360) % 360;
        } else if (prev) {
            const pCoord = getCoord(prev);
            const dCoord = getCoord(d);
            return TowerPhysics.calculateBearing(pCoord, dCoord);
        } else if (next) {
            const dCoord = getCoord(d);
            const nCoord = getCoord(next);
            return TowerPhysics.calculateBearing(dCoord, nCoord);
        }

        return (d as any).heading || (d as any).rotation || 0;
    },

    /**
     * Calculates the bearing (heading) from point 1 to point 2 in degrees.
     * @returns Bearing in degrees [0, 360]
     */
    calculateBearing: (start: Point2D, end: Point2D): number => {
        const phi1 = start.lat * Math.PI / 180;
        const phi2 = end.lat * Math.PI / 180;
        const deltaLambda = (end.lng - start.lng) * Math.PI / 180;

        const y = Math.sin(deltaLambda) * Math.cos(phi2);
        const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

        const theta = Math.atan2(y, x);
        return (theta * 180 / Math.PI + 360) % 360;
    },

    /**
     * Calculates the 3D position of an anchor point relative to the tower center and rotation.
     * @param towerPos - Base coordinates of the tower
     * @param bearingDegrees - The calculated bearing/heading of the line at this tower
     * @param hOffset - Horizontal distance from center (X in GLB - positive for right)
     * @param vRatio - Vertical ratio relative to tower height (0 to 1)
     * @param vOffset - Constant vertical offset (meters)
     * @param towerHeight - Visible height of the tower
     * @param towerVerticalOffset - Global offset for ground clamping
     * @param terrainAlt - Actual terrain altitude at this point
     * @param yawOffset - Optional yaw adjustment from the model transform (rotZ)
     * @param lOffset - Longitudinal distance (Y in GLB - positive for forward)
     * @param pitch - Pitch rotation in degrees (rotX)
     * @param roll - Roll rotation in degrees (rotY)
     */
    calculateAnchorPosition: (
        towerPos: Point2D,
        bearingDegrees: number,
        hOffset: number,
        vRatio: number,
        vOffset: number,
        towerHeight: number,
        towerVerticalOffset: number,
        terrainAlt: number,
        yawOffset: number = 0,
        lOffset: number = 0,
        pitch: number = 0,
        roll: number = 0
    ): Point3D => {
        const avgLat = towerPos.lat;
        const mToDegLat = 1 / 111320;
        const mToDegLng = 1 / (111320 * Math.cos(avgLat * Math.PI / 180));

        // Start with local relative coordinates from tower base
        let rX = hOffset;
        let rY = lOffset;
        let rZ = (vRatio * towerHeight) + vOffset;

        // 1. Apply Pitch (Rotation around X axis)
        if (pitch !== 0) {
            const radP = pitch * (Math.PI / 180);
            const ny = rY * Math.cos(radP) - rZ * Math.sin(radP);
            const nz = rY * Math.sin(radP) + rZ * Math.cos(radP);
            rY = ny;
            rZ = nz;
        }

        // 2. Apply Roll (Rotation around Y axis)
        if (roll !== 0) {
            const radR = roll * (Math.PI / 180);
            const nx = rX * Math.cos(radR) + rZ * Math.sin(radR);
            const nz = -rX * Math.sin(radR) + rZ * Math.cos(radR);
            rX = nx;
            rZ = nz;
        }

        // 3. Apply Yaw (Rotation around Z axis)
        // Heading is Clockwise from North.
        // Mapbox model with +90 offset means GLB Y is North at Heading 0.
        const totalYaw = (bearingDegrees + yawOffset) % 360;
        const radY = totalYaw * (Math.PI / 180);

        // Rotation Matrix for Clockwise Heading (East = X, North = Y)
        const dx_meters = (rX * Math.cos(radY)) + (rY * Math.sin(radY));
        const dy_meters = (rY * Math.cos(radY)) - (rX * Math.sin(radY));

        // Em modo interleaved no Mapbox 3D Terrain, a coordenada Z deve ser absoluta (altitude real).
        // Adicionamos a altitude do terreno (terrainAlt) ao cálculo.
        const effectiveZ = rZ + towerVerticalOffset + terrainAlt; 

        return {
            lng: towerPos.lng + (dx_meters * mToDegLng),
            lat: towerPos.lat + (dy_meters * mToDegLat),
            alt: effectiveZ
        };
    }
};
