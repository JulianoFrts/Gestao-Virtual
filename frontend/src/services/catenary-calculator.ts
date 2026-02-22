/**
 * Catenary Calculator Service
 * Provides mathematical functions for calculating transmission line cables (catenaries)
 */

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export interface CatenaryResult {
    points: Point3D[];
    sag: number;
    arcLength: number;
    constant: number;
}

export const CatenaryCalculator = {
    /**
     * Calculates the Catenary Constant (C = T / w)
     * @param horizontalTension - Tension (kgf or N)
     * @param weightPerMeter - Weight of cable per meter (kg/m)
     */
    calculateConstant: (horizontalTension: number, weightPerMeter: number): number => {
        if (!weightPerMeter) return 1200; // Fallback to a common value
        return horizontalTension / weightPerMeter;
    },

    /**
     * Calculates the Sag (Flecha) of the cable
     * @param spanL - Horizontal distance between towers (m)
     * @param constantC - Catenary constant (T/w)
     */
    calculateSag: (spanL: number, constantC: number): number => {
        const sag = constantC * (Math.cosh(spanL / (2 * constantC)) - 1)
        // Simplified parabolic approximation for small sags: sag = (L^2) / (8 * C)
        return sag;
    },

    /**
     * Calculates the real length of the cable (Arc Length)
     * @param spanL - Horizontal distance (m)
     * @param constantC - Catenary constant
     */
    calculateArcLength: (spanL: number, constantC: number): number => {
        const arcLength = 2 * constantC * Math.sinh(spanL / (2 * constantC))
        return arcLength;
    },

    /**
     * Generates a set of 3D points representing the catenary curve between two towers
     * Uses the high-precision logic from the engineering SVG profile
     * @param start - Point [lng, lat, height]
     * @param end - Point [lng, lat, height]
     * @param constantC - Catenary constant (T/w)
     * @param subdivisions - Number of points to generate (will be adjusted by LOD)
     */
    generateCatenaryPoints: (
        start: Point3D,
        end: Point3D,
        constantC: number,
        subdivisions: number = 60
    ): Point3D[] => {
        const points: Point3D[] = [];

        // 1. Calculate horizontal distance
        const dx_m = (end.x - start.x) * 111320 * Math.cos(((start.y + end.y) / 2) * Math.PI / 180);
        const dy_m = (end.y - start.y) * 111320;
        const L = Math.sqrt(dx_m * dx_m + dy_m * dy_m);

        if (L === 0) return [start, end];

        // 1.1 Dynamic LOD: Adjust subdivisions based on Span Length (L)
        // Short spans don't need 100 points. Long spans might need more if close.
        // We use a base that scales with distance, capped for performance.
        let dynamicSubdivisions = subdivisions;
        if (L < 50) dynamicSubdivisions = 12;      // Very short (anchors/jumpers)
        else if (L < 150) dynamicSubdivisions = 24; // Short spans
        else if (L > 600) dynamicSubdivisions = 100; // Long spans (need smoothness)

        const finalSubdivisions = Math.min(120, Math.max(8, dynamicSubdivisions));

        // 2. High-precision Catenary Equation for Inclined Spans
        // y(x) = C * cosh((x - x0)/C) + y0
        // We use an approximation that includes the inclined sag effect:
        // Sag(x) = C * (cosh(L/(2C)) - cosh((L - 2x) / (2C))) / cos(theta)

        const h = end.z - start.z;
        const theta = Math.atan2(h, L);
        const cosTheta = Math.cos(theta);

        for (let i = 0; i <= finalSubdivisions; i++) {
            const t = i / finalSubdivisions; // [0, 1]
            const x = t * L;

            // Theoretical catenary sag for point x
            const sagX = (constantC * (Math.cosh(L / (2 * constantC)) - Math.cosh((L - 2 * x) / (2 * constantC)))) / cosTheta;

            // Interpolation
            const pointLng = start.x + t * (end.x - start.x);
            const pointLat = start.y + t * (end.y - start.y);
            const zLinear = start.z + t * (end.z - start.z);

            points.push({
                x: pointLng,
                y: pointLat,
                z: zLinear - sagX // Subtract sag from the chord
            });
        }

        return points;
    },

    /**
     * Calculates the Radius of Curvature at any point x along the span
     * @param x - Distance from vertex (m)
     * @param constantC - Catenary constant (T/w)
     */
    calculateRadius: (x: number, constantC: number): number => {
        // R = C * cosh^2(x/C)
        return constantC * Math.pow(Math.cosh(x / constantC), 2);
    }
};
