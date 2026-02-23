import { read, utils } from 'xlsx';

export interface RawTowerImportItem {
  Sequencia: number;
  Trecho: string;
  NumeroTorre: string;
  TextoTorre: string;
  Tipificacao: string;
  TramoLancamento: number;
  status: 'valid' | 'invalid' | 'warning';
  errors?: string[];
}

export class TowerImportService {
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    let sanitized = String(value).trim();
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      sanitized = sanitized.replace(/,/g, '');
    } else {
      sanitized = sanitized.replace(',', '.');
    }
    
    const parsed = parseFloat(sanitized);
    return isNaN(parsed) ? 0 : parsed;
  }

  private static parseInt64(value: any): number {
    const num = this.parseNumber(value);
    return Math.round(num);
  }

  private static parseText(value: any): string {
    if (value === null || value === undefined) return "";
    
    // Se, por acaso, a biblioteca interpretou como data (ex: 31/1 -> date object)
    if (value instanceof Date && !isNaN(value.getTime())) {
        return `${value.getDate()}/${value.getMonth() + 1}`;
    }

    return String(value).trim();
  }

  static async parseFile(file: File): Promise<RawTowerImportItem[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = e.target?.result as ArrayBuffer;
                // raw: true OBRIGA a biblioteca a ler tudo como texto, impedindo que "1/1" vire uma Data. 
                const workbook = read(data, { type: 'array', raw: true, codepage: 65001 });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                
                // Mapeia usando apenas os cabeçalhos exatos informados com raw: true
                const json = utils.sheet_to_json(sheet, { raw: true, defval: '' }) as any[];
                
                const results: RawTowerImportItem[] = json.map((row, idx) => {
                    const numeroTorre = this.parseText(row['NumeroTorre']);
                    
                    // Log solicitado pelo usuário para verificar o processamento
                    console.log(`[Importação Torres] Linha ${idx + 2} - Raw:`, row['NumeroTorre'], '=> Interpretado:', numeroTorre);

                    const seq = this.parseInt64(row['Sequencia']);
                    return {
                        Sequencia: seq ? seq : (idx + 1),
                        Trecho: this.parseText(row['Trecho']),
                        NumeroTorre: numeroTorre,
                        TextoTorre: this.parseText(row['TextoTorre']),
                        Tipificacao: this.parseText(row['Tipificacao']),
                        TramoLancamento: this.parseInt64(row['TramoLancamento']),
                        status: numeroTorre ? 'valid' : 'invalid',
                        errors: numeroTorre ? undefined : ['Identificador (NumeroTorre) ausente']
                    };
                });

                resolve(results);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
  }
}
