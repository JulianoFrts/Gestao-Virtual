import { ParserStrategy, ParsingResult } from './ParserStrategy';
import { parse } from 'csv-parse/sync';

export class CsvParser implements ParserStrategy {
  async parse(buffer: Buffer, options?: any): Promise<ParsingResult> {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      ...options,
    });

    return {
      data: records,
      metadata: {
        recordCount: records.length,
      },
    };
  }
}
