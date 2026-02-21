import fs from 'fs';
import path from 'path';

const publicDir = "c:/Users/Juliano Freitas/Documents/GitHub/Gestao-Virtual/frontend/public";
const filesToDelete = [
    "logo-3d-ultimate.svg",
    "logo-color.svg",
    "logo-detailed.svg",
    "logo-icon.svg",
    "logo-premium.svg",
    "logo-white.svg"
];

filesToDelete.forEach(file => {
    const fullPath = path.join(publicDir, file);
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
            console.log(`Sucesso: Arquivo ${file} removido.`);
        } catch (err) {
            console.error(`Erro ao remover ${file}: ${err.message}`);
        }
    }
});

const scriptsToDelete = [
    "c:/Users/Juliano Freitas/Documents/GitHub/Gestao-Virtual/frontend/copy_icon.ts"
];

scriptsToDelete.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.unlinkSync(file);
            console.log(`Sucesso: Script ${file} removido.`);
        } catch (err) {
            console.error(`Erro ao remover script: ${err.message}`);
        }
    }
});
