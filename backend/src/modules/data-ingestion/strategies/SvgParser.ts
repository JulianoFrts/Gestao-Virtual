import { ParserStrategy, ParsingResult } from './ParserStrategy';
import { parseStringPromise } from 'xml2js';

export class SvgParser implements ParserStrategy {
  async parse(buffer: Buffer, options?: unknown): Promise<ParsingResult> {
    const xmlContent = buffer.toString('utf-8');
    const result = await parseStringPromise(xmlContent);

    // Extract basic metadata often found in SVGs
    const svgRoot = result.svg || {};
    const metadata = {
      width: svgRoot.$.width,
      height: svgRoot.$.height,
      viewBox: svgRoot.$.viewBox,
      xmlns: svgRoot.$.xmlns,
    };

    // Return the parsed object structure
    return {
      data: [result], // SVG structure as a single record/object for now
      metadata: metadata,
    };
  }
}
