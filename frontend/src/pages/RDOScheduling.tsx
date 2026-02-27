import * as React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useDailyReports } from "@/hooks/useDailyReports";
import { useSites } from "@/hooks/useSites";
import { orionApi } from "@/integrations/orion/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEmployees } from "@/hooks/useEmployees";
import {
  FileText,
  Calendar,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Check,
  ChevronsUpDown,
  Trash2,
  Clock,
  MapPin,
  CalendarClock,
  Info,
  X,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRoleStyle, getRoleLabel, STANDARD_ROLES } from "@/utils/roleUtils";
import { useLayout } from "@/contexts/LayoutContext";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import { useRDOScheduling } from "@/contexts/RDOSchedulingContext";
import { cn } from "@/lib/utils";
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
import { useWorkStages } from "@/hooks/useWorkStages";
import { useCompanies } from "@/hooks/useCompanies";
import { useProjects } from "@/hooks/useProjects";
import { Input } from "@/components/ui/input";
import { useSpanTechnicalData } from "@/hooks/useSpanTechnicalData";

// Definir interface de torre para alinhar com o backend (MapElementTechnicalData)
interface Tower {
  id: string;
  externalId: string;
  name: string;
  sequence: number;
}

// Função para corrigir caracteres corrompidos ("?" ou "??") em nomes de atividades
const fixBrokenEncoding = (str: string) => {
  if (!str) return str;
  return str
    .replace(/P\?/gi, "Pé")
    .replace(/Pr\?/gi, "Pré")
    .replace(/Funda\?\?es/gi, "Fundações")
    .replace(/Crava\?\?o/gi, "Cravação")
    .replace(/Medi\?\?o/gi, "Medição")
    .replace(/Lan\?amento/gi, "Lançamento")
    .replace(/Resist\?ncia/gi, "Resistência")
    .replace(/Servi\?os/gi, "Serviços")
    .replace(/\?\?es/gi, "ções")
    .replace(/\?\?o/gi, "ção")
    .replace(/\?\?a/gi, "ça")
    .replace(/\?ncia/gi, "ência")
    .replace(/Execu\?\?o/gi, "Execução")
    .replace(/Produ\?\?o/gi, "Produção")
    .replace(/Instala\?\?o/gi, "Instalação");
};

