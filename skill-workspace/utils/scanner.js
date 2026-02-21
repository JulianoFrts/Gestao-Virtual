import fs from 'fs';
import path from 'path';

/**
 * Utilitário para escanear recursivamente e procurar padrões ou arquivos.
 */
export const scanner = {
  /**
   * Lista todos os arquivos em um diretório recursivamente.
   */
  listFiles: (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        scanner.listFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    });
    return fileList;
  },

  /**
   * Procura por strings/padrões em arquivos.
   */
  grep: (files, patterns) => {
    const results = [];
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      patterns.forEach(pattern => {
        if (content.includes(pattern)) {
          results.push({ file, pattern });
        }
      });
    });
    return results;
  },

  /**
   * Checa se um arquivo exporta algo específico (simplificado).
   */
  checkExports: (file, searchString) => {
    const content = fs.readFileSync(file, 'utf8');
    return content.includes(searchString);
  }
};
