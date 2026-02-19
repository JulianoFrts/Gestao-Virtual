import { NextResponse } from 'next/server';
import { DataIngestionService } from '@/modules/data-ingestion/services/DataIngestionService';
import { Readable } from 'stream';
import { HTTP_STATUS } from '@/lib/constants';

// Helper to convert Web Stream to Node Buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// Since Next.js App Router handles requests differently, we need to parse the FormData manually
// or use a helper if we want to stick to the service logic expecting Multer file.
// We will adapt the service or the route to bridge this gap.

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Construct a mock Multer file object
    const multerFile = {
      fieldname: 'file',
      originalname: file.name,
      encoding: '7bit',
      mimetype: file.type,
      size: file.size,
      buffer: buffer,
      destination: '',
      filename: file.name,
      path: '',
      stream: Readable.from(buffer),
    } as any; // Cast to any to match service expectation or define shared interface

    const service = new DataIngestionService();
    const result = await service.ingestFile(multerFile);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

export async function GET() {
  const service = new DataIngestionService();
  const ingestions = await service.getAllIngestions();
  return NextResponse.json(ingestions);
}
