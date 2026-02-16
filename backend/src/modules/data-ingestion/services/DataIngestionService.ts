import { prisma } from '../../../lib';
import { DataIngestion } from '@prisma/client';
import { ParserStrategy } from '../strategies/ParserStrategy';
import { CsvParser } from '../strategies/CsvParser';
import { ExcelParser } from '../strategies/ExcelParser';
import { TxtParser } from '../strategies/TxtParser';
import { SvgParser } from '../strategies/SvgParser';


interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination: string;
  filename: string;
  path: string;
  stream: NodeJS.ReadableStream;
}

export class DataIngestionService {
  private strategies: { [key: string]: ParserStrategy } = {
    CSV: new CsvParser(),
    EXCEL: new ExcelParser(),
    TXT: new TxtParser(),
    SVG: new SvgParser(),
  };

  async ingestFile(file: MulterFile): Promise<DataIngestion> {
    const fileType = this.detectFileType(file.originalname, file.mimetype);
    const strategy = this.strategies[fileType];

    if (!strategy) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Create record in database
    const ingestionRecord = await prisma.dataIngestion.create({
      data: {
        filename: file.originalname,
        fileType: fileType,
        status: 'PROCESSING',
      },
    });

    try {
      // Parse file content
      const result = await strategy.parse(file.buffer);

      // Update record with success
      return await prisma.dataIngestion.update({
        where: { id: ingestionRecord.id },
        data: {
          status: 'COMPLETED',
          recordsProcessed: result.data.length,
          metadata: result.metadata || {},
        },
      });
    } catch (error: any) {
      // Update record with error
      await prisma.dataIngestion.update({
        where: { id: ingestionRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  private detectFileType(filename: string, mimeType: string): string {
    const extension = filename.split('.').pop()?.toUpperCase();

    if (extension === 'CSV' || mimeType === 'text/csv') return 'CSV';
    if (['XLS', 'XLSX'].includes(extension || '') || mimeType.includes('spreadsheet')) return 'EXCEL';
    if (extension === 'TXT' || mimeType === 'text/plain') return 'TXT';
    if (extension === 'SVG' || mimeType === 'image/svg+xml') return 'SVG';

    return 'UNKNOWN';
  }

  async getAllIngestions() {
    return prisma.dataIngestion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getIngestionById(id: string) {
    return prisma.dataIngestion.findUnique({
      where: { id },
    });
  }
}
