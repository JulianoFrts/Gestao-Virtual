export interface IFileSystem {
  exists(path: string): boolean;
  readFile(path: string, encoding: string): string;
  join(...paths: string[]): string;
  cwd(): string;
}
