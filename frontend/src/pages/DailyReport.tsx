import * as React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useDailyReports } from "@/hooks/useDailyReports";
import { useSites } from "@/hooks/useSites";
import { orionApi } from "@/integrations/orion/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Send,
  Calendar,
  Clock,
  Loader2,
  ChevronRight,
  ChevronLeft,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { isProtectedSignal, can } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";
import {
  dailyReportDraftSignal,
  updateReportDraft,
  resetReportDraft,
  initReportDraft,
} from "@/signals/dailyReportSignals";
import { toggleSidebar, isSidebarOpenSignal } from "@/signals/uiSignals";
import { cn, formatNameForLGPD } from "@/lib/utils";
import { useSpanTechnicalData } from "@/hooks/useSpanTechnicalData";
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
import { Check, ChevronsUpDown, Info, Search, Plus } from "lucide-react";
import { useWorkStages } from "@/hooks/useWorkStages";
import { useTowerProduction } from "@/modules/production/hooks/useTowerProduction";

// Definir interface de torre para alinhar com o backend (MapElementTechnicalData)
interface Tower {
  id: string;
  externalId: string;
  name: string;
  sequence: number;
}

interface DailyReportDraft {
  employeeId: string;
  teamIds: string[];
  subPointType: 'GERAL' | 'TORRE' | 'VAO' | 'TRECHO' | 'ESTRUTURA';
  subPoint: string;
  subPointEnd: string;
  isMultiSelection: boolean;
  activities: string;
  observations: string;
  siteId?: string;
  selectedSpanIds: string[];
  selectedActivities: Array<{
    stageId: string;
    status: 'IN_PROGRESS' | 'FINISHED';
  }>;
  step: number;
  updatedAt: number;
}

