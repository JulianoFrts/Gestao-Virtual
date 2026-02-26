import { NextResponse } from 'next/server';
import { DataIngestionService } from '@/modules/data-ingestion/services/DataIngestionService';
import { Readable } from 'stream';
import { HTTP_STATUS } from '@/lib/constants';
import { requireAuth } from '@/lib/auth/session';

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAuth();
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
    } as unknown;

    const service = new DataIngestionService();
    const result = await service.ingestFile(multerFile);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Ingestion error:', error);
    const status = error.status || HTTP_STATUS.INTERNAL_ERROR;
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status }
    );
  }
}

export async function GET(): Promise<Response> {
  try {
    await requireAuth();
    const service = new DataIngestionService();
    const ingestions = await service.getAllIngestions();
    return NextResponse.json(ingestions);
  } catch (error: unknown) {
    const status = error.status || HTTP_STATUS.INTERNAL_ERROR;
    return NextResponse.json({ error: error.message }, { status });
  }
}
