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
  roles: string[] | null;
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
  roles: ["WORKER"],
});

const hasInitialFetched = signal<boolean>(false);
const previousFilters = signal<string>("");

// Computed
// Computed - backend first, filtering happens at the API level
// We just do a very fast pass for local text search typing if needed, 
// though the backend handles most of it, we keep text match for immediate UI feedback until debounce fires.
export const filteredEmployees = computed(() => {
  const list = employees.value;
  const { searchTerm, cpfOrRegistration } = employeeFilters.value;

  if (!searchTerm && !cpfOrRegistration) return list;

  return list.filter((e) => {
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

    return matchesCpfReg && matchesSearch;
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
      roles,
    } = employeeFilters.value;
    // Usando db.from() que já inclui o token de autenticação
    let query = db.from("users").select("*, jobFunction:job_functions(name, hierarchyLevel, canLeadTeam)");

    // Aplicar filtros via eq() / in()
    if (roles && roles.length > 0) {
      query = query.in("role", roles);
    } else {
      query = query.eq("role", "WORKER"); // Default seguro
    }

    if (companyId) query = query.eq("companyId", companyId);
    if (projectId) {
      query = query.or(`projectId.eq.${projectId},projectId.is.null`);
    }
    if (siteId) {
      query = query.or(`siteId.eq.${siteId},siteId.is.null`);
    }
    if (excludeCorporate) query = query.eq("excludeCorporate", true);

    if (status && status !== "all")
      query = query.eq("status", status === "active" ? "ACTIVE" : "INACTIVE");
    if (functionId && functionId !== "all")
      query = query.eq("functionId", functionId);
    if (searchTerm) query = query.eq("search", searchTerm);
    if (cpfOrRegistration)
      query = query.eq("cpfOrRegistration", cpfOrRegistration);

    const { data, error } = await query.order("name", { ascending: true }).limit(1000);
    if (error) throw error;

    if (data) {
      const mapped: Employee[] = data.map((e) => ({
        id: e.id,
        fullName: e.name || "Sem nome",
        registrationNumber: e.registrationNumber || "",
        functionId: e.functionId,
        functionName: e.jobFunction?.name || "Não definida",
        role: e.authCredential?.role || e.role || "WORKER",
        phone: e.phone || null,
        email: e.authCredential?.email || e.email || null,
        cpf: e.cpf || null,
        photoUrl: e.image || null,
        isActive: (e.authCredential?.status || e.status) === "ACTIVE",
        siteId: e.affiliation?.siteId || e.siteId || null,
        companyId: e.affiliation?.companyId || e.companyId || null,
        projectId: e.affiliation?.projectId || e.projectId || null,
        level: e.hierarchyLevel || 0,
        laborType: e.laborType || "MOD",
        professionalLevel: e.jobFunction?.hierarchyLevel || 0,
        canLeadTeam: !!e.jobFunction?.canLeadTeam,
        gender: e.gender || null,
        birthDate: e.birthDate || null,
        cep: e.address?.cep || "",
        street: e.address?.logradouro || e.address?.street || "",
        number: e.address?.number || "",
        neighborhood: e.address?.bairro || e.address?.neighborhood || "",
        city: e.address?.localidade || e.address?.city || "",
        state: e.address?.uf || e.address?.stateCode || "",
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
