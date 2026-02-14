
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KML_PATH = path.join(__dirname, '../public/models/kml/LT-L-TRIO-LGO.kml');
const OUTPUT_PATH = path.join(__dirname, '../spans_extracted.json');

console.log('✅ Iniciando script...');
console.log('📂 Caminho:', KML_PATH);

if (!fs.existsSync(KML_PATH)) {
    console.error('❌ Arquivo não encontrado!');
    process.exit(1);
}

try {
    const kmlContent = fs.readFileSync(KML_PATH, 'utf-8');
    console.log(`📦 Arquivo lido. ${(kmlContent.length / 1024 / 1024).toFixed(2)} MB`);

    // Teste simples de regex
    const styleRegex = /<Style id="([^"]+)">[\s\S]*?<text><!\[CDATA\[([\s\S]*?)\]\]><\/text>/g;

    let stylesCount = 0;
    let match;
    // Loop limitado para teste
    while ((match = styleRegex.exec(kmlContent)) !== null) {
        stylesCount++;
        if (stylesCount % 100 === 0) process.stdout.write('.');
    }
    console.log(`\n✅ Estilos processados: ${stylesCount}`);

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ count: stylesCount }));
    console.log('✅ Arquivo de teste salvo.');
} catch (e) {
    console.error('❌ Erro fatal:', e);
}
