
export interface ParsingResult {
  data: Record<string, unknown>[];
  metadata?: unknown;
}

export interface ParserStrategy {
  parse(buffer: Buffer, options?: unknown): Promise<ParsingResult>;
}
