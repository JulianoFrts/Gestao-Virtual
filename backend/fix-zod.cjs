const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/v1/daily_reports/route.ts',
  'src/app/api/v1/analytics/production/financial/route.ts',
  'src/app/api/v1/reports/metadata/preview/route.ts',
  'src/app/api/v1/job_functions/route.ts',
  'src/app/api/v1/temporary_permissions/route.ts'
];

const basePath = 'c:\\Users\\Juliano Freitas\\Documents\\GitHub\\Gestao-Virtual\\backend';

files.forEach(file => {
  const fullPath = path.join(basePath, file);
  if (fs.existsSync(fullPath)) {
    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        // Substitui .uuid() por .min(1) de forma global
        const updated = content.replace(/\.uuid\(\)/g, '.min(1)');
        
        if (content !== updated) {
            fs.writeFileSync(fullPath, updated);
            console.log(`✓ Updated: ${file}`);
        } else {
            console.log(`- No changes needed: ${file}`);
        }
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
  } else {
    console.log(`✕ Not found: ${file}`);
  }
});
