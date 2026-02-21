import fs from 'fs';
import path from 'path';

const src = "C:/Users/Juliano Freitas/.gemini/antigravity/brain/21c19f0f-5d58-453c-bb50-450e0b4794d7/gv_3d_cartoon_ultimate_final_fix_1771675442591.png";
const dest = "c:/Users/Juliano Freitas/Documents/GitHub/Gestao-Virtual/frontend/public/logo-hero-pwa.png";

try {
    fs.copyFileSync(src, dest);
    console.log("Success: File copied to " + dest);
} catch (err) {
    console.error("Error: " + err.message);
    process.exit(1);
}
