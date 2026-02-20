import { IStorageService } from "@/domain/interfaces/IStorageService";
import { IFileValidator } from "@/domain/interfaces/IFileValidator";
import { UploadMetadata } from "@/domain/entities/UploadMetadata";
import crypto from "crypto";

export class UploadUseCase {
  constructor(
    private storageService: IStorageService,
    private validator: IFileValidator
  ) {}

  async execute(file: File, metadata: UploadMetadata): Promise<string> {
    this.validator.validate(file);

    const safe = (value: string | undefined | null) => {
      if (!value) return "NAO_INFORMADO";
      return value.trim().replace(/\s+/g, "_").toUpperCase();
    };

    const extension = file.name.substring(file.name.lastIndexOf('.'));
    const torreSafe = safe(metadata.torre).replace(/[/|-]/g, "");
    const atividadeSafe = safe(metadata.atividade);
    const uuid = crypto.randomUUID();

    const newFileName = `${torreSafe}-${atividadeSafe}-${uuid}${extension}`;
    const path = this.buildPath(newFileName, metadata);

    return await this.storageService.upload(file, path);
  }

  private buildPath(fileName: string, metadata: UploadMetadata): string {
    const safe = (value: string | undefined | null) => {
      if (!value) return "NAO_INFORMADO";
      return value.trim().replace(/\s+/g, "_").toUpperCase();
    };

    const parts = [
      safe(metadata.empresa),
      safe(metadata.obra),
      safe(metadata.canteiro),
      "RDO",
      safe(metadata.torre).replace(/[/|-]/g, ""), 
      safe(metadata.atividade),
      (metadata.dataPostagem || "").replace(/[/|-]/g, ""), 
      safe(metadata.responsavel),
      fileName // newFileName is passed here
    ];

    // Remove empty parts just in case
    return parts.filter(Boolean).join("/");
  }
}
