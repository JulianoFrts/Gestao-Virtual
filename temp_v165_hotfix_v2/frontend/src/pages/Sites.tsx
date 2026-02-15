import React, { useState, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useSites, Site } from "@/hooks/useSites";
import { useProjects } from "@/hooks/useProjects";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Truck,
  Search,
  Loader2,
  Info,
  HardHat,
  Pencil,
  Trash2,
  UserCircle,
  Briefcase,
  LayoutGrid,
  MapPin,
  Clock,
  Lock,
  Building2,
} from "lucide-react";
import { ProjectEmptyState } from "@/components/shared/ProjectEmptyState";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { isCorporateRole } from "@/utils/permissionHelpers";
import { isProtectedSignal, can } from "@/signals/authSignals";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { useSignals } from "@preact/signals-react/runtime";
import {
  AddressAutocomplete,
  AddressData,
} from "@/components/shared/AddressAutocomplete";
import {
  ResponsibleSelector,
  Responsible,
} from "@/components/shared/ResponsibleSelector";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function Sites() {
  useSignals();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    sites,
    isLoading: sitesLoading,
    createSite,
    updateSite,
    deleteSite,
  } = useSites();
  const { projects, isLoading: projectsLoading } = useProjects();
  const userFilters = React.useMemo(
    () => ({
      companyId: profile?.companyId || undefined,
    }),
    [profile?.companyId],
  );
  const { users, isLoading: usersLoading } = useUsers(userFilters);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    projectId: "",
    locationDetails: "",
    plannedHours: 0,
    xLat: 0 as string | number,
    yLa: 0 as string | number,
    responsibleIds: [] as string[],
  });
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
    onConfirm: () => {},
    variant: "default",
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const { toast } = useToast();

  // Check if user can manage sites (create, edit, delete)
  const canCreateSites = isProtectedSignal.value || can("sites.create");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.projectId) {
      toast({
        title: "Aviso",
        description: "Nome e Obra são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = {
        ...formData,
        plannedHours: Number(formData.plannedHours),
        xLat: formData.xLat ? Number(formData.xLat) : null,
        yLa: formData.yLa ? Number(formData.yLa) : null,
      };

      if (editingSite) {
        const result = await updateSite(editingSite.id, dataToSave);
        if (result.success) {
          toast({ title: "Canteiro atualizado!" });
          resetForm();
        }
      } else {
        const result = await createSite(dataToSave);
        if (result.success) {
          toast({ title: "Canteiro cadastrado!" });
          resetForm();
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      projectId: site.projectId,
      locationDetails: site.locationDetails || "",
      plannedHours: site.plannedHours || 0,
      xLat: site.xLat || 0,
      yLa: site.yLa || 0,
      responsibleIds: (site as any).responsibleIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (site: Site) => {
    setConfirmModal({
      open: true,
      title: "Excluir Canteiro",
      description: `Deseja realmente excluir o canteiro "${site.name}"? Esta ação não pode ser desfeita e removerá todos os registros associados.`,
      variant: "destructive",
      onConfirm: async () => {
        const result = await deleteSite(site.id);
        if (result.success) {
          toast({ title: "Canteiro excluído!" });
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      projectId: "",
      locationDetails: "",
      plannedHours: 0,
      xLat: 0,
      yLa: 0,
      responsibleIds: [],
    });
    setEditingSite(null);
    setIsDialogOpen(false);
  };

  const getProjectName = (id: string) =>
    projects.find((p) => p.id === id)?.name || "Obra desconhecida";

  const getProjectManagers = (projectId: string) => {
    return users.filter(
      (u) => u.role === "GESTOR_PROJECT" && u.projectId === projectId,
    );
  };

  const getSiteManagers = (siteId: string) => {
    return users.filter(
      (u) => u.role === "GESTOR_CANTEIRO" && u.siteId === siteId,
    );
  };

  // Group sites by project
  const groupedSites = useMemo(() => {
    let filtered = sites.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProjectName(s.projectId)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );

    // Filter by selected Project from Selector
    if (selectedProjectId && selectedProjectId !== "all") {
      filtered = filtered.filter((s) => s.projectId === selectedProjectId);
    }

    const groups: Record<string, Site[]> = {};
    filtered.forEach((site) => {
      if (!groups[site.projectId]) {
        groups[site.projectId] = [];
      }
      groups[site.projectId].push(site);
    });
    return groups;
  }, [sites, searchTerm, projects, selectedProjectId]);

  if (sitesLoading || projectsLoading || usersLoading) {
    return (
      <LoadingScreen
        isLoading={true}
        title="GESTÃO DE CANTEIROS"
        message="SINCRONIZANDO DADOS"
        details={[
          { label: "Canteiros", isLoading: sitesLoading },
          { label: "Obras", isLoading: projectsLoading },
          { label: "Usuários", isLoading: usersLoading },
        ]}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">
            Gestão de Canteiros
          </h1>
          <p className="text-muted-foreground">
            Gerencie as frentes de trabalho organizadas por obra
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-[250px]">
            <ProjectSelector
              value={selectedProjectId || ""}
              onValueChange={setSelectedProjectId}
              showAll={true}
            />
          </div>
        </div>
        {canCreateSites && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white shadow-glow">
                <Plus className="w-4 h-4 mr-2" />
                Novo Canteiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                    <Truck className="text-white w-6 h-6" />
                  </div>
                  {editingSite ? "Editar Canteiro" : "Novo Canteiro"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground pt-1">
                  Configure as áreas de trabalho vinculadas às obras.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                {/* Seção: Vínculo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                    <HardHat className="w-4 h-4" />
                    Vínculo
                  </div>
                  <Separator className="bg-white/10" />

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-bold">
                      Obra Correspondente *
                    </Label>
                    <Select
                      value={formData.projectId}
                      onValueChange={(val) =>
                        setFormData({ ...formData, projectId: val })
                      }
                    >
                      <SelectTrigger className="industrial-input h-10">
                        <SelectValue placeholder="Selecione a obra" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10">
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Seção: Identificação */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-orange-500 font-semibold text-sm uppercase tracking-wider">
                    <LayoutGrid className="w-4 h-4" />
                    Identificação do Canteiro
                  </div>
                  <Separator className="bg-white/10" />

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-bold">
                      Nome do Canteiro *
                    </Label>
                    <div className="relative">
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="industrial-input h-10 pr-10"
                        required
                        placeholder="Ex: Canteiro Sul, Torre A..."
                        disabled={
                          editingSite &&
                          !(isProtectedSignal.value || can("sites.rename"))
                        }
                      />
                      {editingSite &&
                        !(isProtectedSignal.value || can("sites.rename")) && (
                          <Lock className="absolute right-3 top-2.5 w-4 h-4 text-orange-500/50" />
                        )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-bold italic">
                        HHH Planejado
                      </Label>
                      <Input
                        type="number"
                        value={formData.plannedHours}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            plannedHours: Number(e.target.value),
                          })
                        }
                        className="industrial-input h-10"
                        placeholder="Total Horas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-bold">
                        Localização
                      </Label>
                      <Input
                        value={formData.locationDetails}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            locationDetails: e.target.value,
                          })
                        }
                        className="industrial-input h-10"
                        placeholder="Ex: Térreo"
                      />
                    </div>
                  </div>

                  {/* Gestão de Responsáveis (Retângulo Preto) */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs uppercase text-muted-foreground font-bold">
                      Responsáveis pelo Canteiro
                    </Label>
                    <ResponsibleSelector
                      users={
                        users.filter(
                          (u) =>
                            u.role === "GESTOR_CANTEIRO" ||
                            u.role === "GESTOR_PROJECT",
                        ) as Responsible[]
                      }
                      selectedIds={formData.responsibleIds}
                      onSelectionChange={(ids) =>
                        setFormData({ ...formData, responsibleIds: ids })
                      }
                      placeholder="Selecionar gestores..."
                    />
                  </div>
                </div>

                {/* Seção: Localização (Retângulo Azul) */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm uppercase tracking-wider">
                    <MapPin className="w-4 h-4" />
                    Localização Geográfica
                  </div>
                  <Separator className="bg-white/10" />

                  <TooltipProvider>
                    <AddressAutocomplete
                      value={formData.locationDetails}
                      latitude={formData.xLat}
                      longitude={formData.yLa}
                      onAddressChange={(data: AddressData) => {
                        setFormData((prev) => ({
                          ...prev,
                          locationDetails: data.formattedAddress,
                          xLat: data.latitude ?? prev.xLat,
                          yLa: data.longitude ?? prev.yLa,
                        }));
                      }}
                      placeholder="Buscar endereço do canteiro..."
                    />
                  </TooltipProvider>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 h-11 border-white/10"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 gradient-primary shadow-glow"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingSite ? "Salvar Alterações" : "Cadastrar Canteiro"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por canteiro ou obra..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 industrial-input"
        />
      </div>

      <div className="space-y-10">
        {!projects || projects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <ProjectEmptyState
              type="generic"
              title="Nenhuma Obra Atribuída"
              description="Sua empresa ainda não possui obras cadastradas. Cadastre ou vincule uma obra para gerenciar seus canteiros."
              onAction={() => navigate("/obras")}
              actionLabel="Gerenciar Obras"
            />
          </div>
        ) : Object.keys(groupedSites).length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <ProjectEmptyState
              type="sites"
              title={
                selectedProjectId && selectedProjectId !== "all"
                  ? "Nenhum Canteiro nesta Obra"
                  : "Nenhum Canteiro Encontrado"
              }
              description={
                selectedProjectId && selectedProjectId !== "all"
                  ? "Esta obra ainda não possui canteiros cadastrados."
                  : "Ainda não foram criados canteiros para as suas obras. Inicie as operações criando o primeiro canteiro."
              }
              onAction={() => setIsDialogOpen(true)}
              actionLabel="Criar Primeiro Canteiro"
            />
          </div>
        ) : (
          Object.entries(groupedSites).map(([projectId, projectSites]) => {
            const projectName = getProjectName(projectId);
            return (
              <div key={projectId} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <div className="flex items-center gap-2 group cursor-default">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm">
                      <HardHat className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors italic">
                      {projectName}
                    </h2>
                  </div>
                  <div className="flex-1 h-px bg-linear-to-r from-primary/30 to-transparent" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 bg-muted/10 px-2 py-0.5 rounded">
                    {projectSites.length}{" "}
                    {projectSites.length === 1 ? "Canteiro" : "Canteiros"}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projectSites.map((site) => {
                    const projectManagers = getProjectManagers(site.projectId);
                    const siteManagers = getSiteManagers(site.id);

                    return (
                      <Card
                        key={site.id}
                        className="group relative overflow-hidden glass-card border-white/5 hover:border-primary/20 transition-all duration-300"
                      >
                        <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {(() => {
                            const canEdit =
                              isProtectedSignal.value ||
                              can("sites.rename") ||
                              can("sites.update");
                            const canDel =
                              isProtectedSignal.value || can("sites.delete");

                            if (!canEdit && !canDel) {
                              return (
                                <div
                                  className="h-8 flex items-center px-2 backdrop-blur-sm bg-black/20 rounded text-white/30"
                                  title="Sem permissão hierárquica"
                                >
                                  <Lock className="w-3.5 h-3.5 mr-1" />
                                  <span className="text-[10px] uppercase font-bold">
                                    Leitura
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <>
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary backdrop-blur-sm bg-black/20"
                                    onClick={() => handleEdit(site)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDel && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive backdrop-blur-sm bg-black/20"
                                    onClick={() => handleDelete(site)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <CardHeader className="pb-3 px-6 pt-6">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Truck className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {site.name}
                              </CardTitle>
                              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                <LayoutGrid className="w-3 h-3" />
                                Unidade de Trabalho
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5 px-6 pb-6">
                          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-black text-muted-foreground/60 italic">
                                Meta HHH
                              </p>
                              <p className="text-sm font-black flex items-center gap-1.5 text-primary">
                                <Clock className="w-3.5 h-3.5" />
                                {site.plannedHours?.toLocaleString() || "0"}h
                              </p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-[10px] uppercase font-black text-muted-foreground/60 italic">
                                Status
                              </p>
                              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Ativo
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary/40" />
                              <span className="truncate italic">
                                {site.locationDetails ||
                                  "Nenhum detalhe adicional"}
                              </span>
                            </div>

                            <div className="pt-3 mt-2 border-t border-white/5 space-y-3">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">
                                  Gestor da Obra
                                </span>
                                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                  <UserCircle className="w-4 h-4 text-blue-400" />
                                  <span className="text-xs font-semibold text-foreground/90">
                                    {projectManagers.length > 0
                                      ? projectManagers
                                          .map((m) => m.fullName)
                                          .join(", ")
                                      : "Não atribuído"}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">
                                  Gestor do Canteiro
                                </span>
                                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-orange-500/5 border border-orange-500/10">
                                  <Briefcase className="w-4 h-4 text-orange-400" />
                                  <span className="text-xs font-semibold text-foreground/90">
                                    {siteManagers.length > 0
                                      ? siteManagers
                                          .map((m) => m.fullName)
                                          .join(", ")
                                      : "Não atribuído"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        variant={confirmModal.variant}
      />
    </div>
  );
}
