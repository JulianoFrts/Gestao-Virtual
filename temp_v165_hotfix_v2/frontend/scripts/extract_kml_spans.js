
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KML_PATH = path.join(__dirname, '../public/models/kml/LT-L-TRIO-LGO.kml');
const OUTPUT_JSON_PATH = path.join(__dirname, '../spans_extracted.json');

console.log('✅ Iniciando script de extração v3...');

try {
    const kmlContent = fs.readFileSync(KML_PATH, 'utf-8');

    // 1. Extrair Estilos
    console.log('🔍 Mapeando estilos...');
    const stylesMap = new Map();
    const styleRegex = /<Style id="([^"]+)">[\s\S]*?<text><!\[CDATA\[([\s\S]*?)\]\]><\/text>/g;

    let styleMatch;
    let countStyles = 0;
    while ((styleMatch = styleRegex.exec(kmlContent)) !== null) {
        const id = styleMatch[1];
        const html = styleMatch[2];

        const extract = (label) => {
            const regex = new RegExp(`${label}:\\s*(.*?)(?:<br>|$)`, 'i');
            const m = html.match(regex);
            return m ? m[1].trim() : null;
        };

        const metadata = {
            voltage: extract('Voltage'),
            cableType: extract('Cable')?.replace(/'/g, ''),
            fromStr: extract('From Str.'),
            toStr: extract('To Str.')
        };

        // Sagging
        const saggingMatch = html.match(/Sagging data: (.*)/);
        if (saggingMatch) {
            const sagText = saggingMatch[1];
            const catenaryMatch = sagText.match(/Catenary \(m\) ([\d\.]+)/);
            if (catenaryMatch) metadata.catenary = parseFloat(catenaryMatch[1]);
            // ... outros
        }

        stylesMap.set(id, metadata);
        countStyles++;
    }
    console.log(`🎨 ${countStyles} estilos com metadados mapeados.`);

    // 2. Extrair Placemarks e Coordenadas
    console.log('🔍 Extraindo Placemarks...');

    // Regex simplificado para pegar blocos <Placemark>
    // Vamos usar indexOf para iterar manually, mais confiável com memória
    const placemarkTag = '<Placemark>';
    const endPlacemarkTag = '</Placemark>';

    let startIndex = 0;
    let countSpans = 0;
    const spans = [];

    let missingStyles = new Set();

    while (true) {
        const pStart = kmlContent.indexOf(placemarkTag, startIndex);
        if (pStart === -1) break;

        const pEnd = kmlContent.indexOf(endPlacemarkTag, pStart);
        if (pEnd === -1) break;

        const content = kmlContent.substring(pStart, pEnd + endPlacemarkTag.length);
        startIndex = pEnd + endPlacemarkTag.length;

        // Processar conteudo
        if (!content.includes('<LineString>')) continue;

        const styleUrlMatch = content.match(/<styleUrl>#([^<]+)<\/styleUrl>/);
        const coordinatesMatch = content.match(/<coordinates>([\s\S]*?)<\/coordinates>/);

        if (styleUrlMatch && coordinatesMatch) {
            const styleId = styleUrlMatch[1];
            const metadata = stylesMap.get(styleId);

            if (metadata) {
                const coordsText = coordinatesMatch[1].trim();
                // Pegar apenas p1 e p2 para simplificar JSON
                const pointsStr = coordsText.split(/\s+/);
                const points = pointsStr.map(p => {
                    const parts = p.split(',');
                    return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]), alt: parseFloat(parts[2]) };
                });

                spans.push({
                    spanId: `span-${countSpans}`,
                    ...metadata,
                    coordinates: points,
                    rawStyleId: styleId
                });
                countSpans++;
            } else {
                missingStyles.add(styleId);
            }
        }
    }

    console.log(`\n✅ ${countSpans} vãos extraídos.`);
    if (missingStyles.size > 0) {
        console.log(`⚠️ ${missingStyles.size} estilos referenciados mas não encontrados (possivelmente estilos visuais sem metadados). Ex:`, Array.from(missingStyles).slice(0, 5));
    }

    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(spans, null, 2));
    console.log(`💾 JSON salvo.`);

} catch (e) {
    console.error('❌ Erro:', e);
}