export default function DailyReport() {
  useSignals();
  const isSidebarOpen = isSidebarOpenSignal.value;
  const { profile } = useAuth();
  const isWorker = !isProtectedSignal.value && !can("daily_reports.manage");
  const workerEmployeeId = profile?.employeeId;
  const { teams } = useTeams(profile?.companyId);
  const { sites } = useSites(undefined, profile?.companyId);
  const { createReport, getTodayReports } = useDailyReports();

  const draft = dailyReportDraftSignal.value;
  const {
    employeeId,
    subPointType,
    subPoint,
    subPointEnd,
    isMultiSelection,
    teamIds,
    selectedSpanIds,
    activities,
    observations,
    step,
    selectedActivities,
  } = draft;

  const employeesFilter = React.useMemo(
    () => ({ companyId: profile?.companyId }),
    [profile?.companyId],
  );
  const { employees } = useEmployees(employeesFilter);

  // Encontrar a equipe do trabalhador logado
  const workerTeam = React.useMemo(() => {
    if (!isWorker || !workerEmployeeId) return null;
    return teams.find(
      (t) =>
        t.members.includes(workerEmployeeId) ||
        t.supervisorId === workerEmployeeId,
    );
  }, [teams, isWorker, workerEmployeeId]);

  const [isSaving, setIsSaving] = React.useState(false);
  const [projectTowers, setProjectTowers] = React.useState<Tower[]>([]);
  const [quickActivityId, setQuickActivityId] = React.useState<string>("");

  const handleQuickAdd = () => {
    if (!quickActivityId) return;
    const exists = selectedActivities.find(a => a.stageId === quickActivityId);
    if (exists) {
      toast({ title: "Já listada", description: "Esta atividade já está na grelha.", variant: "destructive" });
      return;
    }

    // Add to list with default status 'FINISHED' (Concluído) as it's a report
    updateReportDraft({
      selectedActivities: [...selectedActivities, { stageId: quickActivityId, status: 'FINISHED' }]
    });
    setQuickActivityId("");
    toast({
      title: "Atividade Adicionada",
      description: "A atividade foi incluída na grelha abaixo.",
      className: "bg-green-500/10 border-green-500/20 text-green-500"
    });
  };

  // Derivar o Site ID efetivo para busca de dados técnicos
  const effectiveSiteId = React.useMemo(() => {
    if (draft.siteId) return draft.siteId; // Prioridade para seleção manual
    if (workerTeam?.siteId) return workerTeam.siteId;
    if (teamIds.length > 0) {
      const selectedTeam = teams.find((t) => t.id === teamIds[0]);
      if (selectedTeam?.siteId) return selectedTeam.siteId;
    }
    if (employeeId) {
      const empTeam = teams.find(
        (t) => t.members.includes(employeeId) || t.supervisorId === employeeId,
      );
      if (empTeam?.siteId) return empTeam.siteId;
    }
    return null;
  }, [workerTeam, teamIds, teams, employeeId, draft.siteId]);

  const { spans: projectSpans } = useSpanTechnicalData(
    sites.find((s) => s.id === effectiveSiteId)?.projectId || undefined,
  );

  // Carregar etapas de obra (Grelha de Produção)
  const { stages: workStages, isLoading: isLoadingStages } = useWorkStages(
    effectiveSiteId || undefined,
    sites.find((s) => s.id === effectiveSiteId)?.projectId || undefined,
  );

  // Carregar dados de execução real para sincronizar com a Grelha
  const { towersByStage, loadProductionData } = useTowerProduction();

  // Efeito para carregar dados de produção quando as etapas forem carregadas
  React.useEffect(() => {
    if (workStages.length > 0 && effectiveSiteId && profile?.companyId) {
      const projectId = sites.find(s => s.id === effectiveSiteId)?.projectId;
      if (projectId) {
        loadProductionData(workStages, projectId, effectiveSiteId, profile.companyId);
      }
    }
  }, [workStages, effectiveSiteId, profile?.companyId, loadProductionData, sites]);

  const { toast } = useToast();

  // Cálculo de totalizadores para vãos selecionados
  const spanTotals = React.useMemo(() => {
    if (subPointType !== "VAO") {
      return { towers: 0, km: "0.00" };
    }

    let selectedSpans: any[] = [];

    if (isMultiSelection && subPoint && subPointEnd) {
      const startIdx = projectSpans.findIndex(s => s.id === subPoint);
      const endIdx = projectSpans.findIndex(s => s.id === subPointEnd);

      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);
        selectedSpans = projectSpans.slice(min, max + 1);
      }
    } else if (subPoint) {
      const singleSpan = projectSpans.find(s => s.id === subPoint);
      if (singleSpan) selectedSpans = [singleSpan];
    }

    if (selectedSpans.length === 0) {
      return { towers: 0, km: "0.00" };
    }

    // Coletar todas as torres únicas (início e fim de cada vão)
    const uniqueTowers = new Set<string>();
    selectedSpans.forEach((span) => {
      if (span.tower_start_id) uniqueTowers.add(span.tower_start_id);
      if (span.tower_end_id) uniqueTowers.add(span.tower_end_id);
    });

    // Somar distâncias (span_length está em metros)
    const totalMeters = selectedSpans.reduce(
      (acc, span) => acc + (Number(span.span_length) || 0),
      0,
    );

    return {
      towers: uniqueTowers.size,
      km: (totalMeters / 1000).toFixed(2),
    };
  }, [subPointType, subPoint, subPointEnd, isMultiSelection, projectSpans]);

  // Inicializar rascunho
  React.useEffect(() => {
    initReportDraft();
  }, []);

  // Buscar torres quando o site for selecionado ou deduzido
  React.useEffect(() => {
    const fetchTowers = async () => {
      const siteId = effectiveSiteId;
      if (!siteId) return;

      const site = sites.find((s) => s.id === siteId);
      if (!site?.projectId) return;

      try {
        const { data, error } = await orionApi
          .from("tower_technical_data")
          .select("*")
          .eq("projectId", site.projectId)
          .eq("type", "TOWER")
          .order("sequence", { ascending: true });

        if (!error && data) {
          // Mapear MapElementTechnicalData para a interface interna Tower do componente
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
  }, [sites, effectiveSiteId]);

  // Auto-selecionar os dados se for trabalhador e não houver rascunho
  React.useEffect(() => {
    if (isWorker && workerEmployeeId && !employeeId) {
      updateReportDraft({
        employeeId: workerEmployeeId,
        teamIds: workerTeam ? [workerTeam.id] : [],
      });
    }
  }, [isWorker, workerEmployeeId, workerTeam, employeeId]);

  const todayReports = getTodayReports().filter((r) => {
    if (isWorker && workerTeam) {
      return r.teamId === workerTeam.id;
    }
    return true;
  });

  const isStep1Valid =
    !!employeeId &&
    (subPointType === "GERAL" ||
      (isMultiSelection ? !!subPoint && !!subPointEnd : !!subPoint));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !activities.trim()) {
      toast({
        title: "Erro",
        description: "Selecione o funcionário e descreva as atividades",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      let finalSubPoint = subPoint;
      let expandedTowers: string[] = [];

      // Processamento de Multi-Vão / Intervalo de Vãos
      if (subPointType === "VAO" && subPoint) {
        let selectedSpansData: any[] = [];

        if (isMultiSelection && subPointEnd) {
          const startIdx = projectSpans.findIndex(s => s.id === subPoint);
          const endIdx = projectSpans.findIndex(s => s.id === subPointEnd);
          if (startIdx !== -1 && endIdx !== -1) {
            const min = Math.min(startIdx, endIdx);
            const max = Math.max(startIdx, endIdx);
            selectedSpansData = projectSpans.slice(min, max + 1);
          }
        } else {
          const singleSpan = projectSpans.find(s => s.id === subPoint);
          if (singleSpan) selectedSpansData = [singleSpan];
        }

        if (selectedSpansData.length > 0) {
          finalSubPoint = isMultiSelection && subPointEnd
            ? `${selectedSpansData[0].span_name} a ${selectedSpansData[selectedSpansData.length - 1].span_name}`
            : selectedSpansData[0].span_name;

          // Coletar torres únicas dos vãos selecionados
          expandedTowers = Array.from(new Set(selectedSpansData.flatMap(s => [s.tower_start_id, s.tower_end_id])));
        }
      }

      // Processamento de Intervalo de Torres
      if (
        isMultiSelection &&
        subPointType === "TORRE" &&
        subPoint &&
        subPointEnd
      ) {
        const startIdx = projectTowers.findIndex(
          (t) =>
            t.id === subPoint ||
            t.externalId?.toUpperCase() === subPoint.toUpperCase() ||
            t.name?.toUpperCase() === subPoint.toUpperCase(),
        );
        const endIdx = projectTowers.findIndex(
          (t) =>
            t.id === subPointEnd ||
            t.externalId?.toUpperCase() === subPointEnd.toUpperCase() ||
            t.name?.toUpperCase() === subPointEnd.toUpperCase(),
        );

        if (startIdx !== -1 && endIdx !== -1) {
          const min = Math.min(startIdx, endIdx);
          const max = Math.max(startIdx, endIdx);
          const range = projectTowers.slice(min, max + 1);
          expandedTowers = range.map((t) => t.externalId || t.name);
          finalSubPoint = `${projectTowers[min].name} a ${projectTowers[max].name}`;
        }
      }

      // Consolidar nomes das atividades para o campo de texto
      const selectedActivityNames = selectedActivities
        .map(sa => workStages.find(ws => ws.id === sa.stageId)?.name)
        .filter(Boolean)
        .join(", ");

      const result = await createReport({
        teamIds: teamIds,
        subPoint: finalSubPoint || undefined,
        subPointType: subPointType,
        employeeId: employeeId,
        companyId: profile?.companyId,
        activities: selectedActivityNames || activities.trim() || "Atividades da Grelha selecionadas",
        selectedActivities: selectedActivities,
        observations: observations.trim() || undefined,
        metadata: {
          expandedTowers:
            expandedTowers.length > 0 ? expandedTowers : undefined,
          isMultiSelection,
          selectedActivities: selectedActivities,
        },
      });

      if (result.success) {
        resetReportDraft();
        toast({
          title: "Relatório enviado!",
          description:
            expandedTowers.length > 0
              ? `${expandedTowers.length} torres incluídas no relatório.`
              : "O relatório diário foi salvo com sucesso.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep = () => {
    if (isStep1Valid) {
      updateReportDraft({ step: 2 });
    } else {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha os dados do funcionário e identificação.",
        variant: "destructive",
      });
    }
  };

  const handlePrevStep = () => {
    updateReportDraft({ step: 1 });
  };

  const getLocationsByType = () => {
    if (subPointType === "TORRE") {
      return projectTowers.map((t) => ({
        id: t.externalId || t.name,
        label: t.name || t.externalId,
      }));
    }
    if (subPointType === "VAO" || subPointType === "TRECHO") {
      return projectSpans.map((s) => ({ id: s.id, label: s.span_name }));
    }
    return [];
  };

  const LocationPicker = ({ value, onChange, placeholder }: any) => {
    const [open, setOpen] = React.useState(false);
    const locations = getLocationsByType();

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-primary/10 border-primary/20 hover:bg-primary/20 hover:border-primary/30 text-foreground h-11 rounded-xl"
            disabled={subPointType === "GERAL"}
          >
            {value
              ? locations.find((loc) => loc.id === value)?.label
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 glass-card border-primary/20">
          <Command className="bg-transparent text-foreground">
            <CommandInput
              placeholder="Buscar localização..."
              className="h-9 border-none focus:ring-0 text-foreground"
            />
            <CommandList>
              <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">
                Nenhum local encontrado.
              </CommandEmpty>
              <CommandGroup>
                {locations.map((loc) => (
                  <CommandItem
                    key={loc.id}
                    value={loc.label}
                    onSelect={() => {
                      onChange(loc.id);
                      setOpen(false);
                    }}
                    className="hover:bg-primary/20 cursor-pointer text-foreground data-[selected=true]:bg-primary/20"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-primary",
                        value === loc.id ? "opacity-100" : "opacity-0",
                      )}
                    />
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

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <Card
            className={cn(
              "glass-card transition-all duration-500 border-none shadow-2xl relative overflow-hidden",
              step === 1
                ? "bg-primary/5 ring-1 ring-primary/20"
                : "bg-primary/5 ring-1 ring-primary/20",
            )}
          >
            {/* Decoração de topo similar ao mockup */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-1.5 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]",
              )}
            />

            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleSidebar}
                      className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg transition-colors hidden lg:flex"
                      title={isSidebarOpen ? "Ocultar Menu" : "Expandir Menu"}
                    >
                      {isSidebarOpen ? (
                        <PanelLeftClose className="w-5 h-5" />
                      ) : (
                        <PanelLeftOpen className="w-5 h-5" />
                      )}
                    </Button>
                    <FileText className="w-6 h-6 text-primary" />
                    Novo Relatório
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/60 mt-1 pl-11">
                    Preencha os dados de identificação e as atividades realizadas abaixo
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-24 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-500" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground/40">
                    Formulário Unificado
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">
                      Funcionário *
                    </Label>
                    {isWorker ? (
                      <div className="industrial-input flex items-center bg-primary/10 border-primary/20 px-5 py-4 rounded-xl cursor-not-allowed">
                        <span className="text-white font-semibold">
                          {profile?.fullName}
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={employeeId}
                        onValueChange={(val) =>
                          updateReportDraft({ employeeId: val })
                        }
                      >
                        <SelectTrigger className="bg-primary/10 border-primary/20 focus:ring-primary/40 rounded-xl py-7 text-foreground hover:bg-primary/20 transition-all">
                          <SelectValue placeholder="Selecione o funcionário responsável" />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-primary/20">
                          {employees.map((e) => (
                            <SelectItem
                              key={e.id}
                              value={e.id}
                              className="hover:bg-primary/20 cursor-pointer"
                            >
                              {e.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="p-6 rounded-2xl bg-primary/3 border border-primary/10 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">
                        Canteiro / Projeto *
                      </Label>
                      <Select
                        value={effectiveSiteId || ""}
                        onValueChange={(val) =>
                          updateReportDraft({ siteId: val })
                        }
                      >
                        <SelectTrigger className="bg-primary/5 border-primary/20 rounded-2xl h-12 focus:ring-primary/40">
                          <SelectValue placeholder="Selecione o projeto/canteiro..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-primary/10">
                          {sites.map((s) => (
                            <SelectItem
                              key={s.id}
                              value={s.id}
                              className="rounded-xl focus:bg-primary/10"
                            >
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">
                        Informações de Localização
                      </Label>
                      {effectiveSiteId && (
                        <span className="text-[9px] text-primary/40 font-mono tracking-tighter pl-1">
                          PROJETO:{" "}
                          {sites
                            .find((s) => s.id === effectiveSiteId)
                            ?.name?.toUpperCase() || "NÃO IDENTIFICADO"}
                        </span>
                      )}
                    </div>
                    {(subPointType === "TORRE" || subPointType === "VAO") && (
                      <label className="flex items-center gap-3 text-[10px] font-bold text-primary/60 cursor-pointer hover:text-primary transition-all uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/10">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-primary/30 bg-primary/20 text-primary focus:ring-primary/40"
                          checked={isMultiSelection}
                          onChange={(e) =>
                            updateReportDraft({
                              isMultiSelection: e.target.checked,
                              subPointEnd: "" // Limpar fim ao trocar modo
                            })
                          }
                        />
                        {subPointType === "TORRE" ? "Seleção Múltipla" : `Multi-Vão`}
                      </label>
                    )}
                  </div>

                  {/* QUICK ACTIVITY ADD BAR (YELLOW/RED) */}
                  <div className="w-full bg-amber-500/5 border border-red-500/20 rounded-xl p-2 flex items-center gap-2 relative group transition-all hover:bg-amber-500/10 hover:border-red-500/30">
                    <div className="absolute -top-2.5 left-4 px-2 bg-[#0c0c0e] text-[9px] font-bold text-amber-500 uppercase tracking-widest border border-red-500/20 rounded-full">
                      Adicionar Atividade
                    </div>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="flex-1 justify-start text-foreground hover:text-white hover:bg-white/5 h-10 px-3 font-normal border border-white/10 bg-black/20">
                          <Search className="w-4 h-4 mr-2 text-amber-500" />
                          <span className={quickActivityId ? "text-foreground font-medium" : ""}>
                            {quickActivityId
                              ? workStages.find(s => s.id === quickActivityId)?.name
                              : "Buscar atividade para adicionar..."}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 glass-card border-amber-500/20" align="start">
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Filtrar atividades..." className="h-10" />
                          <CommandList>
                            <CommandEmpty>Nenhuma atividade encontrada.</CommandEmpty>
                            <CommandGroup heading="Etapas de Obra">
                              {workStages
                                // .filter(s => !!s.parentId) // Relaxed filter: show all, or maybe show parents differently?
                                // Let's show everything to be safe, or just leaf nodes if we can determine them.
                                // If the user has a flat structure, !!s.parentId will be empty.
                                // Better approach: Show all stages sort by name/sequence.
                                .map((stage) => (
                                  <CommandItem
                                    key={stage.id}
                                    value={stage.name}
                                    onSelect={() => {
                                      setQuickActivityId(stage.id);
                                      // Auto-trigger add? Or wait for button? User said "red arrow indicates button to save".
                                      // Let's Keep flow: Select -> Click Button to Add.
                                    }}
                                    className="cursor-pointer aria-selected:bg-amber-500/10"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4 text-amber-500", quickActivityId === stage.id ? "opacity-100" : "opacity-0")} />
                                    {stage.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <Button
                      type="button" // Prevent form submit
                      size="icon"
                      onClick={handleQuickAdd}
                      disabled={!quickActivityId}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg w-10 h-10 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                      title="Adicionar Atividade à Lista"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    <div
                      className={cn(
                        "space-y-3",
                        isMultiSelection
                          ? "col-span-12 md:col-span-4"
                          : "col-span-12 md:col-span-5",
                      )}
                    >
                      <Label className="text-[10px] text-primary/50 uppercase font-bold tracking-wider">
                        Tipo de Elemento
                      </Label>
                      <Select
                        value={subPointType}
                        onValueChange={(val) =>
                          updateReportDraft({
                            subPointType: val as 'GERAL' | 'TORRE' | 'VAO' | 'TRECHO',
                            isMultiSelection:
                              val === "TORRE" ? isMultiSelection : false,
                          })
                        }
                      >
                        <SelectTrigger className="bg-primary/10 border-primary/20 focus:ring-primary/40 rounded-xl h-11 text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-primary/20">
                          <SelectItem value="GERAL">
                            Geral (Sem Local)
                          </SelectItem>
                          <SelectItem value="TORRE">Torre</SelectItem>
                          <SelectItem value="VAO">Vão</SelectItem>
                          <SelectItem value="TRECHO">Trecho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div
                      className={cn(
                        "space-y-3",
                        isMultiSelection
                          ? "col-span-12 md:col-span-4"
                          : "col-span-12 md:col-span-7",
                      )}
                    >
                      <Label className="text-[10px] text-primary/50 uppercase font-bold tracking-wider">
                        {isMultiSelection ? (subPointType === "TORRE" ? "DA TORRE:" : "DO VÃO:") : "Identificação"}
                      </Label>
                      <LocationPicker
                        value={subPoint}
                        onChange={(val: string) =>
                          updateReportDraft({ subPoint: val })
                        }
                        placeholder={
                          subPointType === "GERAL"
                            ? "OPCIONAL"
                            : "BUSCAR..."
                        }
                      />
                    </div>

                    {isMultiSelection && (
                      <div className="col-span-12 md:col-span-4 space-y-3 animate-in zoom-in-95 duration-200 relative">
                        <Label className="text-[10px] text-primary/50 uppercase font-bold tracking-wider">
                          Até a Torre:
                        </Label>
                        <LocationPicker
                          value={subPointEnd}
                          onChange={(val: string) =>
                            updateReportDraft({ subPointEnd: val })
                          }
                          placeholder={subPointType === "TORRE" ? "FIM..." : "VÃO FIM..."}
                        />
                        {subPoint &&
                          subPointEnd && (
                            <div className="absolute -bottom-7 right-0 animate-fade-in translate-y-1">
                              {(() => {
                                if (subPointType === "TORRE" && projectTowers.length > 0) {
                                  const startIdx = projectTowers.findIndex(
                                    (t) => (t.externalId || t.name) === subPoint,
                                  );
                                  const endIdx = projectTowers.findIndex(
                                    (t) => (t.externalId || t.name) === subPointEnd,
                                  );
                                  if (startIdx !== -1 && endIdx !== -1) {
                                    const count = Math.abs(endIdx - startIdx) + 1;
                                    return (
                                      <span className="text-[9px] font-bold text-primary bg-primary/20 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1.5 shadow-lg shadow-primary/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        {count} torres no intervalo
                                      </span>
                                    );
                                  }
                                } else if (subPointType === "VAO" && projectSpans.length > 0) {
                                  const startIdx = projectSpans.findIndex(s => s.id === subPoint);
                                  const endIdx = projectSpans.findIndex(s => s.id === subPointEnd);
                                  if (startIdx !== -1 && endIdx !== -1) {
                                    const count = Math.abs(endIdx - startIdx) + 1;
                                    return (
                                      <span className="text-[9px] font-bold text-primary bg-primary/20 px-3 py-1 rounded-full border border-primary/20 flex items-center gap-1.5 shadow-lg shadow-primary/10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        {count} vãos no intervalo
                                      </span>
                                    );
                                  }
                                }
                                return null;
                              })()}
                            </div>
                          )}
                      </div>
                    )}
                  </div>


                  {/* TOTALIZADORES */}
                  {((subPointType === "VAO" && subPoint) || (subPointType === "VAO" && isMultiSelection && subPoint && subPointEnd)) && (
                    <div className="flex items-center gap-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-bold text-primary">
                          {spanTotals.towers} Torres
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold text-green-500">
                          {spanTotals.km} km
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">
                    Equipes Envolvidas *
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 border border-primary/10 rounded-2xl bg-primary/2 max-h-48 overflow-y-auto custom-scrollbar">
                    {teams.map((t) => (
                      <label
                        key={t.id}
                        className={cn(
                          "flex items-center gap-3 text-xs cursor-pointer p-3 rounded-xl transition-all border border-transparent",
                          teamIds.includes(t.id)
                            ? "bg-primary/15 text-primary border-primary/30 shadow-lg shadow-primary/10"
                            : "text-muted-foreground/60 hover:bg-primary/10 hover:border-primary/10",
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                            teamIds.includes(t.id)
                              ? "bg-primary"
                              : "bg-primary/10 border border-primary/20",
                          )}
                        >
                          {teamIds.includes(t.id) && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={teamIds.includes(t.id)}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.checked)
                              updateReportDraft({
                                teamIds: [...teamIds, t.id],
                              });
                            else
                              updateReportDraft({
                                teamIds: teamIds.filter(
                                  (id) => id !== t.id,
                                ),
                              });
                          }}
                        />
                        <span className="font-bold truncate max-w-[120px]">
                          {t.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-10 pt-10 border-t border-white/5">
                  {/* GRELHA TÉCNICA */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">
                        Grelha de Produção (Atividades Executadas)
                      </Label>
                      <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                        {selectedActivities.length} SELECIONADAS
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-1">
                      {isLoadingStages ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-primary/10 rounded-3xl bg-primary/2">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Carregando Grelha...</p>
                        </div>
                      ) : workStages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-primary/10 rounded-3xl bg-primary/2">
                          <Info className="w-8 h-8 text-primary/30" />
                          <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Nenhuma etapa configurada</p>
                        </div>
                      ) : (
                        workStages
                          .filter(s => !s.parentId)
                          .map(parent => (
                            <div key={parent.id} className="space-y-2">
                              <div className="px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {parent.displayOrder + 1}
                                  </div>
                                  <span className="text-xs font-black text-foreground uppercase tracking-tight">
                                    {parent.name}
                                  </span>
                                </div>
                                <div className="h-1.5 w-24 bg-primary/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)] transition-all duration-1000"
                                    style={{ width: `${parent.progress?.actualPercentage || 0}%` }}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                                {workStages
                                  .filter(child => child.parentId === parent.id)
                                  .map(child => {
                                    const activity = selectedActivities.find(a => a.stageId === child.id);
                                    const hasRealProduction = towersByStage[child.id]?.some(t =>
                                      subPointType === 'TORRE' ? (t.id === subPoint || t.objectId === subPoint || t.elementId === subPoint) : false
                                    );

                                    return (
                                      <div
                                        key={child.id}
                                        className={cn(
                                          "flex flex-col gap-3 p-5 rounded-4xl border transition-all duration-300 relative overflow-hidden group/item shadow-sm",
                                          activity
                                            ? (activity.status === 'FINISHED'
                                              ? "bg-green-500/5 border-green-500/30 ring-1 ring-green-500/10"
                                              : "bg-amber-500/5 border-amber-500/30 ring-1 ring-amber-500/10")
                                            : "bg-white/2 border-white/5 hover:border-primary/30 hover:bg-white/4"
                                        )}
                                      >
                                        {hasRealProduction && (
                                          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-12 -mt-12 rounded-full blur-2xl" />
                                        )}

                                        <div className="flex items-start justify-between relative z-10">
                                          <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className={cn(
                                                "text-xs font-black uppercase tracking-tight truncate",
                                                activity ? (activity.status === 'FINISHED' ? 'text-green-500' : 'text-amber-500') : 'text-foreground/90'
                                              )}>
                                                {child.name}
                                              </span>
                                              {hasRealProduction && (
                                                <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                                                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                                  <span className="text-[7px] font-black text-primary uppercase">Execução</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                              <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((b) => (
                                                  <div
                                                    key={b}
                                                    className={cn(
                                                      "w-2.5 h-1 rounded-full",
                                                      (child.progress?.actualPercentage || 0) >= b * 20
                                                        ? "bg-primary shadow-[0_0_5px_rgba(var(--primary),0.4)]"
                                                        : "bg-white/10"
                                                    )}
                                                  />
                                                ))}
                                              </div>
                                              <span className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest leading-none">
                                                Peso: {child.weight}%
                                              </span>
                                            </div>
                                          </div>

                                          {activity && (
                                            <div className={cn(
                                              "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-lg transition-transform animate-in zoom-in-90",
                                              activity.status === 'FINISHED'
                                                ? "bg-green-500 text-white border-green-400 shadow-green-500/20"
                                                : "bg-amber-500 text-white border-amber-400 shadow-amber-500/20"
                                            )}>
                                              {activity.status === 'FINISHED' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex gap-3 relative z-10">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                              "flex-1 h-9 text-[10px] font-black uppercase rounded-xl border transition-all duration-300",
                                              activity?.status === 'IN_PROGRESS'
                                                ? "bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-[0_8px_20px_rgba(245,158,11,0.15)] scale-[1.02]"
                                                : "bg-white/5 border-white/5 hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/20"
                                            )}
                                            onClick={() => {
                                              const current = selectedActivities.find(a => a.stageId === child.id);
                                              if (current?.status === 'IN_PROGRESS') {
                                                updateReportDraft({ selectedActivities: selectedActivities.filter(a => a.stageId !== child.id) });
                                              } else {
                                                const filtered = selectedActivities.filter(a => a.stageId !== child.id);
                                                updateReportDraft({ selectedActivities: [...filtered, { stageId: child.id, status: 'IN_PROGRESS' }] });
                                              }
                                            }}
                                          >
                                            Andamento
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                              "flex-1 h-9 text-[10px] font-black uppercase rounded-xl border transition-all duration-300",
                                              activity?.status === 'FINISHED'
                                                ? "bg-green-500/20 text-green-500 border-green-500/40 shadow-[0_8px_20px_rgba(34,197,94,0.15)] scale-[1.02]"
                                                : "bg-white/5 border-white/5 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/20"
                                            )}
                                            onClick={() => {
                                              const current = selectedActivities.find(a => a.stageId === child.id);
                                              if (current?.status === 'FINISHED') {
                                                updateReportDraft({ selectedActivities: selectedActivities.filter(a => a.stageId !== child.id) });
                                              } else {
                                                const filtered = selectedActivities.filter(a => a.stageId !== child.id);
                                                updateReportDraft({ selectedActivities: [...filtered, { stageId: child.id, status: 'FINISHED' }] });
                                              }
                                            }}
                                          >
                                            Concluído
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">
                      Observações adicionais (Notas de Campo)
                    </Label>
                    <Textarea
                      value={observations}
                      onChange={(e) => updateReportDraft({ observations: e.target.value })}
                      placeholder="Algum problema, imprevisto ou nota técnica importante de ser registrada?"
                      rows={4}
                      className="bg-white/2 border-white/10 focus:ring-primary/40 rounded-3xl resize-none p-6 text-foreground placeholder:text-muted-foreground/30 text-sm shadow-inner"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-4xl py-10 group shadow-[0_20px_50px_rgba(var(--primary),0.4)] border-0 text-xl font-black transition-all hover:scale-[1.01] active:scale-[0.98]"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="w-8 h-8 mr-3 animate-spin" />
                    ) : (
                      <Send className="w-8 h-8 mr-3 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                    )}
                    REGISTRAR E ENVIAR RELATÓRIO
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
