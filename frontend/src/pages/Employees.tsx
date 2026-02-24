import { useState, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEmployees,
  type Employee as EmployeeProfile,
} from "@/hooks/useEmployees";
import { useSites } from "@/hooks/useSites";
import { useProjects } from "@/hooks/useProjects";
import { useCompanies } from "@/hooks/useCompanies";
import { useJobFunctions } from "@/hooks/useJobFunctions";
import {
  filteredEmployees,
  isLoadingEmployees,
  employeeFilters,
  updateEmployeeFilters,
} from "@/signals/employeeSignals";
import { monitorJob, updateJobState } from "@/signals/jobSignals";
import { orionApi } from "@/integrations/orion/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Access } from "@/components/auth/Access";
import { UserPermission } from "@/hooks/usePermissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  User,
  Phone,
  Mail,
  Briefcase,
  FileUp,
  FileDown,
  Loader2,
  CheckSquare,
  Square,
  XCircle,
  CheckCircle2,
  Scan,
  Fingerprint,
  Hash,
  Building2,
  MapPin,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Lock,
} from "lucide-react";
import { FaceRegistrationDialog } from "@/components/employees/FaceRegistrationDialog";
import { generateId, cn } from "@/lib/utils";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { ProjectEmptyState } from "@/components/shared/ProjectEmptyState";
import { isCorporateRole, canManageEmployee } from "@/utils/permissionHelpers";
import { isProtectedSignal, can, show } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";
import { applyMask, type InputType } from "@/utils/inputValidators";

