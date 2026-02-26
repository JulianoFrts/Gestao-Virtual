import { NextResponse } from "next/server";
import { UploadUseCase } from "@/application/services/UploadUseCase";
import { GCSStorageService } from "@/application/services/GCSStorageService";
import { FileValidatorService } from "@/application/services/FileValidatorService";
import { UploadMetadata } from "@/domain/entities/UploadMetadata";
import { HTTP_STATUS } from "@/lib/constants";

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Arquivo não enviado." },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const metadata: UploadMetadata = {
      empresa: formData.get("empresa") as string,
      obra: formData.get("obra") as string,
      canteiro: (formData.get("canteiro") as string) || undefined,
      torre: formData.get("torre") as string,
      atividade: formData.get("atividade") as string,
      dataPostagem: formData.get("dataPostagem") as string,
      responsavel: formData.get("responsavel") as string,
    };

    // Validar se os campos críticos (sem fallback seguro) estão presentes
    const requiredFields: (keyof UploadMetadata)[] = [
      "empresa",
      "obra",
      "dataPostagem",
      "responsavel",
    ];

    for (const field of requiredFields) {
      if (!metadata[field]) {
        return NextResponse.json(
          { success: false, message: `Campo obrigatório ausente: ${field}` },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    const useCase = new UploadUseCase(
      new GCSStorageService(),
      new FileValidatorService()
    );

    const url = await useCase.execute(file, metadata);
    
    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Erro interno ao processar upload." },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
