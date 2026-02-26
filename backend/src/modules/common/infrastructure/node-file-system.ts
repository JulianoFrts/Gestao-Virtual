import * as fs from "fs";
import * as path from "path";
import { IFileSystem } from "../domain/file-system.interface";

export class NodeFileSystem implements IFileSystem {
  exists(p: string): boolean {
    return fs.existsSync(p);
  }

  readFile(p: string, encoding: string): string {
    return fs.readFileSync(p, encoding as unknown);
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  cwd(): string {
    return process.cwd();
  }
}
