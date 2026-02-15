import fs from 'fs';

function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Data from search
const t1 = { lat: -22.6529484, lng: -43.7689477, elev: 98.73, height: 30 };
const t2 = { lat: -22.6527473, lng: -43.7678521, elev: 111.56, height: 30 };

const spanDist = getDist(t1.lat, t1.lng, t2.lat, t2.lng);
const h1 = t1.elev + t1.height;
const h2 = t2.elev + t2.height;

const C = 1200; // Catenary constant
const steps = 50;
let points = [];

for (let i = 0; i <= steps; i++) {
    const xRel = (i / steps) * spanDist;
    const t = (i / steps);
    const baseLine = h1 + (h2 - h1) * t;
    const xFromCenter = xRel - (spanDist / 2);
    const sag = C * (Math.cosh(xFromCenter / C) - Math.cosh(spanDist / (2 * C)));
    points.push({ x: xRel, y: baseLine + sag });
}

const width = 800;
const height = 400;
const padding = 50;
const minX = 0;
const maxX = spanDist;
const minY = Math.min(...points.map(p => p.y)) - 20;
const maxY = Math.max(h1, h2) + 20;

const scaleX = (x) => padding + (x / maxX) * (width - 2 * padding);
const scaleY = (y) => height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);

let pathD = `M ${scaleX(points[0].x)} ${scaleY(points[0].y)}`;
for (let i = 1; i < points.length; i++) {
    pathD += ` L ${scaleX(points[i].x)} ${scaleY(points[i].y)}`;
}

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f172a" />
  <text x="50%" y="30" fill="white" font-family="Arial" font-size="16" text-anchor="middle">Perfil de Catenária de Engenharia</text>
  <text x="50%" y="55" fill="#94a3b8" font-family="Arial" font-size="12" text-anchor="middle">TRIO_C1 para 0/1A | Vão: ${spanDist.toFixed(2)}m</text>
  
  <!-- Linha de Base (Solo Indicativo) -->
  <path d="M ${scaleX(0)} ${scaleY(t1.elev)} L ${scaleX(spanDist)} ${scaleY(t2.elev)}" stroke="#334155" stroke-dasharray="5,5" fill="none" />
  <text x="${scaleX(0)}" y="${scaleY(t1.elev) + 20}" fill="#475569" font-size="10" text-anchor="middle">TRIO_C1 (Elev: ${t1.elev}m)</text>
  <text x="${scaleX(spanDist)}" y="${scaleY(t2.elev) + 20}" fill="#475569" font-size="10" text-anchor="middle">0/1A (Elev: ${t2.elev}m)</text>

  <!-- Estruturas (Torres) -->
  <line x1="${scaleX(0)}" y1="${scaleY(t1.elev)}" x2="${scaleX(0)}" y2="${scaleY(h1)}" stroke="#cbd5e1" stroke-width="4" />
  <line x1="${scaleX(spanDist)}" y1="${scaleY(t2.elev)}" x2="${scaleX(spanDist)}" y2="${scaleY(h2)}" stroke="#cbd5e1" stroke-width="4" />
  
  <!-- Cabo Catenária -->
  <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="3" />
  
  <!-- Pontos de Suspensão -->
  <circle cx="${scaleX(0)}" cy="${scaleY(h1)}" r="5" fill="#f59e0b" />
  <circle cx="${scaleX(spanDist)}" cy="${scaleY(h2)}" r="5" fill="#f59e0b" />

  <!-- Info Sag -->
  <text x="${scaleX(spanDist / 2)}" y="${scaleY(points[Math.floor(steps / 2)].y) + 25}" fill="#f59e0b" font-family="Arial" font-size="11" text-anchor="middle">
    Sag Máximo (C=${C}m)
  </text>
</svg>
`;

fs.writeFileSync('catenaria_trio_c1_01a.svg', svg);
console.log('SVG gerado: catenaria_trio_c1_01a.svg');
