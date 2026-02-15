import { PrismaUserRepository } from "../infrastructure/prisma-user.repository";
import { PrismaSystemAuditRepository } from "../../audit/infrastructure/prisma-system-audit.repository";
import { UserService } from "./user.service";
import { JobFunctionService } from "@/modules/companies/application/job-function.service";
import { PrismaJobFunctionRepository } from "@/modules/companies/infrastructure/prisma-job-function.repository";

const generateId = () => Math.random().toString(36).substring(2, 15);

export interface ImportEmployeeData {
  fullName: string;
  email?: string;
  phone?: string;
  functionId?: string;
  registrationNumber?: string;
  cpf?: string;
  password?: string;
  companyId: string;
  projectId: string;
  siteId: string;
  level?: number;
  laborType?: string;
}

export interface ImportFunctionData {
  name: string;
  description?: string;
  canLeadTeam?: boolean;
  hierarchyLevel?: number;
  companyId?: string | null;
}

export class ImportService {
  private userService: UserService;
  private jobFunctionService: JobFunctionService;

  constructor() {
    const userRepository = new PrismaUserRepository();
    const auditRepository = new PrismaSystemAuditRepository();
    this.userService = new UserService(userRepository, auditRepository);
    this.jobFunctionService = new JobFunctionService(
      new PrismaJobFunctionRepository(),
    );
  }

  /**
   * Processa um lote de funcionários para importação
   */
  async processEmployeeImport(data: ImportEmployeeData[]) {
    const results = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const employee of data) {
      try {
        // Validações básicas e campos padrão
        const registrationNumber =
          employee.registrationNumber || generateId().slice(0, 8).toUpperCase();
        const password = employee.password || "123456";
        const role = "WORKER"; // Papel padrão para importação de campo

        await this.userService.createUser({
          name: employee.fullName,
          email:
            employee.email ||
            `${registrationNumber.toLowerCase()}@gestaovirtual.com`,
          password: password,
          role: role,
          registrationNumber: registrationNumber,
          cpf: employee.cpf || null,
          phone: employee.phone || null,
          companyId: employee.companyId,
          projectId: employee.projectId,
          siteId: employee.siteId,
          hierarchyLevel: employee.level || 0,
          laborType: employee.laborType || "MOD",
        });

        results.imported++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          employee: employee.fullName || "Desconhecido",
          error: error.message || "Erro desconhecido",
        });
      }
    }

    return results;
  }

  /**
   * Processa um lote de funções para importação
   */
  async processFunctionImport(data: ImportFunctionData[]) {
    const results = {
      total: data.length,
      imported: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const func of data) {
      if (!func.name) continue;
      
      try {
        await this.jobFunctionService.createJobFunction({
          name: func.name.trim(),
          description: func.description || "",
          canLeadTeam: func.canLeadTeam || false,
          hierarchyLevel: func.hierarchyLevel || 0,
          companyId: func.companyId || null,
        });

        results.imported++;
      } catch (error: any) {
        // Se for erro de duplicidade, não contamos como falha crítica, apenas ignoramos
        if (error.message === 'DUPLICATE_NAME') {
          console.log(`[Import] Cargo duplicado ignorado: ${func.name}`);
          continue; 
        }

        results.failed++;
        results.errors.push({
          function: func.name || "Desconhecido",
          error: error.message || "Erro desconhecido",
        });
      }
    }

    return results;
  }
}
