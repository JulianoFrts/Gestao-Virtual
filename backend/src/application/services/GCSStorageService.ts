import { bucket } from "@/infrastructure/gcs/gcs.client";
import { IStorageService } from "@/domain/interfaces/IStorageService";

export class GCSStorageService implements IStorageService {
  async upload(file: File, path: string): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = bucket.file(path);

    await blob.save(buffer, {
      resumable: false,
      contentType: file.type,
    });

    return `/api/v1/storage/gcs?path=${encodeURIComponent(path)}`;
  }
}
