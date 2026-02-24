import React, { useState, useMemo } from 'react';
import { Access } from '@/components/auth/Access';
import { useNavigate } from "react-router-dom";
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
  Shield,
  Edit2
} from "lucide-react";
import { ProjectSelector } from "@/components/shared/ProjectSelector";
import { isProtectedSignal, can, selectedContextSignal } from "@/signals/authSignals";
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

// Função utilitária para corrigir encoding se necessário
const fixBrokenEncoding = (str: string) => {
    try {
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str;
    }
};

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
  const userFilters = useMemo(
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

  // Context from Global Signal
  const selectedContext = selectedContextSignal.value;
  const selectedProjectId = selectedContext?.projectId || "all";
  
  const { toast } = useToast();

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

  const groupedSites = useMemo(() => {
    let filtered = sites.filter(
      (s) => {
        const siteMatch = (s.name || "").toLowerCase().includes((searchTerm || "").toLowerCase());
        const projectName = getProjectName(s.projectId);
        const projectMatch = (projectName || "").toLowerCase().includes((searchTerm || "").toLowerCase());
        return siteMatch || projectMatch;
      }
    );

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

  return (
    <div className="space-y-6 animate-fade-in view-adaptive-container h-full flex flex-col py-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text uppercase italic tracking-tighter">
            Gestão de Canteiros
          </h1>
          <p className="text-muted-foreground mt-1 font-medium text-sm">
            Gerencie frentes de trabalho, trechos e equipes alocadas por obra.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Access auth="sites.create" mode="hide">
            <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white shadow-glow px-6 font-bold uppercase tracking-widest text-[10px]">
              <Plus className="mr-2 h-4 w-4" />
              Novo Canteiro
            </Button>
          </Access>
        </div>
      </div>

      {(sitesLoading || projectsLoading || usersLoading) ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold uppercase tracking-widest text-primary/60">Sincronizando Canteiros...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-8 overflow-auto pb-10 scrollbar-thin scrollbar-thumb-primary/20">
          <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por canteiro ou obra..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 industrial-input h-10"
                />
            </div>
          </div>

          {!projects || projects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
               <div className="text-xl font-bold text-muted-foreground uppercase tracking-widest">Nenhuma Obra Atribuída</div>
               <p className="text-sm text-muted-foreground/60 max-w-md italic">Sua empresa ainda não possui obras cadastradas no sistema ou vinculadas ao seu perfil.</p>
               <Button onClick={() => navigate("/obras")} variant="outline" className="border-primary/20 hover:bg-primary/5">Gerenciar Obras</Button>
            </div>
          ) : Object.keys(groupedSites).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
               <div className="text-xl font-bold text-muted-foreground uppercase tracking-widest">Nenhum Canteiro Encontrado</div>
               <p className="text-sm text-muted-foreground/60 max-w-md italic">Ainda não foram criados canteiros para as suas obras. Inicie as operações criando o primeiro canteiro.</p>
               <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary">Criar Primeiro Canteiro</Button>
            </div>
          ) : (
            Object.entries(groupedSites).map(([projectId, projectSites]) => {
              const project = projects.find((p) => p.id === projectId);
              return (
                <div key={projectId} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group cursor-default">
                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow-sm">
                        <HardHat className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tighter text-foreground group-hover:text-primary transition-colors italic uppercase">
                        {project ? fixBrokenEncoding(project.name) : "Obra não encontrada"}
                        </h2>
                    </div>
                    <div className="flex-1 h-px bg-linear-to-r from-primary/30 to-transparent" />
                    <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                      {projectSites.length} {projectSites.length === 1 ? "Canteiro" : "Canteiros"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {projectSites.map((site) => {
                      const projectManagers = getProjectManagers(site.projectId);
                      const siteManagers = getSiteManagers(site.id);

                      return (
                        <Card key={site.id} className="group relative overflow-hidden glass-card border-white/5 hover:border-primary/30 transition-all duration-500 shadow-xl">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/2">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <Truck className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors tracking-tight">
                                        {fixBrokenEncoding(site.name)}
                                    </h3>
                                    <div className="flex items-center gap-1 text-[9px] uppercase font-black text-muted-foreground/60 tracking-widest mt-0.5">
                                        <LayoutGrid className="w-2.5 h-2.5" />
                                        Unidade de Trabalho
                                    </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
                                <Access auth="sites.edit" mode="hide">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 bg-black/20 backdrop-blur-sm"
                                    onClick={() => handleEdit(site)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </Access>
                                <Access auth="sites.delete" mode="hide">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 bg-black/20 backdrop-blur-sm"
                                    onClick={() => handleDelete(site)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </Access>
                              </div>
                            </div>

                            <div className="p-5 space-y-6">
                              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[9px] uppercase font-black text-muted-foreground/40 italic tracking-widest">Meta HHH</p>
                                    <p className="text-sm font-black flex items-center gap-1.5 text-primary drop-shadow-sm">
                                        <Clock className="w-3.5 h-3.5" />
                                        {site.plannedHours?.toLocaleString() || "0"}h
                                    </p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[9px] uppercase font-black text-muted-foreground/40 italic tracking-widest">Status</p>
                                    <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-tighter">Ativo</span>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/20">Gestor da Obra</span>
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors">
                                    <UserCircle className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-bold text-foreground/80 truncate">
                                      {projectManagers.length > 0
                                        ? projectManagers.map((m) => m.fullName).join(", ")
                                        : "Não atribuído"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[9px] uppercase font-black tracking-[0.2em] text-white/20">Gestor do Canteiro</span>
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 transition-colors">
                                    <Briefcase className="w-4 h-4 text-orange-400" />
                                    <span className="text-xs font-bold text-foreground/80 truncate">
                                      {siteManagers.length > 0
                                        ? siteManagers.map((m) => m.fullName).join(", ")
                                        : "Não atribuído"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground/60 italic">
                                <MapPin className="w-3.5 h-3.5 text-primary/30" />
                                <span className="truncate">{site.locationDetails || "Localização não detalhada"}</span>
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
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        variant={confirmModal.variant}
      />

      {/* Edit/Add Dialog */}
      {canCreateSites && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent className="max-w-md glass-card border-white/10 shadow-2xl overflow-hidden p-0">
              <div className="absolute top-0 inset-x-0 h-1 gradient-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
              
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-3 text-2xl font-black italic tracking-tighter uppercase">
                  <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                    <Truck className="text-white w-7 h-7" />
                  </div>
                  {editingSite ? "Editar Canteiro" : "Novo Canteiro"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium pl-15">
                  Configure as frentes de trabalho vinculadas aos projetos.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="space-y-5">
                   {/* Vínculo de Projeto */}
                   <div className="space-y-2.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">Vínculo com a Obra *</Label>
                    <Select
                      value={formData.projectId}
                      onValueChange={(val) => setFormData({ ...formData, projectId: val })}
                    >
                      <SelectTrigger className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl">
                        <SelectValue placeholder="Selecione o projeto correspondente" />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10">
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {fixBrokenEncoding(p.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nome e HH */}
                  <div className="grid grid-cols-1 gap-5">
                    <div className="space-y-2.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">Identificação / Nome *</Label>
                      <div className="relative">
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl pr-10"
                          placeholder="Ex: Canteiro SUL - Trecho 01"
                          required
                        />
                        <LayoutGrid className="absolute right-3.5 top-3.5 w-4 h-4 text-white/20" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1 italic">Meta HH Planejado</Label>
                      <div className="relative font-mono font-bold">
                        <Input
                          type="number"
                          value={formData.plannedHours}
                          onChange={(e) => setFormData({ ...formData, plannedHours: Number(e.target.value) })}
                          className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl pr-10 text-primary"
                        />
                        <Clock className="absolute right-3.5 top-3.5 w-4 h-4 text-primary/40" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">Localização Resumida</Label>
                      <Input
                        value={formData.locationDetails}
                        onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
                        className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl"
                        placeholder="Ex: Térreo / Almox."
                      />
                    </div>
                  </div>

                  {/* Responsáveis */}
                  <div className="space-y-2.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">Gestores do Canteiro</Label>
                    <ResponsibleSelector
                      users={users.filter(u => u.role === "GESTOR_CANTEIRO" || u.role === "GESTOR_PROJECT") as Responsible[]}
                      selectedIds={formData.responsibleIds}
                      onSelectionChange={(ids) => setFormData({ ...formData, responsibleIds: ids })}
                      placeholder="Atribuir lideranças..."
                    />
                  </div>

                  {/* Geoposicionamento */}
                  <div className="space-y-2.5 pt-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-sky-400 pl-1">Endereço / Geoposicionamento</Label>
                    <TooltipProvider>
                      <AddressAutocomplete
                        value={formData.locationDetails}
                        latitude={formData.xLat}
                        longitude={formData.yLa}
                        onAddressChange={(data: AddressData) => {
                          setFormData(prev => ({
                            ...prev,
                            locationDetails: data.formattedAddress,
                            xLat: data.latitude ?? prev.xLat,
                            yLa: data.longitude ?? prev.yLa,
                          }));
                        }}
                        placeholder="Buscar endereço no mapa..."
                      />
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetForm}
                    className="flex-1 h-12 rounded-2xl hover:bg-white/5 text-muted-foreground font-bold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-2xl gradient-primary shadow-glow font-black uppercase tracking-widest text-xs"
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingSite ? "Salvar Alterações" : "Ativar Canteiro")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
}
