export interface IStorageService {
  upload(file: File, path: string): Promise<string>;
}
