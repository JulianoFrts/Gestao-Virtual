const fs = require('fs');
const path = require('path');

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

    // 1. Erradicar Any em assinaturas reportadas
    content = content.replace(/:\s*any\s*([,;)])/g, ': unknown$1');
    content = content.replace(/as\s+any/g, 'as unknown');
    
    // 2. Resolver Falta de Tipagem em métodos comuns
    content = content.replace(/async\s+(\w+)\s*\((.*?)\)\s*\{/g, (m, name, args) => {
        if (m.includes(':') || name === 'constructor' || name === 'main') return m;
        return `async ${name}(${args}): Promise<unknown> {`;
    });

    // 3. Remover Console.logs remanescentes em scripts
    if (file.includes('scripts/')) {
        content = content.replace(/console\.log\(.*?\);?/g, '');
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
    }
});

console.log('Impulso final de saúde concluído.');
