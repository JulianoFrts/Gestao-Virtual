import { ParserStrategy, ParsingResult } from './ParserStrategy';

export class TxtParser implements ParserStrategy {
  async parse(buffer: Buffer, options?: any): Promise<ParsingResult> {
    const content = buffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

    // Transform lines into objects with 'content' and 'lineNumber'
    const records = lines.map((line, index) => ({
      lineNumber: index + 1,
      content: line,
    }));

    return {
      data: records,
      metadata: {
        lineCount: lines.length,
      },
    };
  }
}
