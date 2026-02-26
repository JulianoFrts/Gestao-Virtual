/**
 * *****INICIO*****
 * ** GESTÃO VIRTUAL - SOFTWARE SOLUTIONS - UNIT TEST - 22/02/2026 / 03: 35 /* literal */ **
 * *** QUAL FOI A MELHORIA AO EXECUTAR O TESTE? : Centralização e padronização (Regra de Ouro) no Backend.
 * *** QUAL FOI O MOTIVO DA EXECUÇÃO DO TESTE? : Regularização arquitetural e organização potente do sistema.
 * *** QUAIS AS RECOMENDAÇÕES A SER EXECUTADO CASO OCORRER ALGUM ERRO NO TESTE E PRECISAR SER COLIGIDO: Verificar caminhos de importação e consistência do ambiente de teste Jest/Supertest.
 * *****FIM*****
 */

import { UploadUseCase } from "@/application/services/UploadUseCase";
import { IStorageService } from "@/domain/interfaces/IStorageService";
import { IFileValidator } from "@/domain/interfaces/IFileValidator";
import { UploadMetadata } from "@/domain/entities/UploadMetadata";

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

describe("UploadUseCase", () => {
  let storageService: jest.Mocked<IStorageService>;
  let validator: jest.Mocked<IFileValidator>;
  let sut: UploadUseCase;

  beforeEach(() => {
    storageService = {
      upload: jest.fn().mockResolvedValue("https://storage.com/path/file.png"),
    } as unknown;
    validator = {
      validate: jest.fn(),
    } as unknown;
    sut = new UploadUseCase(storageService, validator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should build correct path and call storage service (removing slashes from torre and dataPostagem)", async () => {
    const file = new File([""], "test.png", { type: "image/png" });
    const metadata: UploadMetadata = {
      empresa: "Empresa A",
      obra: "Obra 1",
      canteiro: "Canteiro X",
      torre: "110/1", // Will become 1101
      atividade: "Fundação",
      dataPostagem: "20/02/2026", // Will become 20022026
      responsavel: "João Silva",
    };

    const result = await sut.execute(file, metadata);

    const expectedFileName = "1101-FUNDAÇÃO-test-uuid-1234.png";
    const expectedPath = `EMPRESA_A/OBRA_1/CANTEIRO_X/RDO/1101/FUNDAÇÃO/20022026/JOÃO_SILVA/${expectedFileName}`;

    expect(validator.validate).toHaveBeenCalledWith(file);
    expect(storageService.upload).toHaveBeenCalledWith(file, expectedPath);
    expect(result).toBe("https://storage.com/path/file.png");
  });

  it("should use NAO_INFORMADO when canteiro is missing and format dashes", async () => {
    const file = new File([""], "test.png", { type: "image/png" });
    const metadata: UploadMetadata = {
      empresa: "Empresa A",
      obra: "Obra 1",
      torre: "T-01",
      atividade: "Fundação",
      dataPostagem: "2024-02-20", // Will become 20240220
      responsavel: "João Silva",
    };

    await sut.execute(file, metadata);

    const expectedFileName = "T01-FUNDAÇÃO-test-uuid-1234.png";
    const expectedPath = `EMPRESA_A/OBRA_1/NAO_INFORMADO/RDO/T01/FUNDAÇÃO/20240220/JOÃO_SILVA/${expectedFileName}`;
    expect(storageService.upload).toHaveBeenCalledWith(file, expectedPath);
  });
});