export default function RDOScheduling() {
  const layout = useLayout();
  const { profile } = useAuth();
  const { draft, updateSchedulingDraft, resetSchedulingDraft } = useRDOScheduling();
  const { triggerGlobalReportRefresh } = useDailyReportContext();
  
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>(profile?.companyId || undefined);
  const { teams } = useTeams(selectedCompanyId);
  const { sites } = useSites();
  const { createReport } = useDailyReports();
  const { toast } = useToast();
  const { companies } = useCompanies();

  const isSuperAdmin = !profile?.companyId; // Gestão Global / Super Admin

  const [selectedProjectId, setSelectedProjectId] = React.useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = React.useState(false);

  const employeesFilter = React.useMemo(() => ({
    companyId: selectedCompanyId,
    excludeCorporate: false,
    roles: STANDARD_ROLES.map(r => r.name)
  }), [selectedCompanyId]);
  const { employees } = useEmployees(employeesFilter);

  // Componente de Seleção de Funcionário com Busca
  // Componente de Seleção de Funcionário com Busca
  // Componente de Seleção de Funcionário com Busca
  const EmployeePicker = ({ value, onChange, placeholder }: any) => {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [roleFilter, setRoleFilter] = React.useState<string>("all");

    const filteredEmployees = React.useMemo(() => {
      let result = employees;

      if (roleFilter !== "all") {
        result = result.filter(e => e.role === roleFilter);
      }

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        result = result.filter(e => 
          (e.fullName || "").toLowerCase().includes(search) || 
          (e.registrationNumber || "").toLowerCase().includes(search) ||
          (e.email || "").toLowerCase().includes(search)
        );
      }

      // Ordenar por prioridade de cargo (rank) igual ao Gestão de Usuários
      return result.sort((a, b) => {
        const rankA = STANDARD_ROLES.find((r) => r.name === (a.role || "WORKER").toUpperCase())?.rank || 0;
        const rankB = STANDARD_ROLES.find((r) => r.name === (b.role || "WORKER").toUpperCase())?.rank || 0;
        if (rankB !== rankA) return rankB - rankA;
        return (a.fullName || "").localeCompare(b.fullName || "");
      }).slice(0, 50);
    }, [employees, searchTerm, roleFilter]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-black/20 border-blue-500/20 hover:bg-black/40 hover:border-blue-500/40 text-foreground h-11 rounded-xl font-normal transition-all"
            disabled={!selectedCompanyId}
          >
            <span className="truncate">
              {value ? employees.find((e) => e.id === value)?.fullName : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0 glass-card border-blue-500/20" align="start">
          <div className="flex flex-col gap-2 p-2 border-b border-white/5">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 bg-black/40 border-white/10 text-[10px] font-bold uppercase tracking-wider">
                <SelectValue placeholder="Filtrar por Cargo" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10 bg-black/95 max-h-[200px]">
                <SelectItem value="all" className="font-bold text-[10px] uppercase tracking-wider">
                  TODOS OS CARGOS
                </SelectItem>
                {STANDARD_ROLES.map((r) => (
                  <SelectItem key={r.name} value={r.name.toUpperCase()} className="font-bold text-[10px] uppercase tracking-wider">
                    {getRoleLabel(r.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Command shouldFilter={false} className="bg-transparent text-foreground">
            <CommandInput 
              placeholder="Buscar por nome, email ou matrícula..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="h-11 border-none focus:ring-0 text-foreground text-xs" 
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty className="text-muted-foreground py-8 flex flex-col items-center justify-center gap-2 text-xs">
                <Search className="h-6 w-6 text-muted-foreground/50" />
                Nenhum colaborador encontrado.
              </CommandEmpty>
              <CommandGroup heading={searchTerm || roleFilter !== "all" ? "Resultados da Busca" : "Sugestões Recentes"}>
                {filteredEmployees.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={e.id}
                    onSelect={() => {
                      onChange(e.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                    className="hover:bg-blue-500/20 cursor-pointer text-foreground data-[selected=true]:bg-blue-500/20 p-3 mb-1 rounded-lg"
                  >
                    <div className="flex flex-col w-full min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm truncate pr-2" title={e.fullName}>{e.fullName}</span>
                        <Badge variant="outline" className={cn("text-[9px] h-4 shrink-0 shadow-sm", getRoleStyle(e.role || "WORKER"))}>
                          {getRoleLabel(e.role || "WORKER")}
                        </Badge>
                      </div>
                      <div className="flex flex-col opacity-60">
                        <span className="text-xs truncate">{e.email || "Sem e-mail"}</span>
                        {e.registrationNumber && (
                          <span className="text-[10px] font-bold">MAT: {e.registrationNumber}</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };


  const { projects } = useProjects();
  const filteredProjects = projects.filter(p => !selectedCompanyId || p.companyId === selectedCompanyId);
  
  const [effectiveSiteId, setEffectiveSiteId] = React.useState<string | null>(null);
  
  const filteredSites = sites.filter(s => !selectedProjectId || s.projectId === selectedProjectId);

  // Derivar Site ID e Project ID do colaborador selecionado usando hook otimizado
  const effectiveLocation = React.useMemo(() => {
    let empSiteId: string | null = null;
    let empProjectId: string | null = null;

    if (draft.employeeId) {
      const empTeam = teams.find(t => t.supervisorId === draft.employeeId || t.members.includes(draft.employeeId!));
      if (empTeam?.siteId) {
         empSiteId = empTeam.siteId;
         const site = sites.find(s => s.id === empSiteId);
         if (site) empProjectId = site.projectId;
      }
    }
    
    // Se o funcionário tem um canteiro atrelado, usamos ele e forçamos o lock
    if (empSiteId && empProjectId) {
      return { siteId: empSiteId, projectId: empProjectId, isLocked: true };
    }

    // Fallback: usar seleções manuais caso o funcionário não tenha canteiro ou não esteja selecionado
    const projectId = selectedProjectId || (effectiveSiteId ? sites.find(s => s.id === effectiveSiteId)?.projectId : undefined);
    return { siteId: effectiveSiteId, projectId: projectId || undefined, isLocked: false };
  }, [draft.employeeId, teams, sites, selectedProjectId, effectiveSiteId]);

  const finalSiteId = effectiveLocation.siteId;
  const finalProjectId = effectiveLocation.projectId;
  const isLocationLocked = effectiveLocation.isLocked;

  // Carregar etapas de obra usando os construtores baseados no supervisor (opcional, pode ser globalmente)
  const { stages: workStages, isLoading: isLoadingStages } = useWorkStages(
    finalSiteId || undefined,
    finalProjectId,
    false,
    selectedCompanyId
  );

  // Forçar reload das stages
  React.useEffect(() => {
    if (finalProjectId) {
      // Usando API diretamente em vez do signal helper para carregar etapas se necessário
      orionApi.get(`/work-stages/project/${finalProjectId}`).catch(console.error);
    }
  }, [finalProjectId, finalSiteId, selectedCompanyId]);

  const [projectTowers, setProjectTowers] = React.useState<Tower[]>([]);
  const { spans: projectSpans } = useSpanTechnicalData(
    sites.find((s) => s.id === finalSiteId)?.projectId || undefined,
  );

  // Buscar torres
  React.useEffect(() => {
    const fetchTowers = async () => {
      const siteId = finalSiteId;
      if (!siteId) return;

      const site = sites.find((s) => s.id === siteId);
      if (!site?.projectId) return;

      try {
        const { data, error } = await orionApi
          .from("map_elements")
          .select("*")
          .eq("projectId", site.projectId)
          .eq("type", "TOWER")
          .order("sequence", { ascending: true });

        if (!error && data) {
          const mappedTowers: Tower[] = data.map((item: any) => ({
            id: item.id,
            externalId: item.externalId || item.objectId,
            name: item.name || item.externalId || item.objectId,
            sequence: item.sequence || item.object_seq,
          }));
          setProjectTowers(mappedTowers);
        }
      } catch (err) {
        console.error("Error fetching towers:", err);
      }
    };

    fetchTowers();
  }, [sites, finalSiteId]);

  // Agrupar atividades (Lógica portada de DailyReport.tsx)
  const workStagesGrouped = React.useMemo(() => {
    if (workStages.length === 0) return [];
    
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    
    const uniqueStages = workStages.filter(s => {
      if (!s.id || seenIds.has(s.id)) return false;
      const normalizedName = fixBrokenEncoding(s.name).trim().toLowerCase();
      if (seenNames.has(normalizedName)) return false;
      seenIds.add(s.id);
      seenNames.add(normalizedName);
      return true;
    }).map(s => ({
      ...s,
      name: fixBrokenEncoding(s.name),
      description: s.description ? fixBrokenEncoding(s.description) : null
    }));

    const groupsMap = new Map<string, any[]>();
    const activityToCategory: Record<string, string> = {
      "CROQUI DE ACESSO": "SERVIÇOS PRELIMINARES",
      "SONDAGEM": "SERVIÇOS PRELIMINARES",
      "CONFERÊNCIA DE PERFIL": "SERVIÇOS PRELIMINARES",
      "SUPRESSÃO VEGETAL (ÁREA)": "SERVIÇOS PRELIMINARES",
      "ABERTURA DE ACESSOS": "SERVIÇOS PRELIMINARES",
      "ESCAVAÇÃO": "FUNDAÇÃO",
      "ARMAÇÃO": "FUNDAÇÃO",
      "PREPARAÇÃO / NIVELAMENTO": "FUNDAÇÃO",
      "CONCRETAGEM": "FUNDAÇÃO",
      "REATERRO": "FUNDAÇÃO",
      "PRÉ-MONTAGEM": "MONTAGEM",
      "IÇAMENTO": "MONTAGEM",
      "REVISÃO": "MONTAGEM",
      "TORQUEAMENTO": "MONTAGEM",
      "LANÇAMENTO CABO GUIA": "CABOS",
      "LANÇAMENTO CONDUTOR": "CABOS",
      "GRAMPEAÇÃO": "CABOS",
      "REGULAÇÃO": "CABOS"
    };

    uniqueStages.forEach(s => {
      let categoryName = "";
      const nameUpper = s.name.toUpperCase().trim();
      if (activityToCategory[nameUpper]) categoryName = activityToCategory[nameUpper];
      if (!categoryName && s.parentId) {
        const parent = workStages.find(p => p.id === s.parentId);
        if (parent) categoryName = fixBrokenEncoding(parent.name).toUpperCase();
      }
      if (!categoryName) {
        const descUpper = (s.description || "").toUpperCase();
        const keywords = ["FUNDAÇÃO", "MONTAGEM", "CABOS", "PRELIMINARES", "ESTRUTURA"];
        const foundInDesc = keywords.find(k => descUpper.includes(k));
        if (foundInDesc) categoryName = foundInDesc === "PRELIMINARES" ? "SERVIÇOS PRELIMINARES" : foundInDesc;
        else {
           const foundInName = keywords.find(k => nameUpper.includes(k));
           if (foundInName) categoryName = foundInName === "PRELIMINARES" ? "SERVIÇOS PRELIMINARES" : foundInName;
        }
      }
      if (!categoryName) {
        const isParent = uniqueStages.some(child => child.parentId === s.id);
        if (isParent) return;
        categoryName = "GERAL";
      }
      const finalList = groupsMap.get(categoryName) || [];
      finalList.push(s);
      groupsMap.set(categoryName, finalList);
    });

    return Array.from(groupsMap.entries())
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      }))
      .sort((a, b) => {
        const orderPriority: Record<string, number> = {
          "SERVIÇOS PRELIMINARES": 1,
          "FUNDAÇÃO": 2,
          "MONTAGEM": 3,
          "CABOS": 4,
          "GERAL": 10
        };
        return (orderPriority[a.category] || 50) - (orderPriority[b.category] || 50);
      });
  }, [workStages]);

  // Atividades locais (transientes)
  const [currentStageIds, setCurrentStageIds] = React.useState<string[]>([]);
  const [currentSubPointType, setCurrentSubPointType] = React.useState<'GERAL' | 'TORRE' | 'VAO' | 'TRECHO' | 'ESTRUTURA'>('TORRE');
  const [currentSubPoint, setCurrentSubPoint] = React.useState("");
  const [currentSubPointEnd, setCurrentSubPointEnd] = React.useState("");
  const [currentIsMultiSelection, setCurrentIsMultiSelection] = React.useState(false);
  const [isActivityPopoverOpen, setIsActivityPopoverOpen] = React.useState(false);
  
  const [lockedDetails, setLockedDetails] = React.useState<string[]>([]);
  
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<{ expandedTowers: string[]; finalLabel: string }>({ expandedTowers: [], finalLabel: "" });

  // Preview Metadata
  const fetchPreviewLocal = React.useCallback(async () => {
    const projectId = finalProjectId;
    if (!projectId || currentSubPointType === "GERAL" || !currentSubPoint) {
      setPreviewData({ expandedTowers: [], finalLabel: "" });
      return;
    }
    if (currentIsMultiSelection && !currentSubPointEnd) return;

    setIsPreviewing(true);
    try {
      const response = await orionApi.post("/reports/metadata/preview", {
        projectId,
        subPointType: currentSubPointType,
        subPoint: currentSubPoint,
        subPointEnd: currentSubPointEnd,
        isMultiSelection: currentIsMultiSelection,
      });
      if (response.data) setPreviewData(response.data as any);
    } catch (err) {
      console.error("Error fetching preview:", err);
    } finally {
      setIsPreviewing(false);
    }
  }, [finalProjectId, currentSubPointType, currentSubPoint, currentSubPointEnd, currentIsMultiSelection]);

  React.useEffect(() => {
    fetchPreviewLocal();
  }, [fetchPreviewLocal]);

  const handleAddActivity = () => {
    if (currentStageIds.length === 0) return;
    
    // Todas as torres/vãos: os que estão no preview atual + os que foram travados anteriormente
    const allItems = Array.from(new Set([...lockedDetails, ...previewData.expandedTowers]));
    
    if (allItems.length === 0 && currentSubPointType !== 'GERAL') return;

    const selectedStages = workStages.filter(s => currentStageIds.includes(s.id));
    const stageNames = selectedStages.map(s => fixBrokenEncoding(s.name));
    const stageName = stageNames.length > 1 ? `(${stageNames.join(" | ")})` : (stageNames[0] || "Atividade");
    
    const finalLabel = previewData.finalLabel || (allItems.length > 0 ? allItems.join(", ") : "Geral");

    const newActivity: any = {
      id: Math.random().toString(36).substr(2, 9),
      stageId: currentStageIds[0],
      stageName,
      subPointType: currentSubPointType,
      subPoint: finalLabel,
      subPointEnd: currentSubPointEnd,
      isMultiSelection: currentIsMultiSelection || allItems.length > 1,
      status: 'IN_PROGRESS',
      details: allItems.map(id => ({ id, status: 'IN_PROGRESS', progress: 0 }))
    };

    updateSchedulingDraft({
      selectedActivities: [...draft.selectedActivities, newActivity]
    });
    
    setCurrentStageIds([]);
    setCurrentSubPoint("");
    setCurrentSubPointEnd("");
    setLockedDetails([]);
    setPreviewData({ expandedTowers: [], finalLabel: "" });
  };

  const handleRemoveActivity = (id: string) => {
    updateSchedulingDraft({
      selectedActivities: draft.selectedActivities.filter(a => a.id !== id)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.employeeId) {
      toast({ title: "Erro", description: "Selecione o responsável.", variant: "destructive" });
      return;
    }
    if (draft.selectedActivities.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos uma atividade.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const result = await createReport({
        ...draft,
        companyId: selectedCompanyId,
        activities: draft.selectedActivities.map(a => `${a.stageName} (${a.subPoint})`).join(", "),
        status: 'PROGRAMMED' as any,
        metadata: {
          employeeId: draft.employeeId,
          selectedActivities: draft.selectedActivities,
          isProgrammed: true,
          programmedAt: new Date().toISOString()
        }
      });
      if (result.success) {
        toast({ title: "Programação Salva!", description: "A atividade foi agendada com sucesso." });
        resetSchedulingDraft();
        triggerGlobalReportRefresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getLocationsByType = () => {
    if (currentSubPointType === "TORRE") return projectTowers.map((t) => ({ id: t.externalId || t.name, label: t.name || t.externalId }));
    if (currentSubPointType === "VAO" || currentSubPointType === "TRECHO") return projectSpans.map((s) => ({ id: s.id, label: s.span_name }));
    return [];
  };

  const LocationPicker = ({ value, onChange, placeholder }: any) => {
    const [open, setOpen] = React.useState(false);
    const locations = getLocationsByType();
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-foreground h-14 rounded-2xl" disabled={currentSubPointType === "GERAL"}>
            {value ? locations.find((loc) => loc.id === value)?.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 glass-card border-blue-500/20">
          <Command className="bg-transparent text-foreground">
            <CommandInput placeholder="Buscar localização..." className="h-9 border-none focus:ring-0 text-foreground" />
            <CommandList>
              <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">Nenhum local encontrado.</CommandEmpty>
              <CommandGroup>
                {locations.map((loc) => (
                  <CommandItem key={loc.id} value={loc.label} onSelect={() => { onChange(loc.id); setOpen(false); }} className="hover:bg-blue-500/20 cursor-pointer text-foreground data-[selected=true]:bg-blue-500/20">
                    <Check className={cn("mr-2 h-4 w-4 text-blue-500", value === loc.id ? "opacity-100" : "opacity-0")} />
                    {loc.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const allSelectedItems = Array.from(new Set([...lockedDetails, ...previewData.expandedTowers]));

  return (
    <div className="space-y-6 animate-fade-in pb-10 p-6">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <Card className="glass-card border-none shadow-2xl relative overflow-hidden bg-blue-500/5 ring-1 ring-blue-500/20">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" />

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                    <Button variant="ghost" size="icon" onClick={() => layout.toggleSidebar()} className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors hidden lg:flex">
                      {layout.isSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                    </Button>
                    <CalendarClock className="w-6 h-6 text-blue-500" />
                    Programação Diária de Obra
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/60 mt-1 pl-11">Agende as atividades que deverão ser executadas pelas equipes</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8 p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                  {isSuperAdmin && (
                    <div className="space-y-3">
                      <Label className="text-blue-500/80 font-bold uppercase text-[10px] tracking-widest pl-1">Empresa</Label>
                      <Select value={selectedCompanyId || ""} onValueChange={(val) => { setSelectedCompanyId(val); setSelectedProjectId(undefined); setEffectiveSiteId(null); updateSchedulingDraft({ siteId: "" }); }}>
                        <SelectTrigger className="bg-black/20 border-blue-500/20 rounded-xl h-11"><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
                        <SelectContent className="glass-card">{companies?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-3">
                    <Label className="text-blue-500/80 font-bold uppercase text-[10px] tracking-widest pl-1">Data da Programação</Label>
                    <Input type="date" className="bg-black/20 border-blue-500/20 rounded-xl h-11" value={draft.reportDate} onChange={(e) => updateSchedulingDraft({ reportDate: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-blue-500/80 font-bold uppercase text-[10px] tracking-widest pl-1">Responsável pela Equipe</Label>
                    <EmployeePicker 
                      value={draft.employeeId} 
                      onChange={(val: string) => updateSchedulingDraft({ employeeId: val })} 
                      placeholder="Buscar responsável..." 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-blue-500/80 font-bold uppercase text-[10px] tracking-widest pl-1">Obra / Projeto</Label>
                    {isLocationLocked || !selectedCompanyId ? (
                      <div className="bg-black/40 border border-blue-500/10 h-11 flex items-center justify-between px-4 rounded-xl text-xs font-bold text-blue-500/60 cursor-not-allowed">
                          <span>{filteredProjects.find(p => p.id === finalProjectId)?.name || "Obra Automática"}</span>
                          <Lock className="w-4 h-4 text-blue-500/40" />
                      </div>
                    ) : (
                      <Select value={selectedProjectId || ""} onValueChange={(val) => { setSelectedProjectId(val); setEffectiveSiteId(null); updateSchedulingDraft({ siteId: "" }); }}>
                        <SelectTrigger className="bg-black/20 border-blue-500/20 rounded-xl h-11"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                        <SelectContent className="glass-card">{filteredProjects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-blue-500/80 font-bold uppercase text-[10px] tracking-widest pl-1">Canteiro</Label>
                    {isLocationLocked || !finalProjectId ? (
                      <div className="bg-black/40 border border-blue-500/10 h-11 flex items-center justify-between px-4 rounded-xl text-xs font-bold text-blue-500/60 cursor-not-allowed">
                          <span>{filteredSites.find(s => s.id === finalSiteId)?.name || "Canteiro Automático"}</span>
                          <Lock className="w-4 h-4 text-blue-500/40" />
                      </div>
                    ) : (
                      <Select value={effectiveSiteId || ""} onValueChange={(val) => { setEffectiveSiteId(val); updateSchedulingDraft({ siteId: val }); }} disabled={!finalProjectId}>
                        <SelectTrigger className="bg-black/20 border-blue-500/20 rounded-xl h-11"><SelectValue placeholder="Selecione o canteiro..." /></SelectTrigger>
                        <SelectContent className="glass-card">{filteredSites.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="p-8 bg-blue-500/5 border-2 border-blue-500/20 rounded-[2.5rem] space-y-8 relative overflow-hidden group/form">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/form:opacity-10 transition-opacity"><Plus className="w-32 h-32" /></div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center"><Plus className="w-6 h-6 text-blue-500" /></div>
                    <div>
                      <h3 className="text-lg font-black text-blue-500 uppercase tracking-tight">Agendar Atividade</h3>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pl-1">Identifique a tarefa e o local para execução</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/40">1. Qual Atividade?</Label>
                      <Popover open={isActivityPopoverOpen} onOpenChange={setIsActivityPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start h-14 bg-black/40 border-blue-500/20 rounded-2xl hover:bg-black/60 transition-all text-left px-6">
                            <Search className="w-5 h-5 mr-3 text-blue-500/60" />
                            <span className="font-bold truncate">
                              {currentStageIds.length > 0 
                                ? (currentStageIds.length === 1 ? fixBrokenEncoding(workStages.find(s => s.id === currentStageIds[0])?.name || "") : `${currentStageIds.length} Atividades selecionadas`)
                                : "Escolha as atividades..."}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[450px] p-0 glass-card border-blue-500/30 shadow-2xl">
                          <Command className="bg-[#0c0c0e]">
                            <CommandInput placeholder="Filtrar atividades..." className="h-12 border-none" />
                            <CommandList className="max-h-[350px]">
                              {workStagesGrouped.map((group) => (
                                <CommandGroup key={group.category} heading={<span className="text-blue-500/60 font-black text-[10px] tracking-widest uppercase px-2">{group.category}</span>}>
                                  {group.items.map((stage) => (
                                    <CommandItem key={stage.id} value={stage.name} onSelect={() => { if (currentStageIds.includes(stage.id)) setCurrentStageIds(currentStageIds.filter(id => id !== stage.id)); else setCurrentStageIds([...currentStageIds, stage.id]); }} className="cursor-pointer aria-selected:bg-blue-500/20 rounded-xl m-1 px-4 py-3">
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex flex-col"><span className="font-bold text-sm">{stage.name}</span> {stage.description && <span className="text-[10px] text-muted-foreground">{stage.description}</span>}</div>
                                        {currentStageIds.includes(stage.id) && <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/40">2. Onde? (Localização)</Label>
                      <div className="flex flex-wrap items-center gap-4 lg:gap-6 relative z-10">
                        <div className="min-w-[140px]">
                          <Select value={currentSubPointType} onValueChange={(val: any) => setCurrentSubPointType(val)}>
                            <SelectTrigger className="bg-black/40 border-blue-500/20 rounded-2xl h-14 font-bold text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="glass-card">
                              <SelectItem value="GERAL">Geral</SelectItem>
                              <SelectItem value="TORRE">Torre</SelectItem>
                              <SelectItem value="VAO">Vão</SelectItem>
                              <SelectItem value="TRECHO">Trecho</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <label className="flex items-center gap-2 text-[10px] font-bold text-blue-500/60 cursor-pointer whitespace-nowrap px-2">
                          <input type="checkbox" checked={currentIsMultiSelection} onChange={e => { setCurrentIsMultiSelection(e.target.checked); setCurrentSubPointEnd(""); }} className="rounded border-blue-500/30 bg-black/40 text-blue-500" /> SELEÇÃO MÚLTIPLA
                        </label>
                        <div className="flex gap-3 items-center flex-1 min-w-[300px]">
                           <div className="flex flex-row gap-2 flex-1">
                              <div className="flex-1 relative"><LocationPicker value={currentSubPoint} onChange={setCurrentSubPoint} placeholder={currentIsMultiSelection ? "INÍCIO..." : "TORRE..."} /></div>
                              {currentIsMultiSelection && <div className="flex-1"><LocationPicker value={currentSubPointEnd} onChange={setCurrentSubPointEnd} placeholder="FIM..." /></div>}
                           </div>
                           
                           {currentSubPoint && (
                             <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                onClick={() => {
                                  const activeSelection = previewData.expandedTowers;
                                  setLockedDetails([...lockedDetails, ...activeSelection]);
                                  setCurrentSubPoint("");
                                  setCurrentSubPointEnd("");
                                }}
                                className="bg-blue-500/20 border-blue-500/40 text-blue-500 hover:bg-blue-500 hover:text-white h-14 w-14 rounded-2xl shrink-0 transition-all active:scale-90"
                             >
                               <Plus className="w-6 h-6" />
                             </Button>
                           )}

                           <Button 
                              type="button" 
                              onClick={handleAddActivity} 
                              disabled={currentStageIds.length === 0 || (currentSubPointType !== 'GERAL' && allSelectedItems.length === 0) || (currentIsMultiSelection && !currentSubPointEnd) || isPreviewing} 
                              className="h-14 w-14 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg active:scale-95 transition-all"
                            >
                              <Check className="w-6 h-6" />
                            </Button>
                        </div>
                      </div>
                      
                      {/* Mostrar itens já selecionados para esta atividade */}
                      {allSelectedItems.length > 0 && currentSubPointType !== 'GERAL' && (
                        <div className="flex flex-wrap gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                           {allSelectedItems.map(item => (
                             <Badge key={item} variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 rounded-lg flex items-center gap-2">
                               {item}
                               <button type="button" onClick={() => setLockedDetails(prev => prev.filter(i => i !== item))} className="hover:text-red-500 transition-colors">
                                 <X className="w-3 h-3" />
                               </button>
                             </Badge>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {draft.selectedActivities.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/40 px-2">Cronograma Programado para o Dia</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {draft.selectedActivities.map((act) => (
                        <div key={act.id} className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 flex justify-between items-center group hover:border-blue-500/40 transition-all shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner"><MapPin className="w-6 h-6" /></div>
                            <div>
                               <p className="font-black text-white uppercase tracking-tight leading-none mb-1.5 text-sm">{act.stageName}</p>
                               <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-none font-bold text-[10px] uppercase px-3 py-1 rounded-full">{act.subPoint}</Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveActivity(act.id)} className="text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-8 flex justify-end items-center gap-6">
                   {draft.selectedActivities.length > 0 && <span className="text-[10px] font-black text-blue-500/40 uppercase tracking-widest">{draft.selectedActivities.length} TAREFAS AGENDADAS</span>}
                   <Button type="submit" disabled={isSaving || draft.selectedActivities.length === 0} className="h-16 px-16 rounded-3xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-500/40 active:scale-[0.98] transition-all">
                     {isSaving ? "AGENDANDO..." : "SALVAR PROGRAMAÇÃO COMPLETA"}
                   </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
