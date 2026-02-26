import { UserRepository } from "../domain/user.repository";
import { UserEntity, UpdateUserDTO } from "../domain/user.dto";

export class UserAddressService {
  constructor(private readonly repository: UserRepository) {}

  async processGranularUpdates(
    id: string,
    existing: UserEntity,
    updateData: UpdateUserDTO,
  ): Promise<{
    success: string[];
    failed: { field: string; error: string }[];
  }> {
    const report: {
      success: string[];
      failed: { field: string; error: string }[];
    } = {
      success: [],
      failed: [],
    };

    const fieldsToProcess = Object.keys(updateData) as (keyof UpdateUserDTO)[];

    for (const field of fieldsToProcess) {
      try {
        let value = updateData[field];

        if ((field === "cpf" || field === "phone") && typeof value === "string") {
          value = value.replace(/\D/g, "");
        }

        if (field === "email" && typeof value === "string" && value !== existing.authCredential?.email) {
          const emailExists = await this.repository.findByEmail(value);
          if (emailExists) throw new Error("Email já está sendo usado por outro usuário.");
        }

        await this.repository.update(id, { [field]: value });
        report.success.push(field);
      } catch (error: unknown) {
        const err = error as Error;
        const errorMsg = err.message || "Erro desconhecido";
        report.failed.push({ field, error: errorMsg });

        if (errorMsg.includes("Unique constraint") || errorMsg.includes("P2002") || errorMsg.includes("já está sendo usado")) {
          throw error;
        }
      }
    }

    return report;
  }
}
