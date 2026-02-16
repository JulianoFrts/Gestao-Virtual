
export interface ParsingResult {
  data: any[];
  metadata?: any;
}

export interface ParserStrategy {
  parse(buffer: Buffer, options?: any): Promise<ParsingResult>;
}
