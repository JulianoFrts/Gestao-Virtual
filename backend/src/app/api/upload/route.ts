import { NextResponse } from "next/server";
import { UploadUseCase } from "@/application/services/UploadUseCase";
import { GCSStorageService } from "@/application/services/GCSStorageService";
import { FileValidatorService } from "@/application/services/FileValidatorService";
import { UploadMetadata } from "@/domain/entities/UploadMetadata";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Arquivo não enviado." },
        { status: 400 }
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
          { status: 400 }
        );
      }
    }

    const useCase = new UploadUseCase(
      new GCSStorageService(),
      new FileValidatorService()
    );

    const url = await useCase.execute(file, metadata);
    
    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno ao processar upload." },
      { status: 500 }
    );
  }
}
