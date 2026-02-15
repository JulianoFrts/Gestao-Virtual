import * as React from 'react';
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { db } from "@/integrations/database";
import { useUsers, SystemUser } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanies } from "@/hooks/useCompanies";
import { useProjects } from "@/hooks/useProjects";
import { useSites } from "@/hooks/useSites";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  User,
  Mail,
  Loader2,
  Plus,
  Key,
  Trash2,
  Building2,
  HardHat,
  Truck,
  Pencil,
  Ban,
  ShieldAlert,
  ShieldCheck,
  Search,
  UserPlus,
  Laptop,
  Check,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  Move,
  Trash2 as TrashIcon,
  CheckSquare,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getRoleStyle, getRoleLabel, STANDARD_ROLES } from "@/utils/roleUtils";
import { isProtectedSignal, can, show } from "@/signals/authSignals";
import {
  isGestaoGlobal,
  isProtectedUser,
  isCorporateRole,
  isSuperAdminGod,
  UserScope,
} from "@/utils/permissionHelpers";
import { PasswordGenerator } from "@/components/auth/PasswordGenerator";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  applyMask,
  validateInput,
  type InputType,
} from "@/utils/inputValidators";
import { Slider } from "@/components/ui/slider";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useSignals } from "@preact/signals-react/runtime";
import { Project } from "@/signals/globalDataSignals";
import { PERMISSION_CATEGORIES } from "@/utils/permissionCategories";

