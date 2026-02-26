const fs = require('fs');
const path = require('path');

let fixedFiles = 0;

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(name => {
        const file = path.join(dir, name);
        if (fs.statSync(file).isDirectory()) {
            if (!['node_modules', '.next', 'dist', '.git'].includes(name)) walk(file, callback);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            callback(file);
        }
    });
}

const srcDir = path.join(process.cwd(), 'src');

walk(srcDir, (file) => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Se o arquivo usa this.timeProvider mas não define timeProvider no construtor ou como propriedade
    const usesTimeProvider = content.includes('this.timeProvider');
    const definesTimeProvider = /timeProvider\s*[:=]/.test(content) || /private\s+readonly\s+timeProvider/.test(content);

    if (usesTimeProvider && !definesTimeProvider) {
        // Reverter para chamadas padrão
        content = content.replace(/this\.timeProvider\.now\(\)\.getTime\(\)/g, 'Date.now()');
        content = content.replace(/this\.timeProvider\.now\(\)/g, 'new Date()');
        content = content.replace(/this\.timeProvider\s+\?\s+this\.timeProvider\.now\(\)\s+:\s+this\.timeProvider\.now\(\)/g, 'new Date()');
        content = content.replace(/this\.timeProvider\s+\?\s+this\.timeProvider\.now\(\)\.getTime\(\)\s+:\s+this\.timeProvider\.now\(\)\.getTime\(\)/g, 'Date.now()');
        
        fixedFiles++;
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log(`Sucesso: ${fixedFiles} arquivos corrigidos (Remoção de timeProvider inválido).`);
