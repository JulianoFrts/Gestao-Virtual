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

  static async parseFile(file: File): Promise<RawTowerImportItem[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result as ArrayBuffer;
                const workbook = read(data, { type: 'array', cellDates: false });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                
                const json = utils.sheet_to_json(sheet, { raw: false, defval: '' }) as any[];
                
                const results: RawTowerImportItem[] = json.map((row, idx) => {
                    let towerNumberVal = this.smartGet(row, ['torre', 'numero', 'identificador', 'externalid', 'objectid']);
                    let towerNumber = String(towerNumberVal || "").trim();

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
                    const seqVal = this.smartGet(row, ['sequencia', 'ordem', 'index', 'posicao', 'sequen']);
                    const seq = seqVal !== undefined ? parseInt(String(seqVal)) : (idx + 1);

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
                        objectSeq: isNaN(seq) ? (idx + 1) : seq,
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
