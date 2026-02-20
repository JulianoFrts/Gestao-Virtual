import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const filePath = 'c:\\Users\\Juliano Freitas\\Documents\\GitHub\\Gestao-Virtual\\LT-L-TRIO-LGO-RD-A4-0044-0A-13.05.24.xlsx';
const outputPath = 'c:\\Users\\Juliano Freitas\\Documents\\GitHub\\Gestao-Virtual\\backend\\scripts\\xlsx_analysis.json';

async function analyze() {
  try {
    const workbook = XLSX.readFile(filePath);
    const summaryFile = 'c:\\Users\\Juliano Freitas\\Documents\\GitHub\\Gestao-Virtual\\backend\\scripts\\rdo_summary.txt';
    let summary = '';

    const sheetsToAnalyze = ['Diario de obra', 'RDO - Efetivo - Equipamento'];
    
    sheetsToAnalyze.forEach(sheetName => {
      summary += `\n\n=== SHEET: ${sheetName} ===\n`;
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        summary += "Not found\n";
        return;
      }
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      json.forEach((row: any, index) => {
        if (Array.isArray(row)) {
          const cells = row.map(c => c === null || c === undefined ? '' : String(c).trim());
          const hasContent = cells.some(c => c !== '');
          if (hasContent) {
            summary += `Row ${index.toString().padStart(3, '0')}: | ${cells.join(' | ')} |\n`;
          }
        }
      });
    });

    fs.writeFileSync(summaryFile, summary);
    console.log(`Summary written to ${summaryFile}`);

  } catch (error) {
    console.error('Error reading Excel file:', error);
  }
}

analyze();
