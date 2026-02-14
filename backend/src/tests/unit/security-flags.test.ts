import { 
  getFlagsForRole, 
  hasWildcardAccess, 
  isGodRole, 
  isSystemOwner,
  ROLE_FLAGS,
  GOD_ROLES,
  SYSTEM_OWNERS,
  CAPABILITY_FLAGS 
} from "@/lib/constants/security";

describe("Security Flags System (ROLE_FLAGS)", () => {

  // ===========================================
  // getFlagsForRole
  // ===========================================
  describe("getFlagsForRole", () => {
    it("should return ['*'] for HELPER_SYSTEM", () => {
      const flags = getFlagsForRole("HELPER_SYSTEM");
      expect(flags).toEqual(["*"]);
    });

    it("should return ['*'] for SUPER_ADMIN_GOD", () => {
      const flags = getFlagsForRole("SUPER_ADMIN_GOD");
      expect(flags).toEqual(["*"]);
    });

    it("should be case-insensitive", () => {
      const upper = getFlagsForRole("ADMIN");
      const lower = getFlagsForRole("admin");
      expect(upper).toEqual(lower);
    });

    it("should return empty array for unknown role (fail-safe)", () => {
      const flags = getFlagsForRole("NONEXISTENT_ROLE");
      expect(flags).toEqual([]);
    });

    it("should return empty array for empty string", () => {
      const flags = getFlagsForRole("");
      expect(flags).toEqual([]);
    });

    // --- Diferenciação entre roles do mesmo grupo ---
    it("ADMIN should have companies.manage but NOT db_hub.manage", () => {
      const flags = getFlagsForRole("ADMIN");
      expect(flags).toContain("companies.manage");
      expect(flags).not.toContain("db_hub.manage");
    });

    it("TI_SOFTWARE should have db_hub.manage but NOT companies.manage", () => {
      const flags = getFlagsForRole("TI_SOFTWARE");
      expect(flags).toContain("db_hub.manage");
      expect(flags).not.toContain("companies.manage");
    });

    it("SOCIO_DIRETOR should have both db_hub.manage and companies.manage", () => {
      const flags = getFlagsForRole("SOCIO_DIRETOR");
      expect(flags).toContain("db_hub.manage");
      expect(flags).toContain("companies.manage");
    });

    it("ADMIN should have showAdminMenu but NOT showMaintenance", () => {
      const flags = getFlagsForRole("ADMIN");
      expect(flags).toContain("showAdminMenu");
      expect(flags).not.toContain("showMaintenance");
    });

    it("TI_SOFTWARE should have showAdminMenu AND showMaintenance", () => {
      const flags = getFlagsForRole("TI_SOFTWARE");
      expect(flags).toContain("showAdminMenu");
      expect(flags).toContain("showMaintenance");
    });

    // --- Herança: roles de alto nível incluem flags de baixo nível ---
    it("SOCIO_DIRETOR should include worker-level flags (clock, daily_reports)", () => {
      const flags = getFlagsForRole("SOCIO_DIRETOR");
      expect(flags).toContain("clock");
      expect(flags).toContain("daily_reports");
      expect(flags).toContain("time_records.view");
      expect(flags).toContain("settings.profile");
    });

    it("MANAGER should include worker-level flags", () => {
      const flags = getFlagsForRole("MANAGER");
      expect(flags).toContain("clock");
      expect(flags).toContain("daily_reports");
    });

    // --- Base tier ---
    it("WORKER should have only base flags", () => {
      const flags = getFlagsForRole("WORKER");
      expect(flags).toContain("clock");
      expect(flags).toContain("daily_reports");
      expect(flags).toContain("time_records.view");
      expect(flags).toContain("settings.profile");
      expect(flags).not.toContain("projects.view");
      expect(flags).not.toContain("showAdminMenu");
    });

    it("VIEWER should have no flags", () => {
      const flags = getFlagsForRole("VIEWER");
      expect(flags).toHaveLength(0);
    });

    it("USER should only have settings.profile", () => {
      const flags = getFlagsForRole("USER");
      expect(flags).toContain("settings.profile");
      expect(flags).toHaveLength(1);
    });

    // --- Middle tier differentiation ---
    it("GESTOR_PROJECT should NOT have companies.view", () => {
      const flags = getFlagsForRole("GESTOR_PROJECT");
      expect(flags).not.toContain("companies.view");
      expect(flags).toContain("projects.view");
    });

    it("GESTOR_CANTEIRO should NOT have projects.progress", () => {
      const flags = getFlagsForRole("GESTOR_CANTEIRO");
      expect(flags).not.toContain("projects.progress");
      expect(flags).toContain("sites.view");
    });

    it("SUPERVISOR should NOT have employees.manage", () => {
      const flags = getFlagsForRole("SUPERVISOR");
      expect(flags).not.toContain("employees.manage");
      expect(flags).toContain("team_composition");
    });

    it("TECHNICIAN should have projects.view (extra above OPERATOR)", () => {
      const techFlags = getFlagsForRole("TECHNICIAN");
      const opFlags = getFlagsForRole("OPERATOR");
      expect(techFlags).toContain("projects.view");
      expect(opFlags).not.toContain("projects.view");
    });
  });

  // ===========================================
  // hasWildcardAccess
  // ===========================================
  describe("hasWildcardAccess", () => {
    it("should return true for HELPER_SYSTEM", () => {
      expect(hasWildcardAccess("HELPER_SYSTEM")).toBe(true);
    });

    it("should return true for SUPER_ADMIN_GOD", () => {
      expect(hasWildcardAccess("SUPER_ADMIN_GOD")).toBe(true);
    });

    it("should return false for ADMIN", () => {
      expect(hasWildcardAccess("ADMIN")).toBe(false);
    });

    it("should return false for unknown role", () => {
      expect(hasWildcardAccess("UNKNOWN")).toBe(false);
    });
  });

  // ===========================================
  // isGodRole / isSystemOwner (backward compat)
  // ===========================================
  describe("isGodRole", () => {
    it("should return true for GOD_ROLES", () => {
      expect(isGodRole("HELPER_SYSTEM")).toBe(true);
      expect(isGodRole("SUPER_ADMIN_GOD")).toBe(true);
    });

    it("should return false for non-god roles", () => {
      expect(isGodRole("ADMIN")).toBe(false);
      expect(isGodRole("SOCIO_DIRETOR")).toBe(false);
    });
  });

  describe("isSystemOwner", () => {
    it("should return true for all SYSTEM_OWNERS", () => {
      expect(isSystemOwner("HELPER_SYSTEM")).toBe(true);
      expect(isSystemOwner("SUPER_ADMIN_GOD")).toBe(true);
      expect(isSystemOwner("SOCIO_DIRETOR")).toBe(true);
      expect(isSystemOwner("ADMIN")).toBe(true);
      expect(isSystemOwner("TI_SOFTWARE")).toBe(true);
    });

    it("should return false for non-owners", () => {
      expect(isSystemOwner("MANAGER")).toBe(false);
      expect(isSystemOwner("WORKER")).toBe(false);
    });
  });

  // ===========================================
  // ROLE_FLAGS completeness
  // ===========================================
  describe("ROLE_FLAGS coverage", () => {
    it("should have entries for all standard roles", () => {
      const expectedRoles = [
        "HELPER_SYSTEM", "SUPER_ADMIN_GOD", "SOCIO_DIRETOR",
        "ADMIN", "TI_SOFTWARE", "MODERATOR", "MANAGER",
        "GESTOR_PROJECT", "GESTOR_CANTEIRO", "SUPERVISOR",
        "TECHNICIAN", "OPERATOR", "WORKER", "USER", "VIEWER"
      ];
      expectedRoles.forEach(role => {
        expect(ROLE_FLAGS).toHaveProperty(role);
      });
    });

    it("should not have duplicate flags within any role", () => {
      (Object.entries(ROLE_FLAGS) as [string, readonly string[]][]).forEach(([_role, flags]) => {
        const uniqueFlags = new Set(flags);
        expect(uniqueFlags.size).toBe(flags.length);
      });
    });
  });

  // ===========================================
  // CAPABILITY_FLAGS backward compatibility
  // ===========================================
  describe("CAPABILITY_FLAGS (backward compat)", () => {
    it("should still export GOD, SYSTEM_OWNER, MANAGEMENT, WORKER groups", () => {
      expect(CAPABILITY_FLAGS.GOD).toContain("*");
      expect(CAPABILITY_FLAGS.SYSTEM_OWNER).toContain("users.manage");
      expect(CAPABILITY_FLAGS.MANAGEMENT).toContain("projects.view");
      expect(CAPABILITY_FLAGS.WORKER).toContain("clock");
    });
  });
});
