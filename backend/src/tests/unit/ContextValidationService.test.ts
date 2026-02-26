import { ContextValidationService, SelectionContext } from "../../modules/auth/application/context-validation.service";
import { prisma } from "@/lib/prisma/client";
import { Role } from "@prisma/client";

// Mock do prisma
jest.mock("@/lib/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    company: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    site: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe("ContextValidationService", () => {
  let service: ContextValidationService;
  const mockPrisma = prisma as jest.Mocked<any>;

  beforeEach(() => {
    service = new ContextValidationService();
    jest.clearAllMocks();
  });

  describe("validateUserContext", () => {
    const userId = "user-123";

    it("should return false if user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUserContext(userId, {});

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Usuário não encontrado.");
    });

    it("should allow access for GLOBAL management roles (e.g., SYSTEM_ADMIN)", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        authCredential: { role: "SYSTEM_ADMIN" as Role },
        affiliation: null,
      });

      const result = await service.validateUserContext(userId, { companyId: "comp-1" });

      expect(result.isValid).toBe(true);
    });

    it("should allow PROJECT_MANAGER within their own company", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        authCredential: { role: "PROJECT_MANAGER" as Role },
        affiliation: { companyId: "comp-1" },
      });

      const context: SelectionContext = { companyId: "comp-1", projectId: "proj-1" };
      const result = await service.validateUserContext(userId, context);

      expect(result.isValid).toBe(true);
    });

    it("should block PROJECT_MANAGER if no projectId is provided", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        authCredential: { role: "PROJECT_MANAGER" as Role },
        affiliation: { companyId: "comp-1" },
      });

      const result = await service.validateUserContext(userId, { companyId: "comp-1" });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Projeto é obrigatório para Gestor de Projeto.");
    });

    it("should block SITE_MANAGER trying to access another project", async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: userId,
          authCredential: { role: "SITE_MANAGER" as Role },
          affiliation: { companyId: "comp-1", projectId: "proj-1" },
        });
  
        const context: SelectionContext = { companyId: "comp-1", projectId: "proj-fake", siteId: "site-1" };
        const result = await service.validateUserContext(userId, context);
  
        expect(result.isValid).toBe(false);
        expect(result.error).toContain("dentro do seu projeto registrado");
      });

    it("should block WORKER without affiliation and log security incident", async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: userId,
          authCredential: { role: "WORKER" as Role },
          affiliation: null,
        });
  
        const result = await service.validateUserContext(userId, {});
  
        expect(result.isValid).toBe(false);
        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                action: "LOGIN_BLOCKED_NO_CONTEXT"
            })
        }));
      });
  });

  describe("getAvailableContextOptions", () => {
    const userId = "user-123";

    it("should return GLOBAL options for search-all management roles", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        authCredential: { role: "SUPER_ADMIN_GOD" as Role },
      });
      mockPrisma.company.findMany.mockResolvedValue([{ id: "c1", name: "Comp 1" }]);
      mockPrisma.project.findMany.mockResolvedValue([{ id: "p1", name: "Proj 1", companyId: "c1" }]);
      mockPrisma.site.findMany.mockResolvedValue([{ id: "s1", name: "Site 1", projectId: "p1" }]);

      const result = await service.getAvailableContextOptions(userId);

      expect(result.type).toBe("GLOBAL");
      expect(result.companies).toHaveLength(1);
      expect(result.projects).toHaveLength(1);
    });

    it("should return FIXED options for WORKERS with affiliation", async () => {
        const aff = { companyId: "c1", projectId: "p1", siteId: "s1" };
        mockPrisma.user.findUnique.mockResolvedValue({
          id: userId,
          authCredential: { role: "WORKER" as Role },
          affiliation: aff,
        });
  
        const result = await service.getAvailableContextOptions(userId);
  
        expect(result.type).toBe("FIXED");
        expect(result.siteId).toBe("s1");
      });
  });
});
