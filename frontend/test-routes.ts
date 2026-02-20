import * as fs from 'fs';
import * as path from 'path';

const configData = fs.readFileSync('src/routes/config.tsx', 'utf-8');
const routesMatches = [...configData.matchAll(/path:\s*['"]([^'"]+)['"][\s\S]*?moduleId:\s*['"]([^'"]+)['"]/g)];

const result: Record<string, string[]> = {};
for (const match of routesMatches) {
    const path = match[1];
    const moduleId = match[2];
    if (!result[moduleId]) result[moduleId] = [];
    result[moduleId].push(path);
}

for (const [moduleId, paths] of Object.entries(result)) {
    if (paths.length > 1) {
        console.log(`Module ID '${moduleId}' is shared by routes:`, paths.join(', '));
    }
}
