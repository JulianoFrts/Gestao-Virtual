import { ParserStrategy, ParsingResult } from './ParserStrategy';
import * as xlsx from 'xlsx';

export class ExcelParser implements ParserStrategy {
  async parse(buffer: Buffer, options?: any): Promise<ParsingResult> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const records = xlsx.utils.sheet_to_json(sheet, { ...options });

    return {
      data: records,
      metadata: {
        sheetName,
        recordCount: records.length,
      },
    };
  }
}
