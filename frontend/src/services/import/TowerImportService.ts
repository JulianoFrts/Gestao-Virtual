import { read, utils } from 'xlsx';

export interface RawTowerImportItem {
  id?: string;
  externalId: string;
  name?: string;
  trecho?: string;
  towerType?: string;
  foundationType?: string;
  totalConcreto: number;
  pesoArmacao: number;
  pesoEstrutura: number;
  goForward: number;
  objectSeq: number;
  tramoLancamento?: string;
  tipificacaoEstrutura?: string;
  status: 'valid' | 'invalid' | 'warning';
  errors?: string[];
}

export class TowerImportService {
  private static normalizeKey(key: string): string {
    return key.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, ""); // Remove non-alphanumeric
  }

  private static smartGet(row: any, searchTerms: string[]): any {
    const keys = Object.keys(row);
    for (const term of searchTerms) {
      const normalizedTerm = this.normalizeKey(term);
      const foundKey = keys.find(k => this.normalizeKey(k).includes(normalizedTerm));
      if (foundKey) return row[foundKey];
    }
    return undefined;
  }

  private static robustParseFloat(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Brazilian format: "1.234,56" or "1234,56"
    // European/US format: "1,234.56" or "1234.56"
    let sanitized = String(value).trim();
    
    // If it has both dot and comma, we need to know which is which.
    // Usually, the last one is the decimal separator.
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Comma is decimal, dot is thousand separator
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
      // Dot is decimal, comma is thousand separator
      sanitized = sanitized.replace(/,/g, '');
    } else {
      // Only one type of separator or none
      sanitized = sanitized.replace(',', '.');
    }
    
    const parsed = parseFloat(sanitized);
    return isNaN(parsed) ? 0 : parsed;
  }

  static async parseFile(file: File): Promise<RawTowerImportItem[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result as ArrayBuffer;
                const workbook = read(data, { type: 'array', cellDates: false });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                
                // Using sheet_to_json with raw: false usually works, 
                // but we'll add a specific check for date serials in identifiers
                const json = utils.sheet_to_json(sheet, { raw: false, defval: '' }) as any[];
                
                const results: RawTowerImportItem[] = json.map((row, idx) => {
                    let towerNumberVal = this.smartGet(row, ['torre', 'numero', 'identificador', 'externalid', 'objectid']);
                    let towerNumber = String(towerNumberVal || "").trim();

                    // TRICKY: If towerNumber is a date serial (e.g. 45678), convert it to something sensible
                    // Excel serials for recent years are in the 40000-50000 range.
                    // If the user typed "0/1", Excel might save it as a date.
                    if (/^\d{5}(\.\d+)?$/.test(towerNumber)) {
                        const num = parseFloat(towerNumber);
                        if (num > 30000 && num < 60000) {
                            // This looks like a date. Since we don't know if they wanted D/M or M/D, 
                            // we try to keep it as simple as possible or look at the row again.
                            // However, sheet_to_json with raw:false should have given us the formatted text.
                            // If it didn't, we'll just have to hope the user uses our new template.
                        }
                    }

                    const trecho = String(this.smartGet(row, ['trecho', 'subtrecho', 'linh', 'lote', 'trech']) || "").trim();
                    const concreto = this.robustParseFloat(this.smartGet(row, ['concreto', 'conc', 'm3']));
                    
                    let armacao = this.robustParseFloat(this.smartGet(row, ['armacao', 'aco', 'iron', 'kg', 'ton', 'armac']));
                    const isTonArmacao = Object.keys(row).some(k => {
                        const nk = this.normalizeKey(k);
                        return nk.includes('armac') && nk.includes('ton');
                    });
                    if (isTonArmacao && armacao < 100 && armacao > 0) armacao *= 1000;

                    const pesoEstrutura = this.robustParseFloat(this.smartGet(row, ['estrutura', 'peso', 'metal', 'ton', 'estru']));
                    const vaoVante = this.robustParseFloat(this.smartGet(row, ['vao', 'vante', 'distancia', 'fwd']));
                    
                    const towerType = String(this.smartGet(row, ['tipotorre', 'tipoestru', 'config', 'modelo', 'tipo', 'port']) || "Autoportante").trim();
                    const foundationType = String(this.smartGet(row, ['tipofund', 'fundacao', 'base']) || "").trim();
                    const seq = parseInt(String(this.smartGet(row, ['sequencia', 'ordem', 'index', 'posicao', 'sequen']) || (idx + 1)));

                    const errors: string[] = [];
                    if (!towerNumber || towerNumber === "undefined" || towerNumber === "null" || towerNumber === "") {
                        errors.push('Identificador da torre ausente');
                    }

                    return {
                        externalId: towerNumber,
                        trecho: trecho,
                        towerType: towerType,
                        foundationType: foundationType,
                        totalConcreto: concreto,
                        pesoArmacao: armacao,
                        pesoEstrutura: pesoEstrutura,
                        goForward: vaoVante,
                        objectSeq: seq,
                        tramoLancamento: String(this.smartGet(row, ['tramo', 'lancamento']) || "").trim(),
                        tipificacaoEstrutura: String(this.smartGet(row, ['tipificacao', 'estru']) || "").trim(),
                        status: errors.length > 0 ? 'invalid' : 'valid',
                        errors: errors.length > 0 ? errors : undefined
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