export default function Users() {
  useSignals();
  const { profile: currentUserProfile, refreshProfile } = useAuth();

  // IAP List State
  const [iaps, setIaps] = React.useState<{ id: string; iap: number }[]>([]);

  React.useEffect(() => {
    const fetchIaps = async () => {
      const { data, error } = await db
        .from("list_iap")
        .select("*")
        .order("iap", { ascending: true });
      if (!error && data) {
        setIaps(data);
      }
    };
    fetchIaps();
  }, []);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState("");

  // Debounce search term to avoid rapid re-fetches
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [filterType, setFilterType] = React.useState<
    "all" | "corporate" | "external"
  >("corporate");
  const [viewMode, setViewMode] = React.useState<
    "all_combined" | "app_management" | "search"
  >("all_combined");
  const showOnlyCorporate = filterType === "corporate";

  const usersFilters = React.useMemo(
    () => ({
      // Se for Gestão Global (Sócio/God), não limita por empresa para ver todos os funcionários do sistema
      companyId: isGestaoGlobal(currentUserProfile)
        ? undefined
        : currentUserProfile?.companyId || undefined,
      search: debouncedSearchTerm,
      onlyCorporate: filterType === "corporate",
      excludeCorporate: filterType === "external",
    }),
    [currentUserProfile, debouncedSearchTerm, filterType],
  );

  const {
    users,
    isLoading: usersLoading,
    updateUser,
    createUser,
    deleteUser,
    resetUserPassword,
    adminChangePassword,
    adminToggleBlock,
  } = useUsers(usersFilters);
  const { companies } = useCompanies();
  const { projects } = useProjects();
  const { sites } = useSites();
  const { toast } = useToast();
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(
    null,
  );
  const [isPerformingAction, setIsPerformingAction] = React.useState(false);
  const [openSearch, setOpenSearch] = React.useState(false);

  const canCreate =
    can("users.create") || can("users.manage") || isProtectedSignal.value;
  const canUpdate =
    can("users.update") || can("users.manage") || isProtectedSignal.value;
  const canDelete =
    can("users.delete") || can("users.manage") || isProtectedSignal.value;

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const navigate = useNavigate();

  React.useEffect(() => {
    if (!usersLoading && currentUserProfile) {
      // Verifica se o usuário tem permissão de leitura para o módulo de usuários
      if (show("showAdminMenu") && !can("users.read")) {
        toast({
          title: "Acesso Negado",
          description: "Sua conta não tem permissão para gerenciar usuários.",
          variant: "destructive",
        });
        navigate("/dashboard");
      }
    }
  }, [usersLoading, currentUserProfile, navigate, toast]);

  // Search and Filter Logic
  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      // Se o modo for Gestão do App, filtrar apenas usuários com cargos de gestão
      if (viewMode === "app_management") {
        return isGestaoGlobal(user as UserScope);
      }

      // Se houver termo de busca local, filtragem adicional no front
      if (searchTerm || viewMode === "search") {
        const search = searchTerm.toLowerCase();
        const matchesName = (user.fullName || "")
          .toLowerCase()
          .includes(search);
        const matchesEmail = (user.email || "").toLowerCase().includes(search);
        const matchesMatricula = (user.registrationNumber || "")
          .toLowerCase()
          .includes(search);
        const matchesCPF = (user.cpf || "")
          .replace(/\D/g, "")
          .includes(search.replace(/\D/g, ""));
        return matchesName || matchesEmail || matchesMatricula || matchesCPF;
      }

      // No modo 'all_combined', mostramos tudo o que o backend entregou (que já respeita a empresa se não for gestor global)
      return true;
    });
  }, [users, searchTerm, viewMode]);

  // Sort users by role priority (based on STANDARD_ROLES rank) and then by name
  const sortedUsers = React.useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      const roleA = (a.role || "WORKER").toUpperCase();
      const roleB = (b.role || "WORKER").toUpperCase();

      const rankA =
        STANDARD_ROLES.find(
          (r) => r.name === roleA || r.name === (a.role || "").toLowerCase(),
        )?.rank ||
        STANDARD_ROLES.find((r) => r.name === "WORKER")?.rank ||
        0;
      const rankB =
        STANDARD_ROLES.find(
          (r) => r.name === roleB || r.name === (b.role || "").toLowerCase(),
        )?.rank ||
        STANDARD_ROLES.find((r) => r.name === "WORKER")?.rank ||
        0;

      if (rankB !== rankA) return rankB - rankA;

      // Secondary sort by name
      return (a.fullName || "").localeCompare(b.fullName || "");
    });
  }, [filteredUsers]);

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedUsers.length && sortedUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedUsers.map((u) => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Role Change Dialog State
  const [userToChangeRole, setUserToChangeRole] =
    React.useState<SystemUser | null>(null);

  // Create User State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
    companyId: "",
    projectId: "",
    siteId: "",
    registrationNumber: "",
    image: "",
    // Campos pessoais
    cpf: "",
    gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
    birthDate: "",
    phone: "",
    // Endereço
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    // Afiliação Extra
    laborType: "",
    iapName: "",
  });

  // Admin Specific States
  const [userToDelete, setUserToDelete] = React.useState<SystemUser | null>(
    null,
  );
  const [userToReset, setUserToReset] = React.useState<SystemUser | null>(null);
  const [userToChangePassword, setUserToChangePassword] =
    React.useState<SystemUser | null>(null);
  const [userToEditAffiliation, setUserToEditAffiliation] =
    React.useState<SystemUser | null>(null);
  const [editAffiliationForm, setEditAffiliationForm] = React.useState({
    companyId: "GESTÃO VIRTUAL",
    projectId: "ORION",
    siteId: "0",
  });
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [isUpdatingAffiliation, setIsUpdatingAffiliation] =
    React.useState(false);

  // Edit User State
  const [userToEdit, setUserToEdit] = React.useState<SystemUser | null>(null);
  const [editUserForm, setEditUserForm] = React.useState({
    fullName: "",
    email: "",
    password: "", // New field for Admin Edit
    role: "WORKER",
    isSystemAdmin: false,
    companyId: "none",
    projectId: "none",
    siteId: "none",
    registrationNumber: "",
    image: "",
    // Campos pessoais
    cpf: "",
    gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
    birthDate: "",
    phone: "",
    // Endereço
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    // Afiliação Extra
    laborType: "",
    iapName: "",
    permissions: [] as string[],
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleInputChange = (
    field: string,
    value: string,
    formType: "create" | "edit",
    inputType?: InputType,
  ) => {
    // 1. Aplicar máscara se necessário
    const finalValue = inputType ? applyMask(value, inputType) : value;

    // 2. Atualizar estado
    if (formType === "create") {
      setCreateForm((prev) => ({ ...prev, [field]: finalValue }));
    } else {
      setEditUserForm((prev) => ({ ...prev, [field]: finalValue }));
    }

    // 3. Validar em tempo real
    if (inputType) {
      const validation = validateInput(finalValue, inputType);
      setErrors((prev) => ({
        ...prev,
        [`${formType}_${field}`]: validation.isValid ? "" : validation.message,
      }));
    } else if (field === "name" || field === "fullName") {
      // Validação específica para nome se não coberta pelo validateInput genérico
      if (finalValue.length < 3) {
        setErrors((prev) => ({
          ...prev,
          [`${formType}_${field}`]: "Nome muito curto",
        }));
      } else {
        setErrors((prev) => ({ ...prev, [`${formType}_${field}`]: "" }));
      }
    }
  };

  // ViaCEP Integration
  const handleCepBlur = async (
    formType: "create" | "edit",
    cepValue: string,
  ) => {
    const cep = cepValue.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        if (formType === "create") {
          setCreateForm((prev) => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        } else {
          setEditUserForm((prev) => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    } catch (error) {
      console.error("Erro ao buscar CEP", error);
    }
  };
  const [isUpdatingUser, setIsUpdatingUser] = React.useState(false);

  // Photo Adjustment States
  const [isAdjustingPhoto, setIsAdjustingPhoto] = React.useState(false);
  const [imageToAdjust, setImageToAdjust] = React.useState<string | null>(null);
  const [photoConfig, setPhotoConfig] = React.useState({ zoom: 1, x: 0, y: 0 });
  const [activePhotoForm, setActivePhotoForm] = React.useState<
    "create" | "edit" | null
  >(null);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    form: "create" | "edit",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActivePhotoForm(form);
    processImage(file);
  };

  const processImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setImageToAdjust(dataUrl);
      setPhotoConfig({ zoom: 1, x: 0, y: 0 });
      setIsAdjustingPhoto(true);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyAdjustment = async () => {
    if (!imageToAdjust) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const SIZE = 400;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      const baseSize = Math.min(img.width, img.height);
      const drawWidth = (img.width / baseSize) * SIZE * photoConfig.zoom;
      const drawHeight = (img.height / baseSize) * SIZE * photoConfig.zoom;

      const centerX = (SIZE - drawWidth) / 2 + (photoConfig.x * SIZE) / 100;
      const centerY = (SIZE - drawHeight) / 2 + (photoConfig.y * SIZE) / 100;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, centerX, centerY, drawWidth, drawHeight);

      const base64 = canvas.toDataURL("image/jpeg", 0.9);
      if (activePhotoForm === "create") {
        setCreateForm((prev) => ({ ...prev, image: base64 }));
      } else {
        setEditUserForm((prev) => ({ ...prev, image: base64 }));
      }
      setIsAdjustingPhoto(false);
      setImageToAdjust(null);

      toast({ title: "Foto aplicada", description: "Avatar configurado." });
    };
    img.src = imageToAdjust;
  };

  const handleRemovePhoto = (form: "create" | "edit") => {
    if (form === "create") setCreateForm((prev) => ({ ...prev, image: "" }));
    else setEditUserForm((prev) => ({ ...prev, image: "" }));
    toast({ title: "Foto removida" });
  };

  // Paste specific handler
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isCreateOpen && !userToEdit) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            const form = isCreateOpen ? "create" : "edit";
            setActivePhotoForm(form);
            // Convert blob to File with name
            const file = new File([blob], "pasted-image.png", {
              type: blob.type,
            });
            processImage(file);
            toast({
              title: "Imagem detectada!",
              description: "Abrindo editor de corte...",
            });
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isCreateOpen, userToEdit, toast]);

  const handleUpdateAffiliation = async () => {
    if (!userToEditAffiliation) return;

    setIsUpdatingAffiliation(true);
    const result = await updateUser(userToEditAffiliation.id, {
      role: userToEditAffiliation.role,
      companyId:
        editAffiliationForm.companyId === "none"
          ? null
          : editAffiliationForm.companyId,
      projectId:
        editAffiliationForm.projectId === "none"
          ? null
          : editAffiliationForm.projectId,
      siteId:
        editAffiliationForm.siteId === "none"
          ? null
          : editAffiliationForm.siteId,
    });
    setIsUpdatingAffiliation(false);

    if (result.success) {
      toast({
        title: "Afiliações atualizadas",
        description: "A empresa, obra e canteiro do usuário foram alterados.",
      });
      setUserToEditAffiliation(null);
    }
  };

  const handleEditUser = (user: SystemUser) => {
    setUserToEdit(user);
    setEditUserForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      role: user.role,
      isSystemAdmin: user.isSystemAdmin || false,
      companyId: user.companyId || "none",
      projectId: user.projectId || "none",
      siteId: user.siteId || "none",
      registrationNumber: user.registrationNumber || "",
      image: user.image || "",
      cpf: user.cpf || "",
      gender: (user.gender as SystemUser["gender"]) || "",
      birthDate: user.birthDate || "",
      phone: user.phone || "",
      cep: user.zipCode || "",
      street: user.street || "",
      number: user.number || "",
      neighborhood: user.neighborhood || "",
      city: user.city || "",
      state: user.state || "",
      laborType: user.laborType || "",
      iapName: user.iapName || "",
      permissions: user.permissions || [],
    });
    setErrors({});
  };

  // O sortedUsers agora usa o users que vem direto do hook, que já está filtrado pelo backend

  // Global Search Effect (Opcional, pode ser removido se o useUsers já faz buscar no backend)
  // Mantido por enquanto se o 'openSearch' for uma feature desejada separada

  const handleUpdateUser = async () => {
    if (!userToEdit) return;

    setIsUpdatingUser(true);

    // 1. Handle Password Change if provided
    if (editUserForm.password && editUserForm.password.trim().length > 0) {
      if (editUserForm.password.length < 6) {
        toast({
          title: "Senha muito curta",
          description: "A senha deve ter no mínimo 6 caracteres",
          variant: "destructive",
        });
        setIsUpdatingUser(false);
        return;
      }
      const pwdResult = await adminChangePassword(
        userToEdit.id,
        editUserForm.password,
      );
      if (!pwdResult.success) {
        toast({
          title: "Erro ao alterar senha",
          description: pwdResult.error,
          variant: "destructive",
        });
        setIsUpdatingUser(false);
        return;
      }
    }

    // 2. Handle Profile Update
    const result = await updateUser(
      userToEdit.id,
      {
        fullName: editUserForm.fullName,
        email:
          editUserForm.email !== userToEdit.email
            ? editUserForm.email
            : undefined,
        role: editUserForm.role,
        isSystemAdmin: editUserForm.isSystemAdmin, // Sending the new flag
        permissions: editUserForm.permissions,
        companyId:
          editUserForm.companyId === "none" ? null : editUserForm.companyId,
        projectId:
          editUserForm.projectId === "none" ? null : editUserForm.projectId,
        siteId: editUserForm.siteId === "none" ? null : editUserForm.siteId,
        registrationNumber: editUserForm.registrationNumber || null,
        cpf: editUserForm.cpf || null,
        image: editUserForm.image || null,
        // Campos pessoais
        phone: editUserForm.phone || null,
        zipCode: editUserForm.cep || null,
        street: editUserForm.street || null,
        number: editUserForm.number || null,
        neighborhood: editUserForm.neighborhood || null,
        city: editUserForm.city || null,
        state: editUserForm.state || null,
        gender: editUserForm.gender || null,
        birthDate: editUserForm.birthDate || null,
        laborType: editUserForm.laborType || null,
        iapName: editUserForm.iapName || null,
      },
      userToEdit,
    ); // Pass user object override
    setIsUpdatingUser(false);

    if (result.success) {
      if (userToEdit.id === currentUserProfile?.id) {
        await refreshProfile();
      }
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram alteradas com sucesso.",
      });
      setUserToEdit(null);
    } else {
      toast({
        title: "Erro ao atualizar",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  // ... existing handlers ...

  // Replace the Popover/Command section
  /*
    ... inside render ...
    */

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    if (createForm.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      setIsCreating(false);
      return;
    }

    const result = await createUser(
      createForm.email.trim(),
      createForm.password,
      createForm.name.trim(),
      createForm.role,
      createForm.companyId || undefined,
      createForm.projectId || undefined,
      createForm.siteId || undefined,
      createForm.registrationNumber?.trim() || undefined,
      createForm.image || undefined,
      createForm.cpf || undefined, // Corrected positioning
      createForm.cep || undefined,
      createForm.street || undefined,
      createForm.number || undefined,
      createForm.neighborhood || undefined,
      createForm.city || undefined,
      createForm.state || undefined,
      createForm.gender || undefined,
      createForm.birthDate || undefined,
      createForm.phone || undefined,
      createForm.laborType || undefined,
      createForm.iapName || undefined,
    );

    setIsCreating(false);
    if (result.success) {
      toast({
        title: "Usuário criado",
        description: "O novo usuário foi adicionado com sucesso.",
      });
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        password: "",
        role: "WORKER",
        companyId: "",
        projectId: "",
        siteId: "",
        registrationNumber: "",
        image: "",
        cpf: "",
        gender: "",
        birthDate: "",
        phone: "",
        cep: "",
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        state: "",
        laborType: "",
        iapName: "",
      });
    } else {
      toast({
        title: "Erro ao criar usuário",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleToggleBlock = async (user: SystemUser) => {
    setUpdatingUserId(user.id);
    await adminToggleBlock(user.id, !user.isBlocked);
    setUpdatingUserId(null);
  };

  const handleResetPassword = async (user: SystemUser) => {
    setUpdatingUserId(user.id);
    const result = await resetUserPassword(user.email);
    setUpdatingUserId(null);

    if (result.success) {
      toast({
        title: "Email de recuperação enviado",
        description: `Uma nova senha poderá ser definida pelo usuário ${user.email}.`,
      });
    }
  };

  const handleConfirmDelete = async (user: SystemUser) => {
    setUpdatingUserId(user.id);
    const result = await deleteUser(user.id);
    setUpdatingUserId(null);

    if (result.success) {
      toast({
        title: "Usuário excluído",
        description: "A conta foi removida do sistema.",
      });
      // Se o usuário excluído estava selecionado, remova da seleção
      if (selectedIds.has(user.id)) {
        const next = new Set(selectedIds);
        next.delete(user.id);
        setSelectedIds(next);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmDelete = confirm(
      `Deseja excluir permanentemente os ${selectedIds.size} usuários selecionados? Esta ação não pode ser desfeita.`,
    );
    if (!confirmDelete) return;

    setIsPerformingAction(true); // Start blocking UI
    let successCount = 0;
    let failCount = 0;

    for (const id of Array.from(selectedIds)) {
      const res = await deleteUser(id);
      if (res.success) successCount++;
      else failCount++;
    }

    setIsPerformingAction(false);
    setSelectedIds(new Set());

    if (failCount === 0) {
      toast({
        title: "Sucesso",
        description: `${successCount} usuários excluídos com sucesso.`,
      });
    } else {
      toast({
        title: "Ação Concluída com Alerta",
        description: `${successCount} excluídos, ${failCount} falhas. Verifique as permissões.`,
        variant: "destructive",
      });
    }
  };

  const getUserBadge = (user: SystemUser) => {
    const isGod = isSuperAdminGod(user as UserScope);
    const isGlobal = isGestaoGlobal(user as UserScope);
    const isSystemAdmin = user.isSystemAdmin === true;

    const badges: React.ReactNode[] = [];

    // 1. Badge principal baseada no cargo (roleUtils)
    badges.push(
      <Badge key="default" className={cn(getRoleStyle(user.role), "shadow-sm")}>
        {getRoleLabel(user.role)}
      </Badge>,
    );

    // 2. Extra Technical Flags (BackEnd Consented)
    if (isSystemAdmin) {
      badges.push(
        <Badge
          key="sysadmin"
          className="bg-sky-500/10 text-sky-500 border-sky-500/10 flex items-center gap-1 px-1.5 py-0 shadow-none"
        >
          <Laptop className="w-3 h-3 text-sky-500" />
          <span className="text-[10px] font-bold tracking-tight">
            SYSTEM ADMIN
          </span>
        </Badge>,
      );
    }

    if (isGlobal && !isGod) {
      badges.push(
        <Badge
          key="global"
          className="bg-teal-500/10 text-teal-500 border-teal-500/10 flex items-center gap-1 px-1.5 py-0 shadow-none"
        >
          <ShieldAlert className="w-3 h-3 text-teal-500" />
          <span className="text-[10px] font-bold tracking-tight">
            GESTÃO GLOBAL
          </span>
        </Badge>,
      );
    }

    if (isGod) {
      badges.push(
        <Badge
          key="master"
          className="bg-orange-500/10 text-orange-500 border-orange-500/10 flex items-center gap-1 px-1.5 py-0 shadow-[0_0_10px_-4px_rgba(249,115,22,0.4)]"
        >
          <ShieldCheck className="w-3 h-3 text-orange-500" />
          <span className="text-[10px] font-bold tracking-tight">
            ACESSO MESTRE
          </span>
        </Badge>,
      );
    }

    return <div className="flex flex-wrap items-center gap-1.5">{badges}</div>;
  };

  if (usersLoading && users.length === 0) {
    return (
      <LoadingScreen
        isLoading={true}
        title="GESTÃO DE USUÁRIOS"
        message={
          isPerformingAction
            ? "PROCESSANDO ALTERAÇÕES"
            : "SINCRONIZANDO USUÁRIOS"
        }
        details={[
          { label: "Usuários", isLoading: usersLoading },
          { label: "Processamento em Massa", isLoading: isPerformingAction },
        ]}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground">
            Controle quem acessa o painel administrativo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {show("showMaintenance") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-orange-500/20 text-orange-500 hover:bg-orange-500/10"
                >
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Manutenção de CPFs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-orange-500">
                    <AlertTriangle className="w-5 h-5" /> Confirmar Manutenção
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá verificar toda a base de dados em busca de
                    CPFs duplicados. Para cada conflito, o registro{" "}
                    <strong>mais antigo</strong> será mantido e os mais novos
                    terão seu CPF anulado. Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          "/api/v1/users/maintenance/deduplicate-cpfs",
                          { method: "POST" },
                        );
                        const data = await res.json();
                        if (data.success) {
                          toast({
                            title: "Sucesso",
                            description: data.message,
                            className:
                              "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                          });
                        } else {
                          toast({
                            title: "Erro",
                            description: data.error,
                            variant: "destructive",
                          });
                        }
                      } catch {
                        toast({
                          title: "Erro na conexão",
                          description: "O servidor não respondeu.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Executar Limpeza
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canCreate && (
            <>
              <Button
                className="gradient-primary shadow-glow"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl bg-black/95 border-white/10 backdrop-blur-xl text-foreground">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Novo Usuário
                    </DialogTitle>
                    <DialogDescription>
                      Preencha as informações para criar um novo usuário no
                      sistema.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-6 pt-4">
                    <Accordion
                      type="single"
                      collapsible
                      defaultValue="access"
                      className="w-full space-y-2"
                    >
                      {/* Foto e Identificação */}
                      <AccordionItem
                        value="identification"
                        className="border-none"
                      >
                        <AccordionTrigger className="hover:no-underline py-2 px-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-primary/5 data-[state=open]:border-primary/20 group text-[10px] uppercase font-black tracking-widest">
                          <div className="flex items-center gap-2 text-primary">
                            <User className="w-4 h-4" />
                            Identificação
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-black/20 border-x border-b border-white/10 rounded-b-lg px-4 py-6 -mt-px space-y-6">
                          <div className="flex flex-col items-center gap-2">
                            <ContextMenu>
                              <ContextMenuTrigger asChild>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <div className="relative group cursor-pointer">
                                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center transition-all group-hover:border-primary/50 shadow-lg">
                                        {createForm.image ? (
                                          <img
                                            src={createForm.image}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <User className="w-8 h-8 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                        <Camera className="w-5 h-5 text-white" />
                                      </div>
                                    </div>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="center"
                                    className="w-48 bg-black/90 backdrop-blur-xl border-primary/20"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        document
                                          .getElementById("create-image-upload")
                                          ?.click()
                                      }
                                      className="cursor-pointer gap-2"
                                    >
                                      <ImageIcon className="w-4 h-4" /> Alterar
                                      Foto
                                    </DropdownMenuItem>
                                    {createForm.image && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleRemovePhoto("create")
                                        }
                                        className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                      >
                                        <TrashIcon className="w-4 h-4" />{" "}
                                        Remover Foto
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-48 bg-black/90 backdrop-blur-xl border-primary/20">
                                <ContextMenuItem
                                  onClick={() =>
                                    document
                                      .getElementById("create-image-upload")
                                      ?.click()
                                  }
                                  className="cursor-pointer gap-2"
                                >
                                  <ImageIcon className="w-4 h-4" /> Alterar Foto
                                </ContextMenuItem>
                                {createForm.image && (
                                  <ContextMenuItem
                                    onClick={() => handleRemovePhoto("create")}
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                  >
                                    <TrashIcon className="w-4 h-4" /> Remover
                                    Foto
                                  </ContextMenuItem>
                                )}
                              </ContextMenuContent>
                            </ContextMenu>
                            <input
                              id="create-image-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageChange(e, "create")}
                            />
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                              Clique para Foto
                            </span>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="name"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Nome Completo *
                              </Label>
                              <Input
                                id="name"
                                placeholder="Nome do usuário"
                                className="bg-white/5 border-white/10"
                                value={createForm.name}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    name: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="registrationNumber"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Matrícula
                              </Label>
                              <Input
                                id="registrationNumber"
                                placeholder="00000"
                                className="bg-white/5 border-white/10"
                                value={createForm.registrationNumber}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    registrationNumber: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="email"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Email *
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="email@exemplo.com"
                                className="bg-white/5 border-white/10"
                                value={createForm.email}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    email: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Nível de Acesso e Segurança */}
                      <AccordionItem value="access" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2 px-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-amber-500/5 data-[state=open]:border-amber-500/20 group text-[10px] uppercase font-black tracking-widest">
                          <div className="flex items-center gap-2 text-amber-500">
                            <Key className="w-4 h-4" />
                            Acesso & Segurança
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-black/20 border-x border-b border-white/10 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="password"
                              className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                            >
                              Senha Temporária *
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id="password"
                                type="password"
                                placeholder="Senha inicial"
                                className="industrial-input center-text"
                                value={createForm.password}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    password: e.target.value,
                                  })
                                }
                                required
                                autoComplete="new-password"
                              />
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="industrial-input px-3"
                                  >
                                    <Key className="w-4 h-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-80 p-0 border-none bg-transparent"
                                  align="end"
                                >
                                  <PasswordGenerator
                                    onSave={async (pw) => {
                                      setCreateForm((prev) => ({
                                        ...prev,
                                        password: pw,
                                      }));
                                      toast({
                                        title: "Senha Gerada",
                                        description:
                                          "Senha aplicada ao formulário.",
                                      });
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="role"
                              className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                            >
                              Nível de Acesso
                            </Label>
                            <Select
                              value={createForm.role}
                              onValueChange={(val: string) =>
                                setCreateForm({
                                  ...createForm,
                                  role: val,
                                  projectId: "",
                                  siteId: "",
                                })
                              }
                            >
                              <SelectTrigger className="bg-white/5 border-white/10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="glass-card border-white/10">
                                {STANDARD_ROLES.map((r) => (
                                  <SelectItem
                                    key={r.name}
                                    value={r.name.toUpperCase()}
                                    disabled={r.name === "HELPER_SYSTEM"}
                                    className={
                                      r.name === "HELPER_SYSTEM"
                                        ? "line-through opacity-50"
                                        : ""
                                    }
                                  >
                                    {getRoleLabel(r.name)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Permission Section */}
                      {currentUserProfile?.role &&
                        isGestaoGlobal(currentUserProfile) && (
                          <AccordionItem
                            value="permissions"
                            className="border-slate-700"
                          >
                            <AccordionTrigger className="text-slate-300 hover:text-amber-500">
                              <div className="flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                Permissões Individuais
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 space-y-6">
                              {Object.values(PERMISSION_CATEGORIES).map(
                                (category, idx) => (
                                  <div key={idx} className="space-y-3">
                                    <h4 className="text-sm font-semibold text-slate-400 border-b border-slate-700 pb-1">
                                      {category.label}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {category.permissions.map((perm) => (
                                        <div
                                          key={perm.code}
                                          className="flex items-start space-x-2"
                                        >
                                          <Checkbox
                                            id={`perm-${perm.code}`}
                                            checked={editUserForm.permissions.includes(
                                              perm.code,
                                            )}
                                            onCheckedChange={(checked) => {
                                              setEditUserForm((prev) => {
                                                const newPerms = checked
                                                  ? [
                                                      ...prev.permissions,
                                                      perm.code,
                                                    ]
                                                  : prev.permissions.filter(
                                                      (p) => p !== perm.code,
                                                    );
                                                return {
                                                  ...prev,
                                                  permissions: newPerms,
                                                };
                                              });
                                            }}
                                            className="mt-0.5 border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                          />
                                          <Label
                                            htmlFor={`perm-${perm.code}`}
                                            className="text-sm text-slate-300 font-normal cursor-pointer leading-tight"
                                          >
                                            {perm.label}
                                          </Label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ),
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        )}

                      {/* Afiliação e Contexto */}
                      {!isCorporateRole(createForm.role, createForm as any) && (
                        <AccordionItem
                          value="affiliation"
                          className="border-none"
                        >
                          <AccordionTrigger className="hover:no-underline py-2 px-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-sky-500/5 data-[state=open]:border-sky-500/20 group text-[10px] uppercase font-black tracking-widest">
                            <div className="flex items-center gap-2 text-sky-500">
                              <Building2 className="w-4 h-4" />
                              Afiliação & Contexto
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="bg-black/20 border-x border-b border-white/10 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="company"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Empresa Afiliada
                              </Label>
                              <Select
                                value={createForm.companyId || "none"}
                                onValueChange={(val: string) =>
                                  setCreateForm({
                                    ...createForm,
                                    companyId: val === "none" ? "" : val,
                                    projectId: "",
                                    siteId: "",
                                  })
                                }
                              >
                                <SelectTrigger className="bg-white/5 border-white/10">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10">
                                  <SelectItem value="none">
                                    Nenhuma Empresa
                                  </SelectItem>
                                  {companies.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor="project"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Vincular Obra
                              </Label>
                              <Select
                                value={createForm.projectId || "none"}
                                onValueChange={(val: string) =>
                                  setCreateForm({
                                    ...createForm,
                                    projectId: val === "none" ? "" : val,
                                    siteId: "",
                                  })
                                }
                              >
                                <SelectTrigger className="bg-white/5 border-white/10">
                                  <SelectValue placeholder="Selecione a obra..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10">
                                  <SelectItem value="none">
                                    Nenhuma Obra
                                  </SelectItem>
                                  {projects
                                    .filter(
                                      (p) =>
                                        !createForm.companyId ||
                                        p.companyId === createForm.companyId,
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
                              <Label
                                htmlFor="site"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Vincular Canteiro
                              </Label>
                              <Select
                                value={createForm.siteId || "none"}
                                onValueChange={(val: string) =>
                                  setCreateForm({
                                    ...createForm,
                                    siteId: val === "none" ? "" : val,
                                  })
                                }
                              >
                                <SelectTrigger className="bg-white/5 border-white/10">
                                  <SelectValue placeholder="Selecione o canteiro..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10">
                                  <SelectItem value="none">
                                    Nenhum Canteiro
                                  </SelectItem>
                                  {sites
                                    .filter((s) => {
                                      if (!createForm.companyId) return true;
                                      const project = projects.find(
                                        (p) => p.id === s.projectId,
                                      );
                                      return (
                                        project?.companyId ===
                                        createForm.companyId
                                      );
                                    })
                                    .map((s) => (
                                      <SelectItem key={s.id} value={s.id}>
                                        {s.name} (
                                        {getProjectName(s.projectId, projects)})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Separador Visual e Campos Extras de Afiliação */}
                            <div className="relative pt-4 pb-2">
                              <div
                                className="absolute inset-0 flex items-center"
                                aria-hidden="true"
                              >
                                <div className="w-full border-t border-white/10"></div>
                              </div>
                              <div className="relative flex justify-center">
                                <span className="bg-background px-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                  Detalhes Operacionais
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                                  Mão de Obra
                                </Label>
                                <Select
                                  value={createForm.laborType}
                                  onValueChange={(val) =>
                                    setCreateForm({
                                      ...createForm,
                                      laborType: val,
                                    })
                                  }
                                >
                                  <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Selecione..." />
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
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                                  IAP
                                </Label>
                                <Select
                                  value={createForm.iapName}
                                  onValueChange={(val) =>
                                    setCreateForm({
                                      ...createForm,
                                      iapName: val,
                                    })
                                  }
                                >
                                  <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent className="glass-card border-white/10">
                                    {iaps.map((iap) => (
                                      <SelectItem
                                        key={iap.id}
                                        value={String(iap.iap)}
                                      >
                                        {Number(iap.iap).toFixed(4)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {/* Dados Pessoais */}
                      <AccordionItem value="personal" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-2 px-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-emerald-500/5 data-[state=open]:border-emerald-500/20 group text-[10px] uppercase font-black tracking-widest">
                          <div className="flex items-center gap-2 text-emerald-500">
                            <ShieldCheck className="w-4 h-4" />
                            Dados Pessoais
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-black/20 border-x border-b border-white/10 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="cpf"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                CPF
                              </Label>
                              <Input
                                id="cpf"
                                placeholder="000.000.000-00"
                                className="bg-white/5 border-white/10"
                                value={createForm.cpf}
                                onChange={(e) =>
                                  handleInputChange(
                                    "cpf",
                                    e.target.value,
                                    "create",
                                    "cpf",
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="birthDate"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Data de Nascimento
                              </Label>
                              <Input
                                id="birthDate"
                                type="text"
                                className="bg-white/5 border-white/10"
                                value={createForm.birthDate}
                                onChange={(e) =>
                                  handleInputChange(
                                    "birthDate",
                                    e.target.value,
                                    "create",
                                    "date",
                                  )
                                }
                                placeholder="DD/MM/AAAA"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="create-phone"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Telefone / Celular
                              </Label>
                              <Input
                                id="create-phone"
                                className="bg-white/5 border-white/10"
                                value={createForm.phone}
                                onChange={(e) =>
                                  handleInputChange(
                                    "phone",
                                    e.target.value,
                                    "create",
                                    "phone",
                                  )
                                }
                                placeholder="(00) 00000-0000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="create-gender"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Gênero
                              </Label>
                              <Select
                                value={createForm.gender}
                                onValueChange={(val: string) =>
                                  setCreateForm({
                                    ...createForm,
                                    gender: val as "MALE" | "FEMALE" | "OTHER",
                                  })
                                }
                              >
                                <SelectTrigger className="bg-white/5 border-white/10">
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10">
                                  <SelectItem value="MALE">
                                    Masculino
                                  </SelectItem>
                                  <SelectItem value="FEMALE">
                                    Feminino
                                  </SelectItem>
                                  <SelectItem value="OTHER">Outro</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="h-px bg-white/10 my-2" />

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-1">
                              <Label
                                htmlFor="create-cep"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                CEP
                              </Label>
                              <Input
                                id="create-cep"
                                className="bg-white/5 border-white/10"
                                value={createForm.cep}
                                onChange={(e) =>
                                  handleInputChange(
                                    "cep",
                                    e.target.value,
                                    "create",
                                    "cep",
                                  )
                                }
                                onBlur={(e) =>
                                  handleCepBlur("create", e.target.value)
                                }
                                placeholder="00000-000"
                              />
                            </div>
                            <div className="space-y-2 col-span-2">
                              <Label
                                htmlFor="create-street"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Rua / Logradouro
                              </Label>
                              <Input
                                id="create-street"
                                className="bg-white/5 border-white/10"
                                value={createForm.street}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    street: e.target.value,
                                  })
                                }
                                placeholder="Rua..."
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2 col-span-1">
                              <Label
                                htmlFor="create-number"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Número
                              </Label>
                              <Input
                                id="create-number"
                                className="bg-white/5 border-white/10"
                                value={createForm.number}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    number: e.target.value,
                                  })
                                }
                                placeholder="Nº"
                              />
                            </div>
                            <div className="space-y-2 col-span-3">
                              <Label
                                htmlFor="create-neighborhood"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Bairro
                              </Label>
                              <Input
                                id="create-neighborhood"
                                className="bg-white/5 border-white/10"
                                value={createForm.neighborhood}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    neighborhood: e.target.value,
                                  })
                                }
                                placeholder="Bairro"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2 col-span-3">
                              <Label
                                htmlFor="create-city"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                Cidade
                              </Label>
                              <Input
                                id="create-city"
                                className="bg-white/5 border-white/10"
                                value={createForm.city}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    city: e.target.value,
                                  })
                                }
                                placeholder="Cidade"
                              />
                            </div>
                            <div className="space-y-2 col-span-1">
                              <Label
                                htmlFor="create-state"
                                className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                              >
                                UF
                              </Label>
                              <Input
                                id="create-state"
                                className="bg-white/5 border-white/10"
                                value={createForm.state}
                                onChange={(e) =>
                                  setCreateForm({
                                    ...createForm,
                                    state: e.target.value
                                      .toUpperCase()
                                      .slice(0, 2),
                                  })
                                }
                                placeholder="UF"
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsCreateOpen(false)}
                        disabled={isCreating}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="gradient-primary"
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        Criar Usuário
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="relative flex-1">
            <Popover open={openSearch} onOpenChange={setOpenSearch}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSearch}
                  className="w-full justify-start text-left font-normal pl-10 industrial-input border-white/10 bg-black/40 hover:bg-white/5 hover:text-white relative h-12"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  {searchTerm ? (
                    searchTerm
                  ) : (
                    <span className="text-muted-foreground">
                      Buscar por nome, email ou matrícula...
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 border-white/10 bg-black/95 backdrop-blur-2xl"
                align="start"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Digite para buscar..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="border-none focus:ring-0 h-12"
                  />
                  <CommandList>
                    <CommandEmpty>
                      {usersLoading ? (
                        <div className="flex items-center justify-center p-4 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin mr-3" />
                          Buscando na Base Orion...
                        </div>
                      ) : (
                        "Nenhum usuário encontrado."
                      )}
                    </CommandEmpty>
                    <CommandGroup
                      heading={
                        searchTerm ? "Busca Global" : "Sugestões Recentes"
                      }
                    >
                      {(searchTerm
                        ? sortedUsers
                        : filteredUsers.slice(0, 10)
                      ).map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.fullName + " " + user.email}
                          onSelect={() => {
                            handleEditUser(user);
                            setOpenSearch(false);
                          }}
                          className="cursor-pointer aria-selected:bg-primary/10 p-3"
                        >
                          <div className="flex flex-col w-full">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">
                                {user.fullName}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] h-4",
                                  getRoleStyle(user.role),
                                )}
                              >
                                {getRoleLabel(user.role)}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground opacity-60">
                              {user.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="outline"
            className={cn(
              "h-12 px-6 border-white/10 bg-black/40 hover:bg-white/5 transition-all",
              selectedIds.size > 0 &&
                "border-primary/50 text-primary bg-primary/5",
            )}
            onClick={toggleSelectAll}
          >
            {selectedIds.size === sortedUsers.length &&
            sortedUsers.length > 0 ? (
              <XCircle className="w-5 h-5 mr-2" />
            ) : (
              <CheckSquare className="w-5 h-5 mr-2" />
            )}
            <span className="font-bold">
              {selectedIds.size === sortedUsers.length && sortedUsers.length > 0
                ? "Desmarcar Todos"
                : "Selecionar Tudo"}
            </span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Novos Filtros Estilizados */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("all_combined")}
              className={cn(
                "h-9 px-4 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-300",
                viewMode === "all_combined"
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-white/5",
              )}
            >
              <User className="w-3.5 h-3.5 mr-2" />
              Geral
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("app_management")}
              className={cn(
                "h-9 px-4 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-300",
                viewMode === "app_management"
                  ? "bg-amber-500 text-white shadow-[0_0_15px_-3px_rgba(245,158,11,0.5)]"
                  : "text-muted-foreground hover:bg-white/5",
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-2" />
              Gestão do App
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewMode("search");
                if (!searchTerm) setOpenSearch(true);
              }}
              className={cn(
                "h-9 px-4 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-300",
                viewMode === "search"
                  ? "bg-blue-500 text-white shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]"
                  : "text-muted-foreground hover:bg-white/5",
              )}
            >
              <Search className="w-3.5 h-3.5 mr-2" />
              Resultado de Busca
            </Button>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

          <Select
            value={filterType}
            onValueChange={(v: "all" | "corporate" | "external") =>
              setFilterType(v)
            }
          >
            <SelectTrigger className="w-[180px] h-9 industrial-input bg-black/40 border-white/10 data-[state=open]:border-primary/50 transition-colors text-[11px] font-bold uppercase tracking-wider">
              <SelectValue placeholder="Tipo de Usuário" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-black/95">
              <SelectItem
                value="all"
                className="focus:bg-primary/20 focus:text-primary cursor-pointer font-bold text-[10px] uppercase tracking-wider"
              >
                Todos os Cargos
              </SelectItem>
              <SelectItem
                value="corporate"
                className="focus:bg-primary/20 focus:text-primary cursor-pointer font-bold text-[10px] uppercase tracking-wider"
              >
                Corporativo
              </SelectItem>
              <SelectItem
                value="external"
                className="focus:bg-primary/20 focus:text-primary cursor-pointer font-bold text-[10px] uppercase tracking-wider"
              >
                Canteiro / Obra
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm font-medium text-muted-foreground/60 px-2 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {filteredUsers.length}{" "}
            {filteredUsers.length === 1 ? "usuário" : "usuários"}
          </div>

          {selectedIds.size > 0 && canDelete && (
            <Button
              variant="ghost"
              className="h-11 text-destructive hover:bg-destructive/10 animate-in fade-in zoom-in duration-300"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Selecionados ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {sortedUsers.map((user) => {
          can("users.manage"); // Apenas para checar permissão se necessário
          return (
            <Card
              key={user.id}
              className={cn(
                "glass-card hover-lift transition-all duration-500 group overflow-hidden border-white/5 relative bg-white/2 backdrop-blur-xl",
                user.isBlocked &&
                  "opacity-60 grayscale-[0.3] border-destructive/10",
              )}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-[80px] group-hover:bg-primary/10 transition-colors duration-700 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full -ml-24 -mb-24 blur-[60px] group-hover:bg-accent/10 transition-colors duration-700 pointer-events-none" />
              <CardHeader className="pb-3 px-6 relative z-10 transition-transform duration-500">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Checkbox
                          checked={selectedIds.has(user.id)}
                          onCheckedChange={() => toggleSelectUser(user.id)}
                          className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>
                      <div
                        className={cn(
                          "w-14 h-14 rounded-full border-2 flex items-center justify-center text-xl font-bold shrink-0 relative overflow-hidden transition-all duration-500",
                          selectedIds.has(user.id)
                            ? "border-primary bg-primary/10 shadow-[0_0_20px_-5px_rgba(var(--primary),0.5)] scale-105"
                            : "border-white/5 bg-muted/40 group-hover:border-primary/40 group-hover:scale-105",
                        )}
                        onClick={() => toggleSelectUser(user.id)}
                      >
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.fullName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <span className="bg-linear-to-br from-white/20 to-transparent w-full h-full flex items-center justify-center">
                            {(user.fullName || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                        {selectedIds.has(user.id) && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center backdrop-blur-[1px] animate-in fade-in duration-300">
                            <Check
                              className="w-7 h-7 text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                              strokeWidth={3}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "truncate transition-all duration-500",
                            isSuperAdminGod(user as UserScope) &&
                              "text-[#ea580c] font-black drop-shadow-[0_0_12px_rgba(234,88,12,0.5)] scale-[1.02] origin-left",
                            isGestaoGlobal(user as UserScope) &&
                              !isSuperAdminGod(user as UserScope) &&
                              "text-yellow-500 font-extrabold drop-shadow-[0_0_8px_rgba(234,179,8,0.3)]",
                            (user.role === "TI_SOFTWARE" ||
                              user.role === "TISOFTWARE") &&
                              "text-purple-500 font-bold font-mono",
                            isProtectedUser(user as UserScope) &&
                              !isSuperAdminGod(user as UserScope) &&
                              "text-orange-400 font-extrabold",
                          )}
                        >
                          {user.fullName}
                        </span>
                        {getUserBadge(user)}
                        {user.isBlocked && (
                          <Badge
                            variant="destructive"
                            className="animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                          >
                            BLOQUEADO
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 group/global">
                          <Building2 className="w-3.5 h-3.5" />
                          {isGestaoGlobal(user as UserScope) ? (
                            <span className="flex items-center gap-1.5 transition-all duration-300">
                              <ShieldAlert className="w-3 h-3 text-emerald-500 animate-pulse" />
                              <span className="text-emerald-500 font-bold tracking-tight">
                                Gestão Global
                              </span>
                            </span>
                          ) : (
                            <span className="opacity-70 group-hover/global:opacity-100 transition-opacity">
                              {companies.find((c) => c.id === user.companyId)
                                ?.name || "Sem Empresa"}
                            </span>
                          )}
                        </span>

                        {/* Technical Flags MOD/IAP - Only if BackEnd allows/provides */}
                        {(user.laborType || user.iapName) && (
                          <div className="flex items-center gap-2">
                            {user.laborType && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 bg-muted/20 border-white/5 text-muted-foreground"
                              >
                                {user.laborType}
                              </Badge>
                            )}
                            {user.iapName && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 bg-amber-500/5 border-amber-500/20 text-amber-500/80"
                              >
                                IAP: {Number(user.iapName).toFixed(4)}
                              </Badge>
                            )}
                          </div>
                        )}

                        {!isCorporateRole(user.role, user as UserScope) && (
                          <>
                            {user.projectId && (
                              <span className="text-xs text-primary flex items-center gap-1">
                                <HardHat className="w-3.5 h-3.5" />
                                {
                                  projects.find((p) => p.id === user.projectId)
                                    ?.name
                                }
                              </span>
                            )}
                            {user.siteId && (
                              <span className="text-xs text-orange-500 flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5" />
                                {sites.find((s) => s.id === user.siteId)?.name}
                              </span>
                            )}
                            {user.registrationNumber && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 bg-primary/5 border-primary/20 text-primary"
                              >
                                MAT: {user.registrationNumber}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Ações Administrativas - Botões Diretos */}
                      <div className="flex items-center gap-1">
                        {/* Editar */}
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0 border-white/10 hover:bg-white/5"
                            onClick={() => handleEditUser(user)}
                            title="Editar Dados"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Alterar Senha */}
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0 border-white/10 hover:bg-primary/10"
                            onClick={() => setUserToChangePassword(user)}
                            title="Alterar Senha"
                          >
                            <Key className="w-3.5 h-3.5 text-primary" />
                          </Button>
                        )}

                        {/* Bloquear/Desbloquear */}
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="icon"
                            className={cn(
                              "h-8 w-8 shrink-0 border-white/10",
                              user.isBlocked
                                ? "hover:bg-emerald-500/10"
                                : "hover:bg-red-500/10",
                            )}
                            onClick={() => handleToggleBlock(user)}
                            disabled={updatingUserId === user.id}
                            title={user.isBlocked ? "Desbloquear" : "Bloquear"}
                          >
                            {user.isBlocked ? (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </Button>
                        )}

                        {/* Excluir */}
                        {canDelete && !isProtectedUser(user) && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0 border-white/10 hover:bg-destructive/10"
                            onClick={() => setUserToDelete(user)}
                            title="Excluir Conta"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>

                      {/* Ícone de Proteção - Visível apenas se o usuário for GOD ou Helper */}
                      {isProtectedUser(user) && (
                        <div
                          className="flex items-center justify-center h-8 w-8"
                          title="Usuário Protegido"
                        >
                          <ShieldCheck className="w-5 h-5 text-orange-500 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Admin Edit Affiliation Dialog */}
      <Dialog
        open={!!userToEditAffiliation}
        onOpenChange={() => setUserToEditAffiliation(null)}
      >
        <DialogContent className="max-w-md bg-black/60 border-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Editar Afiliações
            </DialogTitle>
            <DialogDescription>
              Gerencie a empresa, obra e canteiro vinculados ao usuário{" "}
              <strong>{userToEditAffiliation?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {!isCorporateRole(userToEditAffiliation?.role) && (
              <div className="space-y-2">
                <Label>Empresa Afiliada</Label>
                <Select
                  value={editAffiliationForm.companyId}
                  onValueChange={(val) =>
                    setEditAffiliationForm({
                      ...editAffiliationForm,
                      companyId: val,
                      projectId: "",
                      siteId: "",
                    })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma Empresa</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isCorporateRole(
              userToEditAffiliation?.role,
              userToEditAffiliation as UserScope,
            ) && (
              <>
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label>Obra Vinculada</Label>
                  <Select
                    value={editAffiliationForm.projectId}
                    onValueChange={(val) =>
                      setEditAffiliationForm({
                        ...editAffiliationForm,
                        projectId: val,
                        siteId: "",
                      })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione a obra..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma Obra</SelectItem>
                      {projects
                        .filter(
                          (p) =>
                            !editAffiliationForm.companyId ||
                            editAffiliationForm.companyId === "none" ||
                            p.companyId === editAffiliationForm.companyId,
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label>Canteiro Vinculado</Label>
                  <Select
                    value={editAffiliationForm.siteId}
                    onValueChange={(val) =>
                      setEditAffiliationForm({
                        ...editAffiliationForm,
                        siteId: val,
                      })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Selecione o canteiro..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum Canteiro</SelectItem>
                      {sites
                        .filter((s) => {
                          if (
                            !editAffiliationForm.companyId ||
                            editAffiliationForm.companyId === "none"
                          )
                            return true;
                          const project = projects.find(
                            (p) => p.id === s.projectId,
                          );
                          return (
                            project?.companyId === editAffiliationForm.companyId
                          );
                        })
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({getProjectName(s.projectId, projects)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4">
              <Button
                variant="ghost"
                onClick={() => setUserToEditAffiliation(null)}
              >
                Cancelar
              </Button>
              <Button
                className="gradient-primary"
                onClick={handleUpdateAffiliation}
                disabled={isUpdatingAffiliation}
              >
                {isUpdatingAffiliation && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!userToEdit} onOpenChange={() => setUserToEdit(null)}>
        <DialogContent className="max-w-3xl bg-black/60 border-white/5 backdrop-blur-3xl rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Edite todas as informações do usuário{" "}
              <strong>{userToEdit?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Accordion
              type="single"
              collapsible
              defaultValue="identification"
              className="w-full space-y-2"
            >
              {/* Identificação */}
              <AccordionItem value="identification" className="border-none">
                <AccordionTrigger className="hover:no-underline py-3 px-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-primary/5 data-[state=open]:border-primary/20 group text-[10px] uppercase font-bold tracking-widest">
                  <div className="flex items-center gap-2 text-primary">
                    <User className="w-4 h-4" />
                    Identificação (Login)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-black/10 border-x border-b border-white/5 rounded-b-2xl px-6 py-8 -mt-px space-y-6">
                  {/* Avatar Edit Selection */}
                  <div className="flex flex-col items-center gap-2">
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="relative group cursor-pointer">
                              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center transition-all group-hover:border-primary/50 shadow-lg">
                                {editUserForm.image ? (
                                  <img
                                    src={editUserForm.image}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <Camera className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="center"
                            className="w-48 bg-black/90 backdrop-blur-xl border-primary/20"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                document
                                  .getElementById("edit-image-upload")
                                  ?.click()
                              }
                              className="cursor-pointer gap-2"
                            >
                              <ImageIcon className="w-4 h-4" /> Alterar Foto
                            </DropdownMenuItem>
                            {editUserForm.image && (
                              <DropdownMenuItem
                                onClick={() => handleRemovePhoto("edit")}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <TrashIcon className="w-4 h-4" /> Remover Foto
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48 bg-black/90 backdrop-blur-xl border-primary/20">
                        <ContextMenuItem
                          onClick={() =>
                            document
                              .getElementById("edit-image-upload")
                              ?.click()
                          }
                          className="cursor-pointer gap-2"
                        >
                          <ImageIcon className="w-4 h-4" /> Alterar Foto
                        </ContextMenuItem>
                        {editUserForm.image && (
                          <ContextMenuItem
                            onClick={() => handleRemovePhoto("edit")}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <TrashIcon className="w-4 h-4" /> Remover Foto
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                    <input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, "edit")}
                    />
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                      Clique para Foto
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-name"
                        className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                      >
                        Nome Completo *
                      </Label>
                      <Input
                        id="edit-name"
                        value={editUserForm.fullName}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            fullName: e.target.value,
                          })
                        }
                        className="bg-white/5 border-white/10"
                        placeholder="Nome do usuário"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-email"
                        className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                      >
                        Email (Login) *
                      </Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editUserForm.email}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            email: e.target.value,
                          })
                        }
                        className="bg-white/5 border-white/10"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    {/* Show Registration Number ONLY if not in Admin View */}
                    {!showOnlyCorporate &&
                      !isCorporateRole(
                        editUserForm.role,
                        editUserForm as unknown as UserScope,
                      ) && (
                        <div className="space-y-2">
                          <Label
                            htmlFor="edit-registration"
                            className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                          >
                            Matrícula (Login alternativo)
                          </Label>
                          <Input
                            id="edit-registration"
                            placeholder="Ex: 100200"
                            className="bg-white/5 border-white/10"
                            value={editUserForm.registrationNumber}
                            onChange={(e) =>
                              setEditUserForm({
                                ...editUserForm,
                                registrationNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Security - Only shown for Admins or if in Admin View per user request */}
              {showOnlyCorporate && (
                <AccordionItem value="security" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-2 px-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-red-500/5 data-[state=open]:border-red-500/20 group text-[10px] uppercase font-black tracking-widest">
                    <div className="flex items-center gap-2 text-red-500">
                      <Key className="w-4 h-4" />
                      Segurança (Senha)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-black/20 border-x border-b border-white/10 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-password"
                        className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                      >
                        Nova Senha (Opcional)
                      </Label>
                      <Input
                        id="edit-password"
                        type="text"
                        value={editUserForm.password}
                        onChange={(e) =>
                          setEditUserForm({
                            ...editUserForm,
                            password: e.target.value,
                          })
                        }
                        className="bg-white/5 border-white/10"
                        placeholder="Deixe em branco para não alterar"
                        autoComplete="new-password"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Digite para redefinir a senha deste administrador.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Acesso & Segurança */}
              <AccordionItem value="access" className="border-none">
                <AccordionTrigger className="hover:no-underline py-2 px-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-primary/5 data-[state=open]:border-primary/20 group text-[10px] uppercase font-black tracking-widest">
                  <div className="flex items-center gap-2 text-primary">
                    <Key className="w-4 h-4" />
                    Acesso & Segurança
                  </div>
                </AccordionTrigger>
                <AccordionContent className="bg-black/20 border-x border-b border-white/10 rounded-b-lg px-4 py-6 -mt-px space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                      Nível de Acesso
                    </Label>
                    <Select
                      value={editUserForm.role}
                      onValueChange={(val: string) =>
                        setEditUserForm({
                          ...editUserForm,
                          role: val,
                          projectId: "none",
                          siteId: "none",
                        })
                      }
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10">
                        {STANDARD_ROLES.map((r) => (
                          <SelectItem
                            key={r.name}
                            value={r.name.toUpperCase()}
                            disabled={r.name === "HELPER_SYSTEM"}
                            className={
                              r.name === "HELPER_SYSTEM"
                                ? " text-center line-through opacity-50 "
                                : " text-center"
                            }
                          >
                            {getRoleLabel(r.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="is-system-admin"
                      checked={editUserForm.isSystemAdmin}
                      onCheckedChange={(checked) =>
                        setEditUserForm({
                          ...editUserForm,
                          isSystemAdmin: checked === true,
                        })
                      }
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="is-system-admin"
                        className="text-[10px] uppercase text-muted-foreground font-black tracking-widest cursor-pointer"
                      >
                        Administrador do Sistema (System Admin)
                      </Label>
                      <p className="text-[10px] text-muted-foreground/70">
                        Concede acesso completo a todos os dados e configurações
                        do sistema.
                        <span className="text-red-400 font-bold ml-1">
                          Cuidado!
                        </span>
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Afiliação e Contexto - Hide for Admins (showOnlyCorporate) */}
              {!showOnlyCorporate &&
                !isCorporateRole(
                  editUserForm.role,
                  editUserForm as unknown as UserScope,
                ) && (
                  <AccordionItem value="affiliation" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-3 px-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-sky-500/5 data-[state=open]:border-sky-500/20 group text-[10px] uppercase font-bold tracking-widest">
                      <div className="flex items-center gap-2 text-sky-500">
                        <Building2 className="w-4 h-4" />
                        Afiliação & Contexto
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="bg-black/10 border-x border-b border-white/5 rounded-b-2xl px-6 py-8 -mt-px space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Empresa Afiliada
                        </Label>
                        <Select
                          value={editUserForm.companyId}
                          onValueChange={(val) =>
                            setEditUserForm({
                              ...editUserForm,
                              companyId: val,
                              projectId: "none",
                              siteId: "none",
                            })
                          }
                        >
                          <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-white/10">
                            <SelectItem value="none">
                              Nenhuma Empresa
                            </SelectItem>
                            {companies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Obra Vinculada
                        </Label>
                        <Select
                          value={editUserForm.projectId}
                          onValueChange={(val) =>
                            setEditUserForm({
                              ...editUserForm,
                              projectId: val,
                              siteId: "none",
                            })
                          }
                        >
                          <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Selecione a obra..." />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-white/10">
                            <SelectItem value="none">Nenhuma Obra</SelectItem>
                            {projects
                              .filter(
                                (p) =>
                                  !editUserForm.companyId ||
                                  editUserForm.companyId === "none" ||
                                  p.companyId === editUserForm.companyId,
                              )
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Canteiro Vinculado
                        </Label>
                        <Select
                          value={editUserForm.siteId}
                          onValueChange={(val) =>
                            setEditUserForm({ ...editUserForm, siteId: val })
                          }
                        >
                          <SelectTrigger className="bg-white/5 border-white/10">
                            <SelectValue placeholder="Selecione o canteiro..." />
                          </SelectTrigger>
                          <SelectContent className="glass-card border-white/10">
                            <SelectItem value="none">
                              Nenhum Canteiro
                            </SelectItem>
                            {sites
                              .filter((s) => {
                                if (
                                  !editUserForm.companyId ||
                                  editUserForm.companyId === "none"
                                )
                                  return true;
                                const project = projects.find(
                                  (p) => p.id === s.projectId,
                                );
                                return (
                                  project?.companyId ===
                                  (editUserForm.companyId === "none"
                                    ? null
                                    : editUserForm.companyId)
                                );
                              })
                              .map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} (
                                  {getProjectName(s.projectId, projects)})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Separador Visual e Campos Extras de Afiliação */}
                      <div className="relative pt-4 pb-2">
                        <div
                          className="absolute inset-0 flex items-center"
                          aria-hidden="true"
                        >
                          <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-background px-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            Detalhes Operacionais
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                            Mão de Obra
                          </Label>
                          <Select
                            value={editUserForm.laborType}
                            onValueChange={(val) =>
                              setEditUserForm({
                                ...editUserForm,
                                laborType: val,
                              })
                            }
                          >
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue placeholder="Selecione..." />
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
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                            IAP
                          </Label>
                          <Select
                            value={editUserForm.iapName}
                            onValueChange={(val) =>
                              setEditUserForm({ ...editUserForm, iapName: val })
                            }
                          >
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="glass-card border-white/10">
                              {iaps.map((iap) => (
                                <SelectItem
                                  key={iap.id}
                                  value={String(iap.iap)}
                                >
                                  {Number(iap.iap).toFixed(4)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

              {/* Dados Pessoais & Endereço - Hide for Admins (showOnlyCorporate) */}
              {!showOnlyCorporate && (
                <AccordionItem value="personal" className="border-none">
                  <AccordionTrigger className="hover:no-underline py-3 px-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all data-[state=open]:rounded-b-none data-[state=open]:bg-emerald-500/5 data-[state=open]:border-emerald-500/20 group text-[10px] uppercase font-bold tracking-widest">
                    <div className="flex items-center gap-2 text-emerald-500">
                      <ShieldCheck className="w-4 h-4" />
                      Dados Pessoais & Endereço
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-black/10 border-x border-b border-white/5 rounded-b-2xl px-6 py-8 -mt-px space-y-6">
                    {/* Documentos */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          CPF
                        </Label>
                        <Input
                          value={editUserForm.cpf}
                          onChange={(e) =>
                            handleInputChange(
                              "cpf",
                              e.target.value,
                              "edit",
                              "cpf",
                            )
                          }
                          className={cn(
                            "industrial-input",
                            errors.edit_cpf && "border-red-500/50",
                          )}
                          placeholder="000.000.000-00"
                        />
                        {errors.edit_cpf && (
                          <span className="text-[10px] text-red-400 font-bold">
                            {errors.edit_cpf}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Data Nasc.
                        </Label>
                        <Input
                          value={editUserForm.birthDate}
                          onChange={(e) =>
                            handleInputChange(
                              "birthDate",
                              e.target.value,
                              "edit",
                              "date",
                            )
                          }
                          className="bg-white/5 border-white/10"
                          placeholder="DD/MM/AAAA"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    {/* Contato Principal */}
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                        Telefone / Celular
                      </Label>
                      <Input
                        value={editUserForm.phone}
                        onChange={(e) =>
                          handleInputChange(
                            "phone",
                            e.target.value,
                            "edit",
                            "phone",
                          )
                        }
                        className={cn(
                          "industrial-input",
                          errors.edit_phone && "border-red-500/50",
                        )}
                        placeholder="(00) 00000-0000"
                      />
                      {errors.edit_phone && (
                        <span className="text-[10px] text-red-400 font-bold">
                          {errors.edit_phone}
                        </span>
                      )}
                    </div>

                    <div className="h-px bg-white/10 my-2" />

                    {/* Endereço */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1 col-span-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          CEP
                        </Label>
                        <Input
                          value={editUserForm.cep}
                          onChange={(e) =>
                            handleInputChange(
                              "cep",
                              e.target.value,
                              "edit",
                              "cep",
                            )
                          }
                          onBlur={(e) => handleCepBlur("edit", e.target.value)}
                          className="bg-white/5 border-white/10"
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Rua / Logradouro
                        </Label>
                        <Input
                          value={editUserForm.street}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              street: e.target.value,
                            })
                          }
                          className="bg-white/5 border-white/10"
                          placeholder="Rua..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-1 col-span-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Número
                        </Label>
                        <Input
                          value={editUserForm.number}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              number: e.target.value,
                            })
                          }
                          className="bg-white/5 border-white/10"
                          placeholder="Nº"
                        />
                      </div>
                      <div className="space-y-1 col-span-3">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Bairro
                        </Label>
                        <Input
                          value={editUserForm.neighborhood}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              neighborhood: e.target.value,
                            })
                          }
                          className="bg-white/5 border-white/10"
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1 col-span-2">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          Cidade
                        </Label>
                        <Input
                          value={editUserForm.city}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              city: e.target.value,
                            })
                          }
                          className="bg-white/5 border-white/10"
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                          UF
                        </Label>
                        <Input
                          value={editUserForm.state}
                          onChange={(e) =>
                            setEditUserForm({
                              ...editUserForm,
                              state: e.target.value,
                            })
                          }
                          className="bg-white/5 border-white/10"
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="edit-gender"
                        className="text-[10px] uppercase text-muted-foreground font-black tracking-widest"
                      >
                        Gênero
                      </Label>
                      <Select
                        value={editUserForm.gender || "none"}
                        onValueChange={(val) =>
                          setEditUserForm({
                            ...editUserForm,
                            gender:
                              val === "none"
                                ? ""
                                : (val as "MALE" | "FEMALE" | "OTHER"),
                          })
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/10">
                          <SelectItem value="none">Não informado</SelectItem>
                          <SelectItem value="MALE">Masculino</SelectItem>
                          <SelectItem value="FEMALE">Feminino</SelectItem>
                          <SelectItem value="OTHER">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button variant="ghost" onClick={() => setUserToEdit(null)}>
                Cancelar
              </Button>
              <Button
                className="gradient-primary"
                onClick={handleUpdateUser}
                disabled={
                  isUpdatingUser ||
                  !editUserForm.fullName ||
                  !editUserForm.email
                }
              >
                {isUpdatingUser && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Direct Password Change Dialog - Enhanced with Generator */}
      <Dialog
        open={!!userToChangePassword}
        onOpenChange={() => setUserToChangePassword(null)}
      >
        <DialogContent className="p-0 border-none bg-transparent max-w-md">
          {userToChangePassword && (
            <PasswordGenerator
              isSaving={isChangingPassword}
              onSave={async (newPwd) => {
                setIsChangingPassword(true);
                const result = await adminChangePassword(
                  userToChangePassword.id,
                  newPwd,
                );
                setIsChangingPassword(false);
                if (result.success) {
                  setUserToChangePassword(null);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialogs */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={() => setUserToDelete(null)}
      >
        <AlertDialogContent className="glass-card border-destructive/20 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir permanentemente o usuário{" "}
              <strong>{userToDelete?.fullName}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleConfirmDelete(userToDelete)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!userToReset}
        onOpenChange={() => setUserToReset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Enviar link de recuperação por e-mail para{" "}
              <strong>{userToReset?.email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToReset && handleResetPassword(userToReset)}
              className="gradient-primary text-white"
            >
              Enviar Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Adjustment Dialog */}
      <Dialog open={isAdjustingPhoto} onOpenChange={setIsAdjustingPhoto}>
        <DialogContent className="max-w-xl bg-black/95 backdrop-blur-2xl border-primary/30 shadow-[0_0_50px_-12px_rgba(234,179,8,0.3)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ZoomIn className="w-5 h-5 text-primary" /> Ajustar Foto
            </DialogTitle>
            <DialogDescription>
              Posicione e dê zoom para enquadrar perfeitamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-6">
            {/* Rectangular Viewport with Circular Mask Overlay */}
            <div className="photo-adjustment-viewport w-96 h-96 overflow-hidden rounded-xl border border-white/10 bg-black/50 relative shadow-2xl mx-auto select-none touch-none">
              {/* The Image Stage - Draggable Area */}
              <div
                className="photo-adjustment-image-stage w-full h-full flex items-center justify-center cursor-move active:cursor-grabbing"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.pageX - photoConfig.x;
                  const startY = e.pageY - photoConfig.y;

                  const handleMouseMove = (mv: MouseEvent) => {
                    mv.preventDefault();
                    setPhotoConfig((prev) => ({
                      ...prev,
                      x: mv.pageX - startX,
                      y: mv.pageY - startY,
                    }));
                  };

                  const handleMouseUp = () => {
                    window.removeEventListener("mousemove", handleMouseMove);
                    window.removeEventListener("mouseup", handleMouseUp);
                  };

                  window.addEventListener("mousemove", handleMouseMove);
                  window.addEventListener("mouseup", handleMouseUp);
                }}
              >
                <img
                  src={imageToAdjust || ""}
                  alt="Adjust"
                  className="max-w-none transition-transform duration-75 select-none pointer-events-none"
                  style={{
                    transform: `scale(${photoConfig.zoom}) translate(${photoConfig.x}px, ${photoConfig.y}px)`,
                  }}
                  draggable={false}
                />
              </div>

              {/* Circular Mask Overlay (Darkens outside, clear inside) */}
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background:
                    "radial-gradient(circle at center, transparent 150px, rgba(0,0,0,0.85) 151px)",
                }}
              ></div>

              {/* Cut Guide Ring (Visual Indicator of Crop Area) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 border-white/30 pointer-events-none z-20 shadow-[0_0_0_999px_rgba(0,0,0,0.5)] opacity-50"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-primary/50 pointer-events-none z-30"></div>
            </div>

            <div className="w-full space-y-4 px-4">
              <div className="flex items-center gap-3">
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[photoConfig.zoom]}
                  min={1}
                  max={3}
                  step={0.01}
                  onValueChange={([v]) =>
                    setPhotoConfig((prev) => ({ ...prev, zoom: v }))
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Move className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPhotoConfig((prev) => ({ ...prev, x: 0, y: 0 }))
                    }
                    className="text-[10px] h-7 px-2"
                  >
                    RESETA POSIÇÃO
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPhotoConfig((prev) => ({ ...prev, zoom: 1 }))
                    }
                    className="text-[10px] h-7 px-2"
                  >
                    RESETA ZOOM
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="ghost" onClick={() => setIsAdjustingPhoto(false)}>
              Cancelar
            </Button>
            <Button
              className="gradient-primary text-white"
              onClick={handleApplyAdjustment}
            >
              Aplicar Foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Alteração de Cargo */}
      <Dialog
        open={!!userToChangeRole}
        onOpenChange={(open) => !open && setUserToChangeRole(null)}
      >
        <DialogContent className="sm:max-w-lg bg-linear-to-br from-black via-zinc-900 to-black border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Alterar Nível de Acesso
            </DialogTitle>
            <DialogDescription>
              Selecione o novo cargo para{" "}
              <span className="text-center font-semibold text-white">
                {userToChangeRole?.fullName}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 py-4">
            {STANDARD_ROLES.filter((r) => r.name !== "HELPER_SYSTEM").map(
              (r) => (
                <Button
                  key={r.name}
                  variant="outline"
                  className={cn(
                    "h-auto py-3 px-4 flex flex-col items-start gap-1 border transition-all",
                    r.name.toUpperCase() === userToChangeRole?.role
                      ? "bg-primary/20 border-primary ring-2 ring-primary/50"
                      : "hover:bg-white/5 border-white/10",
                  )}
                  disabled={updatingUserId === userToChangeRole?.id}
                  onClick={async () => {
                    if (
                      !userToChangeRole ||
                      r.name.toUpperCase() === userToChangeRole.role
                    )
                      return;
                    setUpdatingUserId(userToChangeRole.id);
                    const result = await updateUser(userToChangeRole.id, {
                      role: r.name.toUpperCase(),
                    });
                    setUpdatingUserId(null);
                    if (result.success) {
                      toast({
                        title: "Cargo atualizado",
                        description: `${userToChangeRole.fullName} agora é ${getRoleLabel(r.name)}`,
                      });
                      setUserToChangeRole(null);
                    } else {
                      toast({
                        title: "Erro ao atualizar",
                        description: result.error,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <span
                    className={cn("font-medium text-sm", getRoleStyle(r.name))}
                  >
                    {getRoleLabel(r.name)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Nível {r.rank}
                  </span>
                </Button>
              ),
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button variant="ghost" onClick={() => setUserToChangeRole(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getProjectName(id: string, projects: Project[]) {
  return projects.find((p) => p.id === id)?.name || "";
}


