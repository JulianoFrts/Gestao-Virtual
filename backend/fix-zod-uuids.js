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
    let content = fs.readFileSync(fullPath, 'utf8');
    // Substituições comuns de validação
    content = content.replace(/\.uuid\(\)/g, '.min(1)');
    content = content.replace(/\.uuid\(".*?"\)/g, '.min(1)');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated: ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
});
