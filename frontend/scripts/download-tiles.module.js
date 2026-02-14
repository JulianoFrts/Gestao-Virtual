import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
// Area to download (e.g., around the specific tower coordinates the user provided)
// Center: Lat -22.65, Lon -43.76 (Swapped based on user input likely being Lat/Lon but they put -43 in Lat)
// Let's use a standard bounding box around the user's apparent area of interest.
// If the user meant Lat -22.65, Lon -43.76 (near Rio de Janeiro state) we use that.
// If they meant Lat -43 (South Ocean), well... let's default to a safe box around the inputs.

const CENTER_LAT = -22.6529;
const CENTER_LON = -43.7689;
const ZOOM_LEVELS = [14, 15, 16]; // Zoom levels to download
const RADIUS_TILES = 2; // Number of tiles around the center to download (grid radius)

const OUTPUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/tiles');

// --- UTILS ---
function latLonToTile(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lon + 180) / 360) * n);
    const y = Math.floor(
        ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    );
    return { x, y, z: zoom };
}

function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function downloadTile(z, x, y) {
    // Using OpenStreetMap standard tile server
    // Note: Respect OSM usage policy. Do not bulk download heavily without permission.
    // This script is for small localized areas (offline cache).
    const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const outputPath = path.join(OUTPUT_DIR, `${z}`, `${x}`, `${y}.png`);

    if (fs.existsSync(outputPath)) {
        console.log(`Skipping (exists): ${z}/${x}/${y}`);
        return Promise.resolve();
    }

    ensureDirectoryExistence(outputPath);

    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'User-Agent': 'TeamOrionOfflineDownloader/1.0' }
        }, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Failed to download ${url}: ${res.statusCode}`);
                // Don't reject, just skip to keep process running
                resolve();
                return;
            }

            const fileStream = fs.createWriteStream(outputPath);
            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded: ${z}/${x}/${y}`);
                resolve();
            });
        }).on('error', (err) => {
            console.error(`Error downloading ${url}: ${err.message}`);
            resolve();
        });
    });
}

// --- MAIN ---
async function main() {
    console.log(`Starting download for area around ${CENTER_LAT}, ${CENTER_LON}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);

    for (const z of ZOOM_LEVELS) {
        const centerTile = latLonToTile(CENTER_LAT, CENTER_LON, z);

        console.log(`Processing Zoom Level ${z}... Center Tile: ${centerTile.x}, ${centerTile.y}`);

        for (let dx = -RADIUS_TILES; dx <= RADIUS_TILES; dx++) {
            for (let dy = -RADIUS_TILES; dy <= RADIUS_TILES; dy++) {
                const x = centerTile.x + dx;
                const y = centerTile.y + dy;

                // Basic delay to be nice to the server
                await new Promise(r => setTimeout(r, 100));
                await downloadTile(z, x, y);
            }
        }
    }
    console.log('Download complete!');
}

main();
