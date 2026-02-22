import { read, utils } from 'xlsx';

export interface RawConstructionImportItem {
  towerId: string;
  lat: number;
  lng: number;
  elevacao: number;
  vao: number;
  zona: string;
  pesoEstrutura: number;
  pesoConcreto: number;
  pesoEscavacao: number;
  pesoAco1: number;
  pesoAco2: number;
  pesoAco3: number;
  status: 'valid' | 'invalid' | 'warning';
  errors?: string[];
}

export class ConstructionImportService {
  private static normalizeKey(key: string): string {
    return key.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
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

  static async parseFile(file: File): Promise<RawConstructionImportItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = read(data, { type: 'array', cellDates: false });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = utils.sheet_to_json(sheet, { raw: false, defval: '' }) as any[];

          const results: RawConstructionImportItem[] = json.map((row, idx) => {
            const towerId = String(this.smartGet(row, ['torre', 'id', 'numero', 'identificador']) || "").trim();
            const lat = this.robustParseFloat(this.smartGet(row, ['lat', 'latitude', 'y']));
            const lng = this.robustParseFloat(this.smartGet(row, ['lng', 'long', 'longitude', 'x']));
            const elev = this.robustParseFloat(this.smartGet(row, ['elev', 'alt', 'cota', 'z']));
            const vao = this.robustParseFloat(this.smartGet(row, ['vao', 'dist', 'distancia']));
            const zona = String(this.smartGet(row, ['zona', 'utm', 'fus']) || "").trim();
            
            const pEstrutura = this.robustParseFloat(this.smartGet(row, ['pesoestru', 'estrutura', 'metal']));
            const pConcreto = this.robustParseFloat(this.smartGet(row, ['pesoconc', 'concreto', 'vol']));
            const pEscavacao = this.robustParseFloat(this.smartGet(row, ['escav', 'terra']));
            const pAco1 = this.robustParseFloat(this.smartGet(row, ['aco1', 'ca50', 'armac']));
            const pAco2 = this.robustParseFloat(this.smartGet(row, ['aco2', 'ca60']));
            const pAco3 = this.robustParseFloat(this.smartGet(row, ['aco3', 'ca25']));

            const errors: string[] = [];
            if (!towerId) errors.push('ID da Torre ausente');

            return {
              towerId,
              lat,
              lng,
              elevacao: elev,
              vao,
              zona,
              pesoEstrutura: pEstrutura,
              pesoConcreto: pConcreto,
              pesoEscavacao: pEscavacao,
              pesoAco1: pAco1,
              pesoAco2: pAco2,
              pesoAco3: pAco3,
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
