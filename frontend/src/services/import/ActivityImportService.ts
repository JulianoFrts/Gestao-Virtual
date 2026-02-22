import { read, utils } from 'xlsx';

export interface RawActivityImportItem {
  name: string;
  level: number;
  order: number;
  description?: string;
  parentId?: string;
  towerId?: string;
  status: 'valid' | 'invalid';
  errors?: string[];
}

export class ActivityImportService {
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

  static async parseFile(file: File): Promise<RawActivityImportItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = utils.sheet_to_json(sheet) as any[];

          const results: RawActivityImportItem[] = json.map((row, idx) => {
            const name = String(this.smartGet(row, ['atividades', 'nome', 'titulo', 'item']) || "").trim();
            const level = parseInt(String(this.smartGet(row, ['nivel', 'level', 'camada']) || "1"));
            const order = parseInt(String(this.smartGet(row, ['ordem', 'sequencia', 'posicao']) || idx));
            const desc = String(this.smartGet(row, ['descricao', 'detalhe']) || "").trim();
            const towerId = String(this.smartGet(row, ['torre', 'vinculo']) || "").trim();

            const errors = [];
            if (!name) errors.push('Nome da atividade ausente');

            return {
              name,
              level,
              order,
              description: desc,
              towerId: towerId || undefined,
              status: errors.length > 0 ? 'invalid' : 'valid',
              errors: errors.length > 0 ? errors : undefined
            };
          });
          resolve(results);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
}
