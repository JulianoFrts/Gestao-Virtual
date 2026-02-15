import { signal, computed } from "@preact/signals-react";
import { db } from "@/integrations/database";
import { orionApi } from "@/integrations/orion/client";
import { storageService } from "@/services/storageService";

export interface Employee {
  id: string;
  fullName: string;
  registrationNumber: string;
  functionId: string | null;
  functionName?: string;
  role: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  photoUrl: string | null;
  isActive: boolean;
  siteId: string | null;
  companyId: string | null;
  projectId: string | null;
  level: number;
  laborType: string;
  professionalLevel: number;
  canLeadTeam?: boolean;
  gender: string | null;
  birthDate: string | null;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  faceDescriptor?: any;
  createdAt: string | Date;
}

// Signals
export const employees = signal<Employee[]>([]);
export const isLoadingEmployees = signal<boolean>(false);
export const employeeFilters = signal<{
  companyId: string;
  projectId: string;
  siteId: string;
  searchTerm: string;
  excludeCorporate: boolean;
  status: string;
  functionId: string;
  biometric: string;
  level: string;
  cpfOrRegistration: string;
}>({
  companyId: "",
  projectId: "",
  siteId: "",
  searchTerm: "",
  excludeCorporate: true,
  status: "all",
  functionId: "all",
  biometric: "all",
  level: "all",
  cpfOrRegistration: "",
});

const hasInitialFetched = signal<boolean>(false);
const previousFilters = signal<string>("");

// Computed
export const filteredEmployees = computed(() => {
  const list = employees.value;
  const {
    companyId,
    projectId,
    siteId,
    searchTerm,
    excludeCorporate,
    status,
    functionId,
    biometric,
    level,
    cpfOrRegistration,
  } = employeeFilters.value;

  return list.filter((e) => {
    const matchesCompany = !companyId || e.companyId === companyId;
    const matchesProject = !projectId || e.projectId === projectId;
    const matchesSite = !siteId || e.siteId === siteId;
    const matchesExcludeCorporate =
      !excludeCorporate || (e as any).excludeCorporate !== false;

    const matchesStatus =
      status === "all" ||
      (status === "active" && e.isActive) ||
      (status === "inactive" && !e.isActive);

    const matchesFunction = functionId === "all" || e.functionId === functionId;

    const matchesBiometric =
      biometric === "all" ||
      (biometric === "with" && e.faceDescriptor) ||
      (biometric === "without" && !e.faceDescriptor);

    const matchesLevel = level === "all" || String(e.level) === level;

    const lowCpfReg = cpfOrRegistration.toLowerCase();
    const matchesCpfReg =
      !cpfOrRegistration ||
      (e.cpf && e.cpf.includes(cpfOrRegistration)) ||
      (e.registrationNumber &&
        e.registrationNumber.toLowerCase().includes(lowCpfReg));

    const lowSearch = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      e.fullName.toLowerCase().includes(lowSearch) ||
      e.email?.toLowerCase().includes(lowSearch) ||
      e.registrationNumber.toLowerCase().includes(lowSearch);

    return (
      matchesCompany &&
      matchesProject &&
      matchesSite &&
      matchesExcludeCorporate &&
      matchesStatus &&
      matchesFunction &&
      matchesBiometric &&
      matchesLevel &&
      matchesCpfReg &&
      matchesSearch
    );
  });
});

// Actions
export const fetchEmployees = async (force = false) => {
  // Cria uma string única para comparar filtros
  const currentFilters = JSON.stringify(employeeFilters.value);
  const filtersChanged = previousFilters.value !== currentFilters;

  if (isLoadingEmployees.value && !force) return;
  if (hasInitialFetched.value && !force && !filtersChanged) return;

  // Verificar se há token antes de fazer requisição para evitar loop de 401
  if (!orionApi.token) {
    const cached = await storageService.getItem<Employee[]>("employees");
    if (cached) employees.value = cached;
    hasInitialFetched.value = true;
    return;
  }

  previousFilters.value = currentFilters;
  isLoadingEmployees.value = true;
  hasInitialFetched.value = true;

  try {
    if (!navigator.onLine) {
      const cached = await storageService.getItem<Employee[]>("employees");
      if (cached) employees.value = cached;
      return;
    }
    const {
      companyId,
      projectId,
      siteId,
      excludeCorporate,
      status,
      functionId,
      searchTerm,
      cpfOrRegistration,
    } = employeeFilters.value;
    // Usando db.from() que já inclui o token de autenticação
    let query = db.from("users").select("*, jobFunction:job_functions(*)");

    // Aplicar filtros via eq()
    query = query.eq("role", "WORKER");
    if (companyId) query = query.eq("companyId", companyId);
    if (projectId) query = query.eq("projectId", projectId);
    if (siteId) query = query.eq("siteId", siteId);
    if (excludeCorporate) query = query.eq("excludeCorporate", "true");
    if (status && status !== "all")
      query = query.eq("status", status === "active" ? "ACTIVE" : "INACTIVE");
    if (functionId && functionId !== "all")
      query = query.eq("functionId", functionId);
    if (searchTerm) query = query.eq("search", searchTerm);
    if (cpfOrRegistration)
      query = query.eq("cpfOrRegistration", cpfOrRegistration);

    const { data, error } = await query;
    if (error) throw error;

    if (data) {
      const mapped: Employee[] = data.map((e) => ({
        id: e.id,
        fullName: e.name || "Sem nome",
        registrationNumber: e.registrationNumber || "",
        functionId: e.functionId,
        functionName: e.jobFunction?.name || "Não definida",
        role: e.role || "WORKER",
        phone: e.phone || null,
        email: e.email || null,
        cpf: e.cpf || null,
        photoUrl: e.image || null,
        isActive: e.status === "ACTIVE",
        siteId: e.siteId || null,
        companyId: e.companyId || null,
        projectId: e.projectId || null,
        level: e.hierarchyLevel || 0,
        laborType: e.laborType || "MOD",
        professionalLevel: e.jobFunction?.hierarchyLevel || 0,
        canLeadTeam: !!e.jobFunction?.canLeadTeam,
        gender: e.gender || null,
        birthDate: e.birthDate || null,
        cep: e.address?.cep || "",
        street: e.address?.street || "",
        number: e.address?.number || "",
        neighborhood: e.address?.neighborhood || "",
        city: e.address?.city || "",
        state: e.address?.stateCode || "",
        faceDescriptor: e.face_descriptor,
        createdAt: e.createdAt,
      }));
      employees.value = mapped;
      await storageService.setItem("employees", mapped);
    }
  } catch (err) {
    console.warn("[EmployeeSignals] Network error, checking local cache...");
    const cached = await storageService.getItem<Employee[]>("employees");
    if (cached) {
      employees.value = cached;
    } else {
      console.error("[EmployeeSignals] Error fetching and no cache available:", err);
    }
  } finally {
    isLoadingEmployees.value = false;
  }
};

export const updateEmployeeFilters = (
  updates: Partial<typeof employeeFilters.value>,
) => {
  employeeFilters.value = { ...employeeFilters.value, ...updates };
};
