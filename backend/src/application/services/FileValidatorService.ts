import { IFileValidator } from "@/domain/interfaces/IFileValidator";

const allowedExtensions = [
  ".png", ".jpg", ".jpeg", ".svg",
  ".csv", ".xlsx", ".xlsm", ".kmz", ".kml", ".glb"
];

export class FileValidatorService implements IFileValidator {
  validate(file: File): void {
    if (!file) {
      throw new Error("Arquivo não enviado.");
    }

    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      throw new Error("Formato de arquivo não permitido.");
    }
  }
}