export default function Employees() {
  useSignals();
  const { profile } = useAuth();
  const isMaintenanceMode = show("showMaintenance");

  // Hooks para ações, mas dados vêm via signals
  const {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    deleteMultipleEmployees,
    bulkUpdateEmployees,
  } = useEmployees();
  const { sites, isLoading: loadingSites } = useSites();
  const { projects, isLoading: loadingProjects } = useProjects();
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const { functions, isLoading: loadingFunctions } = useJobFunctions();
  const { toast } = useToast();

  // Filtros e Dados via Signal
  const filters = employeeFilters.value;
  const employeesList = filteredEmployees.value;
  const loadingEmployees = isLoadingEmployees.value;

  const isLoading =
    loadingEmployees ||
    loadingSites ||
    loadingProjects ||
    loadingFunctions ||
    loadingCompanies;

  const canCreate =
    isProtectedSignal.value || can("employees.create") || show("showAdminMenu");
  const canUpdate =
    isProtectedSignal.value || can("employees.update") || show("showAdminMenu");

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  type SortDirection = "asc" | "desc" | null;
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  // Form State

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeeProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    functionId: "",
    registrationNumber: "",
    cpf: "",
    level: 0,
    laborType: "MOD",
    password: "",
    siteId: "",
    companyId: "",
    projectId: "",
    gender: "",
    birthDate: "",
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const handleInputChange = (
    field: string,
    value: string,
    inputType?: InputType,
  ) => {
    const finalValue = inputType ? applyMask(value, inputType) : value;
    setFormData((prev) => ({ ...prev, [field]: finalValue }));
  };

  const handleCepBlur = async (cepValue: string) => {
    const cep = cepValue.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
        }));
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    }
  };

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState({
    companyId: "",
    projectId: "",
    siteId: "",
  });
  const [isEnqueuing, setIsEnqueuing] = useState(false);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const [faceRegEmployee, setFaceRegEmployee] =
    useState<EmployeeProfile | null>(null);
  const [isFaceRegOpen, setIsFaceRegOpen] = useState(false);

  // Confirmation Modal States
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
    variant: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => { },
    variant: "default",
  });

  // Bulk Edit State
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkField, setBulkField] = useState<string>("");
  const [bulkValue, setBulkValue] = useState<any>(null);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Sorting computed localmente para não poluir o signal global se for específico da view
  const sortedData = useMemo(() => {
    if (!sortBy || !sortDir) return employeesList;

    return [...employeesList].sort((a, b) => {
      const aVal = (a[sortBy as keyof EmployeeProfile] ?? "") as
        | string
        | number;
      const bVal = (b[sortBy as keyof EmployeeProfile] ?? "") as
        | string
        | number;

      if (sortBy === "siteName") {
        const siteA = sites.find((s) => s.id === a.siteId)?.name || "";
        const siteB = sites.find((s) => s.id === b.siteId)?.name || "";
        return sortDir === "asc"
          ? siteA.localeCompare(siteB)
          : siteB.localeCompare(siteA);
      }

      if (sortBy === "level" || sortBy === "professionalLevel") {
        const valA = (sortBy === "level" ? a.level : a.professionalLevel) || 0;
        const valB = (sortBy === "level" ? b.level : b.professionalLevel) || 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      }

      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [employeesList, sortBy, sortDir, sites]);

  // O signal já faz a filtragem, então usamos sortedData que vem de employeesList
  const displayEmployees = sortedData;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelectAll = () => {
    if (selectedIds.length === displayEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayEmployees.map((e) => e.id));
    }
  };
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setConfirmModal({
      open: true,
      title: "Remover Selecionados",
      description: `Tem certeza que deseja remover ${selectedIds.length} funcionários selecionados? Esta ação não pode ser desfeita.`,
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteMultipleEmployees(selectedIds);
        if (result.success) {
          toast({
            title: "Funcionários removidos",
            description: `${selectedIds.length} funcionários foram removidos com sucesso.`,
          });
          setSelectedIds([]);
        }
      },
    });
  };

  const sanitizeCSVValue = (value: string): string => {
    // Remove leading special chars that could trigger formulas (CSV injection prevention)
    return value.replace(/^[=+\-@\t\r]/g, "").trim();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast({
        title: "Formato inválido",
        description: "Apenas arquivos CSV são permitidos",
        variant: "destructive",
      });
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Pre-fill if user has context
    setImportConfig({
      companyId: profile?.companyId || "",
      projectId: "",
      siteId: "",
    });
    setIsImportModalOpen(true);
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!importFile) return;

    if (
      !importConfig.companyId ||
      !importConfig.projectId ||
      !importConfig.siteId
    ) {
      toast({
        title: "Dados Incompletos",
        description:
          "Por favor, selecione a Empresa, Obra e Canteiro de destino.",
        variant: "destructive",
      });
      return;
    }

    setIsEnqueuing(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setIsEnqueuing(false);
        return;
      }

      const lines = content.split("\n").filter((l) => l.trim());
      const startLine = lines[0].toLowerCase().includes("nome") ? 1 : 0;
      const importData: any[] = [];

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        const separator = line.includes(";") ? ";" : ",";
        const parts = line
          .split(separator)
          .map((s) => sanitizeCSVValue(s.replace(/^["']|["']$/g, "")));
        const [fullName, email, phone, funcName, password, cpf, registration] =
          parts;

        if (!fullName) continue;

        const matchedFunc = functions.find(
          (f) => f.name.toLowerCase() === (funcName || "").toLowerCase(),
        );

        importData.push({
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          cpf: cpf || undefined,
          password: password || undefined,
          registrationNumber: registration || undefined,
          functionId: matchedFunc?.id,
          companyId: importConfig.companyId,
          projectId: importConfig.projectId,
          siteId: importConfig.siteId,
          laborType: "MOD",
        });
      }

      try {
        const { data: job, error } = await orionApi.post<{ id: string }>(
          "jobs",
          {
            type: "EMPLOYEE_IMPORT",
            payload: {
              data: importData,
              requestedBy: profile?.id,
              requestedAt: new Date().toISOString(),
            },
          },
        );

        if (error) {
          throw new Error(error.message || "Falha ao enfileirar importação");
        }

        if (!job)
          throw new Error("Falha ao enfileirar importação: Resposta vazia");

        // Inicializar estado do job no sinal
        updateJobState(job.id, job as any);

        toast({
          title: "Importação Iniciada",
          description: "O arquivo está sendo processado em segundo plano.",
        });

        // Iniciar Monitoramento via Signals
        monitorJob(job.id);

        // Fechar modal
        setIsImportModalOpen(false);
        setImportFile(null);
      } catch (error: unknown) {
        toast({
          title: "Erro na importação",
          description:
            error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      } finally {
        setIsEnqueuing(false);
      }
    };

    reader.readAsText(importFile, "UTF-8");
  };

  const downloadTemplate = () => {
    const headers = [
      "Nome Completo",
      "Email",
      "Telefone",
      "Cargo (Ex: Pedreiro)",
      "Senha",
      "CPF",
      "Matricula",
    ];
    const examples = [
      [
        "João da Silva",
        "joao.silva@exemplo.com",
        "11999999999",
        "Pedreiro",
        "123456",
        "12345678901",
        "MAT001",
      ],
      [
        "Maria Oliveira",
        "maria.oliveira@exemplo.com",
        "11888888888",
        "Encarregado",
        "654321",
        "98765432109",
        "MAT002",
      ],
    ];

    const csvContent = [
      headers.join(";"),
      ...examples.map((row) => row.join(";")),
    ].join("\n");

    // Add BOM to support special characters in Excel
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_importacao_funcionarios.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template baixado",
      description:
        "Use este arquivo como base para importar seus funcionários.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const employeeData = {
      fullName: formData.fullName,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      cpf: formData.cpf || undefined,
      functionId: formData.functionId || undefined,
      siteId: formData.siteId || undefined,
      companyId: formData.companyId || undefined,
      projectId: formData.projectId || undefined,
      laborType: formData.laborType || undefined,
      status: undefined,
    };
    try {
      if (editingEmployee) {
        setIsSaving(true);
        toast({
          title: "Enviando...",
          description: "Aguarde enquanto processamos sua solicitação.",
        });
        const result = await updateEmployee(editingEmployee.id, employeeData);
        if (result.success) {
          toast({ title: "Funcionário atualizado!" });
          e.currentTarget;
        }
        setIsSaving(false);
      }
    } catch (error) {
      console.error("Erro ao atualizar funcionário:", error);
      toast({
        title: "Erro ao atualizar funcionário",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (EmployeeProfile: EmployeeProfile) => {
    setConfirmModal({
      open: true,
      title: "Remover Funcionário",
      description: `Tem certeza que deseja remover "${EmployeeProfile.fullName}"? Esta ação não pode ser desfeita.`,
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteEmployee(EmployeeProfile.id);
        if (result.success) {
          toast({ title: "Funcionário removido" });
        }
      },
    });
  };

  const toggleActive = async (EmployeeProfile: EmployeeProfile) => {
    await updateEmployee(EmployeeProfile.id, {
      isActive: !EmployeeProfile.isActive,
    });
    toast({
      title: EmployeeProfile.isActive
        ? "Funcionário desativado"
        : "Funcionário ativado",
    });
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      functionId: "",
      registrationNumber: "",
      cpf: "",
      password: "",
      siteId: "",
      companyId: "",
      projectId: "",
      level: 0,
      laborType: "MOD",
      gender: "",
      birthDate: "",
      cep: "",
      street: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
    });
    setEditingEmployee(null);
    setIsDialogOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = (EmployeeProfile: EmployeeProfile) => {
    const site = sites.find((s) => s.id === EmployeeProfile.siteId);
    const project = projects.find((p) => p.id === site?.projectId);

    setEditingEmployee(EmployeeProfile);
    setFormData({
      fullName: EmployeeProfile.fullName,
      email: EmployeeProfile.email || "",
      phone: EmployeeProfile.phone || "",
      functionId: EmployeeProfile.functionId || "",
      registrationNumber: EmployeeProfile.registrationNumber,
      cpf: EmployeeProfile.cpf || "",
      password: "",
      siteId: EmployeeProfile.siteId || "",
      companyId: EmployeeProfile.companyId || project?.companyId || "",
      projectId: site?.projectId || "",
      level: EmployeeProfile.level || 0,
      laborType: EmployeeProfile.laborType || "MOD",
      gender: (EmployeeProfile as any).gender || "",
      birthDate: (EmployeeProfile as any).birthDate || "",
      cep: EmployeeProfile.cep || "",
      street: EmployeeProfile.street || "",
      number: EmployeeProfile.number || "",
      neighborhood: EmployeeProfile.neighborhood || "",
      city: EmployeeProfile.city || "",
      state: EmployeeProfile.state || "",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in view-adaptive-container py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-2">
          {canUpdate && (
            <>
              <Access auth="employees.edit" mode="lock">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="hidden sm:flex"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Importar CSV
                </Button>
              </Access>
              <Access auth="employees.view" mode="lock">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="hidden sm:flex"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Baixar Template
                </Button>
              </Access>
              <Dialog
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
              >
                <DialogContent className="max-w-md bg-card/95 border-border/50 backdrop-blur-xl shadow-premium">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileUp className="w-5 h-5 text-primary" /> Importar CSV
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Configure onde os funcionários importados serão alocados.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="p-3 bg-muted/20 rounded-md border border-border/20">
                      <p className="text-sm font-medium text-foreground pb-1">
                        Arquivo Selecionado:
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileUp className="w-3 h-3" />{" "}
                        {importFile?.name || "Nenhum arquivo"}
                      </p>
                    </div>

                    {isCorporateRole(profile?.role) && (
                      <div className="space-y-2">
                        <Label>Empresa Destino</Label>
                        <Select
                          value={importConfig.companyId}
                          onValueChange={(val) =>
                            setImportConfig({
                              ...importConfig,
                              companyId: val,
                              projectId: "",
                              siteId: "",
                            })
                          }
                        >
                          <SelectTrigger className="industrial-input">
                            <SelectValue placeholder="Selecione a empresa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>
                        Obra Destino <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={importConfig.projectId}
                        onValueChange={(val) =>
                          setImportConfig({
                            ...importConfig,
                            projectId: val,
                            siteId: "",
                          })
                        }
                        disabled={!importConfig.companyId}
                      >
                        <SelectTrigger className="industrial-input">
                          <SelectValue placeholder="Selecione a obra..." />
                        </SelectTrigger>
                        <SelectContent>
                          {projects
                            .filter(
                              (p) => p.companyId === importConfig.companyId,
                            )
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Canteiro Destino <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={importConfig.siteId}
                        onValueChange={(val) =>
                          setImportConfig({ ...importConfig, siteId: val })
                        }
                        disabled={!importConfig.projectId}
                      >
                        <SelectTrigger className="industrial-input">
                          <SelectValue placeholder="Selecione o canteiro..." />
                        </SelectTrigger>
                        <SelectContent>
                          {sites
                            .filter(
                              (s) => s.projectId === importConfig.projectId,
                            )
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button
                      variant="ghost"
                      onClick={() => setIsImportModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="gradient-primary"
                      disabled={
                        isEnqueuing ||
                        !importConfig.projectId ||
                        !importConfig.siteId
                      }
                      onClick={handleConfirmImport}
                    >
                      {isEnqueuing ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs text-primary animate-pulse">
                            Solicitando...
                          </span>
                        </div>
                      ) : (
                        "Confirmar Importação"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {canCreate && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                if (!open) resetForm();
                setIsDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Access auth="employees.edit" mode="lock">
                  <Button className="gradient-primary text-white shadow-glow">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Funcionário
                  </Button>
                </Access>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-card/95 border-border/50 backdrop-blur-xl text-foreground max-h-[90vh] overflow-y-auto shadow-premium">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                      <User className="text-white w-6 h-6" />
                    </div>
                    {editingEmployee ? "Editar Usuário" : "Novo Usuário"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground pt-1">
                    {editingEmployee
                      ? `Edite todas as informações do usuário ${editingEmployee.fullName}.`
                      : "Preencha as informações para criar um novo usuário no sistema."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue="identification"
                    className="w-full space-y-2"
                  >
                    {/* IDENTIFICAÇÃO */}
                    <AccordionItem
                      value="identification"
                      className="border-none"
                    >
                      <AccordionTrigger className="hover:no-underline py-2 px-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-primary/5 data-[state=open]:border-primary/20 group text-[10px] uppercase font-black tracking-widest">
                        <div className="flex items-center gap-2 text-primary">
                          <User className="w-4 h-4" />
                          IDENTIFICAÇÃO
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="bg-card/40 border-x border-b border-border/50 rounded-b-lg px-4 py-6 -mt-px space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Nome Completo *
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                placeholder="Nome do colaborador"
                                className="industrial-input"
                                value={formData.fullName}
                                onChange={(e) =>
                                  handleInputChange("fullName", e.target.value)
                                }
                                required
                              />
                            </Access>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                                Matrícula
                              </Label>
                              <Access auth="employees.edit" mode="read-only">
                                <Input
                                  placeholder="00000"
                                  className="industrial-input"
                                  value={formData.registrationNumber}
                                  onChange={(e) =>
                                    handleInputChange(
                                      "registrationNumber",
                                      e.target.value,
                                      "registration",
                                    )
                                  }
                                />
                              </Access>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                                Email
                              </Label>
                              <Access auth="employees.edit" mode="read-only">
                                <Input
                                  type="email"
                                  placeholder="email@exemplo.com"
                                  className="industrial-input"
                                  value={formData.email}
                                  onChange={(e) =>
                                    handleInputChange("email", e.target.value)
                                  }
                                />
                              </Access>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* ACESSO & SEGURANÇA */}
                    <AccordionItem value="security" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-amber-500/5 data-[state=open]:border-amber-500/20 group text-[10px] uppercase font-black tracking-widest">
                        <div className="flex items-center gap-2 text-amber-500">
                          <Lock className="w-4 h-4" />
                          ACESSO & SEGURANÇA
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="bg-card/40 border-x border-b border-border/50 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Senha de Acesso
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                type="password"
                                placeholder="Clique para definir"
                                className="industrial-input center-text"
                                value={formData.password}
                                onChange={(e) =>
                                  handleInputChange("password", e.target.value)
                                }
                                autoComplete="new-password"
                              />
                            </Access>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Cargo / Função *
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Select
                                value={formData.functionId}
                                onValueChange={(val) => {
                                  const selectedFunc = functions.find(
                                    (f) => f.id === val,
                                  );
                                  setFormData({
                                    ...formData,
                                    functionId: val,
                                    level:
                                      selectedFunc?.hierarchyLevel ||
                                      formData.level,
                                  });
                                }}
                              >
                                <SelectTrigger className="industrial-input">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-border/50">
                                  {functions.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                      {f.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Access>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* AFILIAÇÃO & CONTEXTO */}
                    <AccordionItem value="context" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-sky-500/5 data-[state=open]:border-sky-500/20 group text-[10px] uppercase font-black tracking-widest">
                        <div className="flex items-center gap-2 text-sky-500">
                          <Building2 className="w-4 h-4" />
                          AFILIAÇÃO & CONTEXTO
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="bg-card/40 border-x border-b border-border/50 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                        {isCorporateRole(profile?.role) && (
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Empresa Afiliada *
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Select
                                value={formData.companyId}
                                onValueChange={(v) =>
                                  setFormData({
                                    ...formData,
                                    companyId: v,
                                    projectId: undefined,
                                    siteId: undefined,
                                  })
                                }
                              >
                                <SelectTrigger className="industrial-input">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-border/50">
                                  {companies.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Access>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Obra Vinculada *
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Select
                                value={formData.projectId}
                                onValueChange={(v) =>
                                  setFormData({
                                    ...formData,
                                    projectId: v,
                                    siteId: "",
                                  })
                                }
                                disabled={
                                  !formData.companyId &&
                                  isCorporateRole(profile?.role)
                                }
                              >
                                <SelectTrigger className="industrial-input">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-border/50">
                                  {projects
                                    .filter(
                                      (p) =>
                                        !formData.companyId ||
                                        p.companyId === formData.companyId,
                                    )
                                    .map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </Access>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Canteiro / Unidade *
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Select
                                value={formData.siteId}
                                onValueChange={(v) =>
                                  setFormData({ ...formData, siteId: v })
                                }
                                disabled={!formData.projectId}
                              >
                                <SelectTrigger className="industrial-input">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-border/50">
                                  {sites
                                    .filter(
                                      (s) => s.projectId === formData.projectId,
                                    )
                                    .map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </Access>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Tipo de Mão de Obra
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Select
                                value={formData.laborType}
                                onValueChange={(val) =>
                                  setFormData({ ...formData, laborType: val })
                                }
                              >
                                <SelectTrigger className="industrial-input">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10">
                                  <SelectItem value="MOD">
                                    Mão de Obra Direta
                                  </SelectItem>
                                  <SelectItem value="MOI">
                                    Mão de Obra Indireta
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </Access>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Nível Individual
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                type="number"
                                value={formData.level}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    level: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="industrial-input"
                              />
                            </Access>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* DADOS PESSOAIS & ENDEREÇO */}
                    <AccordionItem value="personal" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-2 px-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-emerald-500/5 data-[state=open]:border-emerald-500/20 group text-[10px] uppercase font-black tracking-widest">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <ShieldCheck className="w-4 h-4" />
                          DADOS PESSOAIS & ENDEREÇO
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="bg-card/40 border-x border-b border-border/50 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              CPF
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                placeholder="000.000.000-00"
                                className="industrial-input"
                                value={formData.cpf}
                                onChange={(e) =>
                                  handleInputChange("cpf", e.target.value, "cpf")
                                }
                                required
                              />
                            </Access>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Data Nasc.
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                placeholder="DD/MM/AAAA"
                                className="industrial-input"
                                value={formData.birthDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "birthDate",
                                    e.target.value,
                                    "date",
                                  )
                                }
                              />
                            </Access>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                            Telefone / Celular
                          </Label>
                          <Access auth="employees.edit" mode="read-only">
                            <Input
                              placeholder="(00) 00000-0000"
                              className="industrial-input"
                              value={formData.phone}
                              onChange={(e) =>
                                handleInputChange(
                                  "phone",
                                  e.target.value,
                                  "phone",
                                )
                              }
                            />
                          </Access>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              CEP
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                placeholder="00000-000"
                                className="industrial-input"
                                value={formData.cep}
                                onChange={(e) =>
                                  handleInputChange("cep", e.target.value, "cep")
                                }
                                onBlur={(e) => handleCepBlur(e.target.value)}
                              />
                            </Access>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Rua / Logradouro
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                placeholder="Nome da rua"
                                className="industrial-input"
                                value={formData.street}
                                onChange={(e) =>
                                  handleInputChange("street", e.target.value)
                                }
                              />
                            </Access>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Número
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                placeholder="123"
                                className="industrial-input"
                                value={formData.number}
                                onChange={(e) =>
                                  handleInputChange("number", e.target.value)
                                }
                              />
                            </Access>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Bairro
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                placeholder="Nome do bairro"
                                className="industrial-input"
                                value={formData.neighborhood}
                                onChange={(e) =>
                                  handleInputChange(
                                    "neighborhood",
                                    e.target.value,
                                  )
                                }
                              />
                            </Access>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              Cidade
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                className="industrial-input"
                                value={formData.city}
                                onChange={(e) =>
                                  handleInputChange("city", e.target.value)
                                }
                              />
                            </Access>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                              UF
                            </Label>
                            <Access auth="employees.edit" mode="read-only">
                              <Input
                                className="industrial-input uppercase"
                                value={formData.state}
                                onChange={(e) =>
                                  handleInputChange("state", e.target.value)
                                }
                                maxLength={2}
                              />
                            </Access>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                            Gênero
                          </Label>
                          <Access auth="employees.edit" mode="read-only">
                            <Select
                              value={formData.gender}
                              onValueChange={(v) =>
                                setFormData({ ...formData, gender: v })
                              }
                            >
                              <SelectTrigger className="industrial-input">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent className="glass-card border-white/10">
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Feminino</SelectItem>
                                <SelectItem value="O">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                          </Access>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button type="button" variant="ghost" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Access auth="employees.edit" mode="lock">
                      <Button
                        type="submit"
                        className="gradient-primary text-white shadow-glow"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        {editingEmployee
                          ? "Salvar Alterações"
                          : "Cadastrar novo Colaborador"}
                      </Button>
                    </Access>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="filter-header">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Select
            value={filters.functionId}
            onValueChange={(val) => updateEmployeeFilters({ functionId: val })}
          >
            <SelectTrigger className="bg-muted/20 border-border/30 h-9">
              <SelectValue placeholder="📋 Todas as funções" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {functions.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(val) => updateEmployeeFilters({ status: val })}
          >
            <SelectTrigger className="bg-muted/20 border-border/30 h-9">
              <SelectValue placeholder="✓ Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Apenas Ativos</SelectItem>
              <SelectItem value="inactive">Apenas Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.projectId}
            onValueChange={(val) =>
              updateEmployeeFilters({ projectId: val, siteId: "all" })
            }
          >
            <SelectTrigger className="bg-muted/20 border-border/30 h-9">
              <SelectValue placeholder="🏗️ Todas as obras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as obras</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.siteId}
            onValueChange={(val) => {
              const site = sites.find((s) => s.id === val);
              if (site && site.projectId !== filters.projectId) {
                updateEmployeeFilters({
                  siteId: val,
                  projectId: site.projectId,
                });
              } else {
                updateEmployeeFilters({ siteId: val });
              }
            }}
          >
            <SelectTrigger className="bg-muted/20 border-border/30 h-9">
              <SelectValue placeholder="🚧 Todos os canteiros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canteiros</SelectItem>
              {sites
                .filter(
                  (s) =>
                    filters.projectId === "all" ||
                    s.projectId === filters.projectId,
                )
                .map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="🔍 Nome ou email..."
            className="bg-muted/20 border-border/30 h-9"
            value={filters.searchTerm || ""}
            onChange={(e) =>
              updateEmployeeFilters({ searchTerm: e.target.value })
            }
          />

          <Input
            placeholder="💳 CPF ou Matrícula..."
            className="bg-muted/20 border-border/30 h-9"
            value={filters.cpfOrRegistration || ""}
            onChange={(e) =>
              updateEmployeeFilters({ cpfOrRegistration: e.target.value })
            }
          />

          <Select
            value={filters.biometric}
            onValueChange={(val) => updateEmployeeFilters({ biometric: val })}
          >
            <SelectTrigger className="bg-muted/20 border-border/30 h-9">
              <SelectValue placeholder="🔐 Biometria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="with">Com Biometria</SelectItem>
              <SelectItem value="without">Sem Biometria</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.level}
            onValueChange={(val) => updateEmployeeFilters({ level: val })}
          >
            <SelectTrigger className="bg-muted/20 border-border/30 h-9">
              <SelectValue placeholder="📊 Todos os Níveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Níveis</SelectItem>
              {[...Array(11)].map((_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  Nível {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className={cn(
                "border-border/30 hover:bg-muted/50",
                selectedIds.length > 0 &&
                "border-primary/50 text-primary bg-primary/5",
              )}
              onClick={handleSelectAll}
            >
              {selectedIds.length === displayEmployees.length &&
                displayEmployees.length > 0 ? (
                <XCircle className="w-4 h-4 mr-2" />
              ) : (
                <CheckSquare className="w-4 h-4 mr-2" />
              )}
              {selectedIds.length === displayEmployees.length &&
                displayEmployees.length > 0
                ? "Desmarcar Todos"
                : "Selecionar Tudo"}
            </Button>

            {selectedIds.length > 0 && (
              <Access auth="employees.delete" mode="lock">
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  className="shadow-glow-red"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover ({selectedIds.length})
                </Button>
              </Access>
            )}

            {selectedIds.length > 0 && canUpdate && (
              <Access auth="employees.edit" mode="lock">
                <Button
                  variant="outline"
                  className="border-primary/50 text-primary bg-primary/5 hover:bg-primary/10"
                  onClick={() => {
                    setBulkField("");
                    setBulkValue(null);
                    setIsBulkDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar ({selectedIds.length})
                </Button>
              </Access>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              updateEmployeeFilters({
                searchTerm: "",
                cpfOrRegistration: "",
                biometric: "all",
                functionId: "all",
                status: "all",
                projectId: "all",
                siteId: "all",
                level: "all",
              });
              setSelectedIds([]);
            }}
            className="hover:bg-muted/20"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="table-header">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[50px]">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSelectAll}
                    className="h-8 w-8"
                  >
                    {selectedIds.length === displayEmployees.length &&
                      displayEmployees.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </Button>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("professionalLevel")}
                  className="cursor-pointer select-none text-center"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Nível Prof.
                    {sortBy === "professionalLevel" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("level")}
                  className="cursor-pointer select-none text-center"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Nível Ind.
                    {sortBy === "level" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("fullName")}
                  className="cursor-pointer select-none text-center"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Funcionário
                    {sortBy === "fullName" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("functionName")}
                  className="cursor-pointer select-none text-center"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Função
                    {sortBy === "functionName" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("laborType")}
                  className="cursor-pointer select-none text-center"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Mão de Obra
                    {sortBy === "laborType" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort("email")}
                  className="cursor-pointer select-none text-center"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Contato
                    {sortBy === "email" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>

                <TableHead
                  onClick={() => handleSort("isActive")}
                  className="cursor-pointer select-none text-center align-middle"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Status
                    {sortBy === "isActive" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("siteName")}
                  className="cursor-pointer select-none text-center"
                >
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                    Canteiro / Obra
                    {sortBy === "siteName" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-4 h-4 opacity-75" />
                      ) : (
                        <ArrowDown className="w-4 h-4 opacity-75" />
                      ))}
                  </div>
                </TableHead>
                <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow
                      key={`skeleton-${i}`}
                      className="animate-pulse border-border/10"
                    >
                      <TableCell>
                        <div className="h-5 w-5 bg-muted/20 rounded mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-8 bg-muted/20 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-8 bg-muted/20 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3 justify-center">
                          <div className="w-10 h-10 rounded-full bg-muted/20" />
                          <div className="space-y-2">
                            <div className="h-3 w-24 bg-muted/30 rounded" />
                            <div className="h-2 w-16 bg-muted/20 rounded" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-20 bg-muted/20 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="h-6 w-12 bg-muted/20 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-32 bg-muted/20 rounded mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-16 bg-muted/20 rounded-full mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="h-4 w-24 bg-muted/20 rounded mx-auto" />
                      </TableCell>
                      <TableCell>
                        <div className="h-8 w-24 bg-muted/20 rounded-md mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : displayEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[400px]">
                    <ProjectEmptyState
                      type="workers"
                      title="Nenhum Colaborador Encontrado"
                      description="Não há colaboradores cadastrados na sua empresa ou que atendam aos filtros selecionados."
                      onAction={() => setIsDialogOpen(true)}
                      actionLabel="Cadastrar Colaborador"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                displayEmployees.map((EmployeeProfile) => (
                  <TableRow
                    key={EmployeeProfile.id}
                    className={cn(
                      "table-row group relative overflow-hidden",
                      !EmployeeProfile.isActive && "opacity-40 grayscale-[0.6]",
                    )}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSelection(EmployeeProfile.id)}
                        className="h-8 w-8"
                      >
                        {selectedIds.includes(EmployeeProfile.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold"
                        >
                          P{EmployeeProfile.professionalLevel}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {(() => {
                          const level = EmployeeProfile.level || 0;
                          return (
                            <Badge
                              variant="outline"
                              className={`
                                                            ${level >= 8
                                  ? "bg-amber-500/20 text-amber-500 border-amber-500/20"
                                  : level >= 5
                                    ? "bg-primary/20 text-primary border-primary/20"
                                    : "bg-white/5 text-muted-foreground border-white/10"
                                }
                                                            font-bold
                                                        `}
                            >
                              I{level}
                            </Badge>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3 justify-center group-hover:translate-x-1 transition-transform duration-500">
                        <div className="relative">
                          <Avatar className="w-10 h-10 border-2 border-border/10 shadow-lg group-hover:border-primary/40 transition-colors duration-500">
                            <AvatarImage
                              src={EmployeeProfile.photoUrl || undefined}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                              {getInitials(EmployeeProfile.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          {EmployeeProfile.faceDescriptor && (
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-primary/30 shadow-sm animate-pulse">
                              <Fingerprint className="w-3 h-3 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start gap-0.5 min-w-[120px]">
                          <span className="font-bold text-[13px] text-white/90 group-hover:text-primary transition-colors duration-300">
                            {EmployeeProfile.fullName}
                          </span>
                          <div className="flex items-center gap-2">
                            {EmployeeProfile.cpf && (
                              <span className="text-[10px] text-muted-foreground/80 leading-tight">
                                CPF: {EmployeeProfile.cpf}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground/60 font-mono leading-tight tracking-tighter">
                              MAT: {EmployeeProfile.registrationNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            EmployeeProfile.functionName !== "Não definida"
                              ? "bg-primary/5 border-primary/20 text-primary"
                              : "text-red-600",
                          )}
                        >
                          {EmployeeProfile.functionName}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 border-white/10",
                            EmployeeProfile.laborType === "MOI"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-blue-500/10 text-blue-500",
                          )}
                        >
                          {EmployeeProfile.laborType || "MOD"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1 text-center">
                        {EmployeeProfile.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" /> {EmployeeProfile.email}
                          </div>
                        )}
                        {EmployeeProfile.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{" "}
                            {EmployeeProfile.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {EmployeeProfile.isActive ? (
                          <div className="flex items-center gap-1.5 text-success text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ATIVO
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" /> INATIVO
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        {(() => {
                          const site = sites.find(
                            (s) => s.id === EmployeeProfile.siteId,
                          );
                          const project = projects.find(
                            (p) => p.id === site?.projectId,
                          );
                          const company = companies.find(
                            (c) => c.id === EmployeeProfile.companyId,
                          );

                          if (!site && !project && !company) {
                            return (
                              <div className="flex items-center gap-1.5 text-red-500/60 bg-red-500/5 border border-red-500/10 px-2 py-1 rounded-md w-fit animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">
                                  Sem Definição
                                </span>
                              </div>
                            );
                          }

                          return (
                            <>
                              {site && (
                                <span className="font-medium text-sm">
                                  {site.name}
                                </span>
                              )}
                              {(project || company) && (
                                <span className="text-[10px] text-muted-foreground uppercase">
                                  {project?.name}
                                  {project && company ? " • " : ""}
                                  {company?.name}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(() => {
                          const canManage = profile
                            ? canManageEmployee(profile, {
                              level: EmployeeProfile.level,
                              companyId: EmployeeProfile.companyId,
                            })
                            : false;

                          if (!canManage) {
                            return (
                              <div
                                className="flex items-center justify-center h-8 w-8 text-muted-foreground/30"
                                title="Sem permissão hierárquica"
                              >
                                <Lock className="w-4 h-4" />
                              </div>
                            );
                          }

                          return (
                            <>
                              <Access auth="employees.edit" mode="lock">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(EmployeeProfile)}
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </Access>
                              <Access auth="employees.edit" mode="lock">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setFaceRegEmployee(EmployeeProfile);
                                    setIsFaceRegOpen(true);
                                  }}
                                  className={`h-8 w-8 ${EmployeeProfile.faceDescriptor ? "text-primary" : "text-muted-foreground"} hover:bg-primary/10 transition-colors`}
                                  title={
                                    EmployeeProfile.faceDescriptor
                                      ? "Recadastrar Rosto"
                                      : "Cadastrar Rosto"
                                  }
                                >
                                  <Scan className="w-4 h-4" />
                                </Button>
                              </Access>
                              <Access auth="employees.edit" mode="lock">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleActive(EmployeeProfile)}
                                  className={`h-8 w-8 ${EmployeeProfile.isActive ? "hover:bg-amber-500/10 hover:text-amber-500" : "hover:bg-green-500/10 hover:text-green-500"}`}
                                  title={
                                    EmployeeProfile.isActive
                                      ? "Desativar"
                                      : "Ativar"
                                  }
                                >
                                  {EmployeeProfile.isActive ? (
                                    <XCircle className="w-4 h-4" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </Access>
                              <Access auth="employees.delete" mode="lock">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(EmployeeProfile)}
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </Access>
                            </>
                          );
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 border-border/50 backdrop-blur-xl shadow-premium">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edição em Massa ({selectedIds.length})
            </DialogTitle>
            <DialogDescription>
              Selecione um campo para aplicar a alteração em todos os {selectedIds.length} colaboradores selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campo para Alterar</Label>
              <Select value={bulkField} onValueChange={(val) => {
                setBulkField(val);
                setBulkValue(null);
              }}>
                <SelectTrigger className="industrial-input">
                  <SelectValue placeholder="Selecione o campo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allocation">Empresa / Obra / Canteiro</SelectItem>
                  {isCorporateRole(profile?.role) && <SelectItem value="companyId">Empresa Solo</SelectItem>}
                  <SelectItem value="projectId">Obra / Projeto Solo</SelectItem>
                  <SelectItem value="siteId">Canteiro / Unidade Solo</SelectItem>
                  <SelectItem value="functionId">Função / Cargo</SelectItem>
                  <SelectItem value="level">Nível Profissional</SelectItem>
                  <SelectItem value="laborType">Tipo de Mão de Obra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bulkField === "allocation" && (
              <div className="space-y-4">
                {isCorporateRole(profile?.role) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      Empresa
                    </Label>
                    <Select 
                      value={bulkValue?.companyId || ""} 
                      onValueChange={(val) => setBulkValue({ companyId: val, projectId: "", siteId: "" })}
                    >
                      <SelectTrigger className="industrial-input border-primary/30">
                        <SelectValue placeholder="-------- Clique para selecionar a empresa --------" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(!isCorporateRole(profile?.role) || bulkValue?.companyId) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">{isCorporateRole(profile?.role) ? "2" : "1"}</span>
                      Obra / Projeto
                    </Label>
                    <Select 
                      value={bulkValue?.projectId || ""} 
                      onValueChange={(val) => setBulkValue({ ...(bulkValue || {}), projectId: val, siteId: "" })}
                    >
                      <SelectTrigger className="industrial-input border-primary/30">
                        <SelectValue placeholder="-------- Clique para selecionar a obra --------" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects
                          .filter(p => !isCorporateRole(profile?.role) || p.companyId === bulkValue?.companyId)
                          .map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {((!isCorporateRole(profile?.role) || bulkValue?.companyId) && bulkValue?.projectId) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">{isCorporateRole(profile?.role) ? "3" : "2"}</span>
                      Canteiro / Unidade
                    </Label>
                    <Select 
                      value={bulkValue?.siteId || ""} 
                      onValueChange={(val) => setBulkValue({ ...(bulkValue || {}), siteId: val })}
                    >
                      <SelectTrigger className="industrial-input border-primary/30 focus:border-primary">
                        <SelectValue placeholder="-------- Clique para selecionar o canteiro --------" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites
                          .filter(s => s.projectId === bulkValue?.projectId)
                          .map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {((!isCorporateRole(profile?.role) || bulkValue?.companyId) && bulkValue?.projectId && bulkValue?.siteId) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 p-4 rounded-md bg-warning/10 border border-warning/30 mt-4">
                    <h4 className="text-sm font-semibold text-warning mb-1 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Atenção: Transferência em Massa
                    </h4>
                    <p className="text-xs text-warning/90 leading-relaxed">
                      Você está prestes a transferir <strong>{selectedIds.length} colaboradores</strong> para uma nova localidade (Empresa/Obra/Canteiro). 
                      Caso eles já possuam essas vinculações, elas serão substituídas. Verifique as seleções antes de aplicar a todos.
                    </p>
                  </div>
                )}
              </div>
            )}



            {bulkField === "functionId" && (
              <div className="space-y-2">
                <Label>Nova Função</Label>
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger className="industrial-input">
                    <SelectValue placeholder="Selecione a função..." />
                  </SelectTrigger>
                  <SelectContent>
                    {functions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkField === "level" && (
              <div className="space-y-2">
                <Label>Novo Nível Profissional</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  className="industrial-input"
                  value={bulkValue || 0}
                  onChange={(e) => setBulkValue(parseInt(e.target.value))}
                />
              </div>
            )}

            {bulkField === "laborType" && (
              <div className="space-y-2">
                <Label>Tipo de Mão de Obra</Label>
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger className="industrial-input">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOD">MOD - Direta</SelectItem>
                    <SelectItem value="MOI">MOI - Indireta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-center flex-wrap gap-4 pt-4 border-t border-white/10 mt-6">
            <Button variant="ghost" onClick={() => setIsBulkDialogOpen(false)} className="w-[140px]">
              Cancelar
            </Button>
            <Access auth="employees.edit" mode="lock">
              <Button
                className="gradient-primary shadow-glow w-[140px]"
                disabled={
                  isBulkSaving ||
                  (bulkField === 'allocation'
                    ? (!bulkValue?.projectId || !bulkValue?.siteId || (isCorporateRole(profile?.role) && !bulkValue?.companyId))
                    : !bulkValue)
                }
                onClick={async () => {
                  setIsBulkSaving(true);
                  if (bulkField === 'allocation') {
                    setConfirmModal({
                      open: true,
                      title: "Atenção: Alteração em Massa",
                      description: `Foi verificado que você irá atualizar ${selectedIds.length} colaboradores na fila. Caso o usuário já tenha um desses 3 vínculos, ignoraremos e pularemos ele; caso ele aceite mesmo assim, aplique. Confirma a Operação?`,
                      variant: "destructive",
                      onConfirm: async () => {
                        setIsBulkSaving(true);
                        try {
                          let updates: any = {};
                          if (bulkValue?.companyId) updates.companyId = bulkValue.companyId;
                          if (bulkValue?.projectId) updates.projectId = bulkValue.projectId;
                          if (bulkValue?.siteId) updates.siteId = bulkValue.siteId;
                          const result = await bulkUpdateEmployees(selectedIds, updates);
                          if (result.success) {
                            setIsBulkDialogOpen(false);
                            setSelectedIds([]);
                          }
                        } finally {
                          setIsBulkSaving(false);
                        }
                      }
                    });
                  } else {
                    setIsBulkSaving(true);
                    try {
                      const result = await bulkUpdateEmployees(selectedIds, { [bulkField]: bulkValue });
                      if (result.success) {
                        setIsBulkDialogOpen(false);
                        setSelectedIds([]);
                      }
                    } finally {
                      setIsBulkSaving(false);
                    }
                  }
                }}
              >
                {isBulkSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Aplicar a Todos
              </Button>
            </Access>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        variant={confirmModal.variant}
      />

      <FaceRegistrationDialog
        open={isFaceRegOpen}
        onOpenChange={setIsFaceRegOpen}
        employee={faceRegEmployee}
      />
    </div>
  );
}
