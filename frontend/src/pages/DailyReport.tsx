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
  PanelLeftOpen,
  Camera,
  Image as ImageIcon,
  Trash2,
  X
} from "lucide-react";
import { isProtectedSignal, can } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";
import {
  dailyReportDraftSignal,
  updateReportDraft,
  resetReportDraft,
  initReportDraft,
  type DailyReportActivity,
  type DailyReportSubPointDetail,
  type DailyReportPhoto,
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
import { fetchWorkStages, hasWorkStagesFetchedSignal } from "@/signals/workStageSignals";
import { useTowerProduction } from "@/modules/production/hooks/useTowerProduction";
import { Progress } from "@/components/ui/progress";
import { useCompanies } from "@/hooks/useCompanies";
import { useProjects } from "@/hooks/useProjects";
import { ScrollArea } from "@/components/ui/scroll-area";


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
  photos?: DailyReportPhoto[];
  step: number;
  updatedAt: number;
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

// Helper para converter HH:mm em minutos totais para comparação fácil
const toMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const addOneMinute = (timeStr: string) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(':').map(Number);
  let totalMinutes = h * 60 + m + 1;
  if (totalMinutes >= 1440) totalMinutes = 0;
  const newH = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const newM = (totalMinutes % 60).toString().padStart(2, '0');
  return `${newH}:${newM}`;
};

// Componente de Relógio Universal 24h
const TimePicker24h = ({ 
  value, 
  onChange, 
  isError,
  className
}: { 
  value: string; 
  onChange: (val: string) => void;
  isError?: boolean;
  className?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const currentHour = value ? value.split(':')[0] : "00";
  const currentMinute = value ? value.split(':')[1] : "00";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "bg-black/40 border border-white/5 rounded-lg h-8 px-2 text-[10px] font-black hover:bg-black/60 transition-all w-20 justify-start gap-1.5",
            isError ? "border-red-500 text-red-500 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "border-white/5",
            !isError && (className || "text-primary")
          )}
        >
          <Clock className="w-3 h-3 opacity-50" />
          {value || "--:--"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-0 bg-[#0c0c0e] border-white/10 shadow-2xl backdrop-blur-xl" side="bottom" align="start">
        <div className="flex h-48">
          <ScrollArea className="flex-1 border-r border-white/5">
            <div className="flex flex-col p-1">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => onChange(`${h}:${currentMinute}`)}
                  className={cn(
                    "h-8 flex items-center justify-center text-[11px] font-black rounded-lg transition-all",
                    currentHour === h ? "bg-primary text-black" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="flex-1">
            <div className="flex flex-col p-1">
              {minutes.map((m) => (
                <button
                  key={m}
                  onClick={() => onChange(`${currentHour}:${m}`)}
                  className={cn(
                    "h-8 flex items-center justify-center text-[11px] font-black rounded-lg transition-all",
                    currentMinute === m ? "bg-primary text-black" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="p-2 border-t border-white/5 flex items-center justify-between bg-black/40">
           <span className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest pl-1">24H</span>
           <Button variant="ghost" size="sm" className="h-6 text-[8px] font-black uppercase text-primary" onClick={() => setOpen(false)}>OK</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Componente de Upload de Fotos com Comentários
const PhotoUploadZone = ({ 
  photos = [], 
  onChange, 
  title = "Anexar Fotos",
  compact = false
}: { 
  photos?: DailyReportPhoto[]; 
  onChange: (photos: DailyReportPhoto[]) => void;
  title?: string;
  compact?: boolean;
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onChange([...photos, { url: base64String, comment: "" }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  const updateComment = (index: number, comment: string) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], comment };
    onChange(newPhotos);
  };

  return (
    <div className={cn("space-y-3", compact ? "mt-2" : "mt-6")}>
      {!compact && (
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 flex items-center gap-2">
          <Camera className="w-3 h-3" />
          {title} ({photos.length})
        </Label>
      )}
      
      <div className="flex flex-wrap gap-3">
        {/* Thumbnails */}
        {photos.map((photo, idx) => (
          <div key={idx} className={cn(
            "group relative bg-black/40 border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-primary/40",
            compact ? "w-24" : "w-32"
          )}>
            <img src={photo.url} alt={`Foto ${idx + 1}`} className="w-full h-20 object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
            
            <button 
              onClick={() => removePhoto(idx)}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            <div className="p-1 px-1.5 pb-2">
              <input 
                type="text" 
                placeholder="Comentário..." 
                className="w-full bg-transparent border-none text-[8px] font-bold text-white/50 focus:text-primary outline-none placeholder:text-white/10"
                value={photo.comment || ""}
                onChange={(e) => updateComment(idx, e.target.value)}
              />
            </div>
          </div>
        ))}

        {/* Upload Button */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center border-2 border-dashed border-white/5 hover:border-primary/20 bg-white/5 hover:bg-primary/5 rounded-2xl transition-all gap-2 group",
            compact ? "w-24 h-[106px]" : "w-32 h-[114px]"
          )}
        >
          <Plus className="w-5 h-5 text-white/20 group-hover:text-primary transition-colors" />
          <span className="text-[8px] font-black uppercase text-white/20 group-hover:text-primary">Adicionar</span>
        </button>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
    </div>
  );
};

export default function DailyReport() {
  useSignals();
  const isSidebarOpen = isSidebarOpenSignal.value;
  const { profile } = useAuth();
  const { toast } = useToast();

  const isWorker = !isProtectedSignal.value && !can("daily_reports.manage");
  const isSuperAdmin = !profile?.companyId; // Gestão Global / Super Admin

  const [selectedCompanyId, setSelectedCompanyId] = React.useState<string | undefined>(profile?.companyId);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | undefined>(undefined);

  // Se for Super Admin, permitir selecionar empresa
  const { companies } = useCompanies();
  
  // Atualizar selectedCompanyId se o profile mudar (login/logout)
  React.useEffect(() => {
    if (profile?.companyId) setSelectedCompanyId(profile.companyId);
  }, [profile?.companyId]);

  const workerEmployeeId = profile?.employeeId;
  const { teams } = useTeams(selectedCompanyId);
  const { projects } = useProjects();
  const { sites } = useSites(selectedProjectId, selectedCompanyId);
  const { createReport, getTodayReports } = useDailyReports();

  const filteredProjects = React.useMemo(() => {
    if (!selectedCompanyId) return [];
    return projects.filter(p => p.companyId === selectedCompanyId);
  }, [projects, selectedCompanyId]);

  const draft = dailyReportDraftSignal.value;
  const {
    employeeId,
    teamIds,
    selectedActivities,
    siteId,
    step, // Added step to draft destructuring
  } = draft;

  // Estados locais para o "Mini-Relatório" de adição de atividade
  const employeesFilter = React.useMemo(
    () => ({ companyId: selectedCompanyId }),
    [selectedCompanyId],
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
  const [isActivityPopoverOpen, setIsActivityPopoverOpen] = React.useState(false);
  const [projectTowers, setProjectTowers] = React.useState<Tower[]>([]);
  const [quickActivityId, setQuickActivityId] = React.useState<string>("");

  const handleAddItem = () => {
    if (!currentStageId) {
      toast({ title: "Atividade não selecionada", description: "Escolha uma atividade na lista antes de adicionar.", variant: "destructive" });
      return;
    }

    if (currentSubPointType !== 'GERAL' && !currentSubPoint) {
      toast({ title: "Localização ausente", description: "Informe a torre ou vão da atividade.", variant: "destructive" });
      return;
    }

    if (currentIsMultiSelection && !currentSubPointEnd) {
      toast({ title: "Intervalo incompleto", description: "Informe o ponto final da atividade.", variant: "destructive" });
      return;
    }

    const stageName = fixBrokenEncoding(workStages.find(s => s.id === currentStageId)?.name || "Atividade");

    // Validação de Horários (Intervalos)
    if (currentSubPointType !== 'GERAL') {
      const detailsWithTime = currentDetails.filter(d => d.startTime && d.endTime);
      
      if (detailsWithTime.length < currentDetails.length) {
        toast({ title: "Horários incompletos", description: "Todos os itens devem ter horário de INÍCIO e FIM definidos.", variant: "destructive" });
        return;
      }

      if (timeConflicts.invalidIds.size > 0) {
        toast({ title: "Intervalo Inválido", description: "Um ou mais itens possuem horário de fim anterior ou igual ao de início.", variant: "destructive" });
        return;
      }

      if (timeConflicts.internalOverlapIds.size > 0) {
        toast({ title: "Sobreposição Interna", description: "Existem itens selecionados com horários que se sobrepõem.", variant: "destructive" });
        return;
      }

      if (timeConflicts.externalOverlapIds.size > 0) {
        toast({ title: "Conflito de Horário", description: "A equipe já possui atividades registradas que sobrepõem estes horários.", variant: "destructive" });
        return;
      }

      if (timeConflicts.chronologyErrorIds.size > 0) {
        toast({ title: "Erro de Cronologia", description: "Não é possível lançar atividades com horário de início anterior ao fim do último registro do dia.", variant: "destructive" });
        return;
      }
    }

    const existingActivityIndex = selectedActivities.findIndex(a => a.stageId === currentStageId);

    if (existingActivityIndex !== -1) {
      // Mesclar com atividade existente
      const updatedActivities = [...selectedActivities];
      const existing = updatedActivities[existingActivityIndex];
      
      updatedActivities[existingActivityIndex] = {
        ...existing,
        details: [...existing.details, ...currentDetails],
        observations: existing.observations && currentObservations
          ? `${existing.observations}\n${currentObservations}`
          : (existing.observations || currentObservations),
        photos: [...(existing.photos || []), ...currentPhotos],
        // Atualiza subPoint para refletir múltiplos se for diferente
        subPoint: existing.subPoint === currentSubPoint ? existing.subPoint : `${existing.subPoint}, ${currentSubPoint}`,
        isMultiSelection: existing.isMultiSelection || currentIsMultiSelection || existing.details.length > 1
      };

      updateReportDraft({
        selectedActivities: updatedActivities
      });
    } else {
      const newItem: DailyReportActivity = {
        id: crypto.randomUUID(),
        stageId: currentStageId,
        stageName,
        subPointType: currentSubPointType,
        subPoint: currentSubPoint,
        subPointEnd: currentSubPointEnd,
        isMultiSelection: currentIsMultiSelection,
        observations: currentObservations,
        status: currentStatus,
        details: currentDetails,
        photos: currentPhotos
      };

      updateReportDraft({
        selectedActivities: [...selectedActivities, newItem]
      });
    }


    // Reset local form
    setCurrentStageId("");
    setCurrentObservations("");
    setCurrentDetails([]);
    setLockedDetails([]);
    setCurrentPhotos([]);
    
    toast({
      title: "Atividade Adicionada",
      description: `"${stageName}" incluída no relatório.`,
      className: "bg-green-500/10 border-green-500/20 text-green-500"
    });
  };

  const handleRemoveItem = (id: string) => {
    updateReportDraft({
      selectedActivities: selectedActivities.filter(a => a.id !== id)
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

  // Derivar o projectId efetivo: do canteiro selecionado ou da seleção direta de projeto
  const effectiveProjectId = React.useMemo(() => {
    const fromSite = sites.find((s) => s.id === effectiveSiteId)?.projectId;
    return fromSite || selectedProjectId || undefined;
  }, [effectiveSiteId, sites, selectedProjectId]);

  // Carregar etapas de obra (Grelha de Produção) — busca por projeto mesmo sem canteiro
  const { stages: workStages, isLoading: isLoadingStages } = useWorkStages(
    effectiveSiteId || undefined,
    effectiveProjectId,
    false,
    selectedCompanyId
  );

  // Forçar reload das stages quando o projeto mudar
  React.useEffect(() => {
    if (effectiveProjectId) {
      fetchWorkStages(true, effectiveSiteId || undefined, effectiveProjectId, selectedCompanyId).catch(console.error);
    }
  }, [effectiveProjectId, effectiveSiteId, selectedCompanyId]);

  // Carregar dados de execução real para sincronizar com a Grelha
  const { towersByStage, loadProductionData } = useTowerProduction();

  // Efeito para carregar dados de produção quando as etapas forem carregadas
  React.useEffect(() => {
    if (workStages.length > 0 && effectiveSiteId && selectedCompanyId) {
      const projectId = sites.find(s => s.id === effectiveSiteId)?.projectId;
      if (projectId) {
        loadProductionData(workStages, projectId, effectiveSiteId, selectedCompanyId);
      }
    }
  }, [workStages, effectiveSiteId, selectedCompanyId, loadProductionData, sites]);
  
  // Agrupar atividades por categoria para visualização organizada (similar à Grelha de Produção)
  const workStagesGrouped = React.useMemo(() => {
    if (workStages.length === 0) return [];
    
    // Remover duplicatas por ID e NOME (normalizado) para evitar ruído visual
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

    const sortedStages = uniqueStages.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const parents = sortedStages.filter(s => !s.parentId);
    const children = sortedStages.filter(s => s.parentId);
    
    const groups: { category: string; items: any[] }[] = [];
    const standaloneItems: any[] = [];
    
    // Processar pais e seus filhos
    parents.forEach(p => {
      const pChildren = children.filter(c => c.parentId === p.id);
      if (pChildren.length > 0) {
        groups.push({ category: p.name, items: pChildren });
      } else {
        // Se é um item de topo sem filhos, é selecionável como standalone
        standaloneItems.push(p);
      }
    });
    
    // Adicionar filhos "órfãos" (cujo pai não está na lista filtrada)
    const orphanChildren = children.filter(c => !parents.some(p => p.id === c.parentId));
    if (orphanChildren.length > 0) {
      standaloneItems.push(...orphanChildren);
    }

    // Se houver itens standalone, agrupar sob uma categoria geral
    if (standaloneItems.length > 0) {
      groups.push({ 
        category: "Atividades Disponíveis", 
        items: standaloneItems.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)) 
      });
    }
    
    return groups;
  }, [workStages]);

  const [previewData, setPreviewData] = React.useState<{
    expandedTowers: string[];
    finalLabel: string;
    metrics: { towers: number; km: string };
  }>({ expandedTowers: [], finalLabel: "", metrics: { towers: 0, km: "0.00" } });
  const [isPreviewing, setIsPreviewing] = React.useState(false);

  // Estados locais para o "Mini-Relatório" de adição de atividade (Movido para cá para evitar erro de referência com previewData)
  const [currentStageId, setCurrentStageId] = React.useState<string>("");
  const [currentSubPointType, setCurrentSubPointType] = React.useState<'GERAL' | 'TORRE' | 'VAO' | 'TRECHO' | 'ESTRUTURA'>('TORRE');
  const [currentSubPoint, setCurrentSubPoint] = React.useState<string>("");
  const [currentSubPointEnd, setCurrentSubPointEnd] = React.useState<string>("");
  const [currentIsMultiSelection, setCurrentIsMultiSelection] = React.useState<boolean>(false);
  const [currentObservations, setCurrentObservations] = React.useState<string>("");
  const [currentStatus, setCurrentStatus] = React.useState<'IN_PROGRESS' | 'FINISHED'>('FINISHED');
  const [currentDetails, setCurrentDetails] = React.useState<DailyReportSubPointDetail[]>([]);
  const [lockedDetails, setLockedDetails] = React.useState<DailyReportSubPointDetail[]>([]);
  const [currentPhotos, setCurrentPhotos] = React.useState<DailyReportPhoto[]>([]);

  // Memo para detecção de conflitos de horário em tempo real
  const timeConflicts = React.useMemo(() => {
    const invalidIds = new Set<string>(); // Fim <= Início
    const internalOverlapIds = new Set<string>(); // Sobreposição na listagem atual
    const externalOverlapIds = new Set<string>(); // Sobreposição com atividades já adicionadas
    const chronologyErrorIds = new Set<string>(); // Anterior ao último lançamento do dia

    if (currentSubPointType === 'GERAL') return { invalidIds, internalOverlapIds, externalOverlapIds, chronologyErrorIds };

    const existingIntervals = selectedActivities.flatMap(act => 
      act.details?.map(d => ({ 
        s: toMinutes(d.startTime!), 
        e: toMinutes(d.endTime!), 
        id: d.id, 
        act: act.stageName 
      })) || []
    );

    const lastEndTime = existingIntervals.length > 0 ? Math.max(...existingIntervals.map(ex => ex.e)) : 0;

    currentDetails.forEach((d, i) => {
      if (!d.startTime || !d.endTime) return;
      const s = toMinutes(d.startTime), e = toMinutes(d.endTime);

      // 1. Ordem Lógica
      if (s >= e) invalidIds.add(d.id);

      // 2. Sobreposição Interna
      currentDetails.forEach((other, j) => {
        if (i === j || !other.startTime || !other.endTime) return;
        const sOther = toMinutes(other.startTime), eOther = toMinutes(other.endTime);
        if (s < eOther && sOther < e) internalOverlapIds.add(d.id);
      });

      // 3. Sobreposição Externa
      const conflict = existingIntervals.find(ex => s < ex.e && ex.s < e);
      if (conflict) externalOverlapIds.add(d.id);

      // 4. Cronologia
      if (s < lastEndTime) chronologyErrorIds.add(d.id);
    });

    return { invalidIds, internalOverlapIds, externalOverlapIds, chronologyErrorIds };
  }, [currentDetails, currentSubPointType, selectedActivities]);

  // Sincronizar detalhes individuais quando a seleção mudar
  React.useEffect(() => {
    let activeDetails: DailyReportSubPointDetail[] = [];

    // Se temos um preview com torres expandidas, usamos elas
    if (previewData.expandedTowers && previewData.expandedTowers.length > 0) {
      const currentStageProduction = towersByStage[currentStageId] || [];
      
      activeDetails = previewData.expandedTowers.map((id, idx) => {
        // Buscar progresso atual na grelha de produção para esta torre
        const prodInfo = currentStageProduction.find(t => t.objectId === id);
        const currentProgress = prodInfo?.activityStatuses?.find(s => 
          s.activityId === currentStageId || s.activity?.id === currentStageId
        )?.progressPercent || 0;

        const lastAct = selectedActivities[selectedActivities.length - 1];
        const lastItemInLastAct = lastAct?.details?.[lastAct.details.length - 1];
        const lastReportEndTime = lastItemInLastAct?.endTime || "";

        return {
          id,
          status: currentProgress >= 100 ? 'FINISHED' : (currentProgress > 0 ? 'IN_PROGRESS' : currentStatus),
          progress: currentProgress,
          comment: "",
          startTime: idx === 0 ? lastReportEndTime : "" ,
          endTime: ""
        };
      });
    } else if (currentSubPoint && currentSubPointType !== 'GERAL') {
      // Ponto único
      const currentStageProduction = towersByStage[currentStageId] || [];
      const prodInfo = currentStageProduction.find(t => t.objectId === currentSubPoint);
      const currentProgress = prodInfo?.activityStatuses?.find(s => 
        s.activityId === currentStageId || s.activity?.id === currentStageId
      )?.progressPercent || 0;

      const lastAct = selectedActivities[selectedActivities.length - 1];
      const lastItemInLastAct = lastAct?.details?.[lastAct.details.length - 1];
      const lastReportEndTime = lastItemInLastAct?.endTime || "";

      activeDetails = [{
        id: currentSubPoint,
        status: currentProgress >= 100 ? 'FINISHED' : (currentProgress > 0 ? 'IN_PROGRESS' : currentStatus),
        progress: currentProgress,
        comment: "",
        startTime: lastReportEndTime,
        endTime: ""
      }];
    }

    // Remover duplicatas entre activeDetails e lockedDetails (priorizar locked)
    const filteredActive = activeDetails.filter(ad => !lockedDetails.some(ld => ld.id === ad.id));
    setCurrentDetails([...lockedDetails, ...filteredActive]);

  }, [previewData.expandedTowers, currentSubPoint, currentSubPointType, currentStatus, towersByStage, currentStageId, selectedActivities, lockedDetails]);

  const spanTotals = previewData.metrics;

  // Handler para busca de preview baseado nos estados locais do mini-form
  const fetchPreviewLocal = React.useCallback(async () => {
    const projectId = sites.find((s) => s.id === effectiveSiteId)?.projectId;
    if (!projectId || currentSubPointType === "GERAL" || !currentSubPoint) {
      setPreviewData({
        expandedTowers: [],
        finalLabel: "",
        metrics: { towers: 0, km: "0.00" },
      });
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
      if (response.data) {
        setPreviewData(response.data as any);
      }
    } catch (err) {
      console.error("[DailyReport] Error fetching preview:", err);
    } finally {
      setIsPreviewing(false);
    }
  }, [
    effectiveSiteId,
    currentSubPointType,
    currentSubPoint,
    currentSubPointEnd,
    currentIsMultiSelection,
    sites,
  ]);

  React.useEffect(() => {
    fetchPreviewLocal();
  }, [fetchPreviewLocal]);

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
          .from("map_elements")
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

  const isStep1Valid = !!employeeId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Fallback: se o employeeId não foi explicitamente selecionado, usar do perfil
    const effectiveEmployeeId = employeeId || profile?.employeeId || (profile as any)?.id || '';

    console.debug('[RDO Submit] employeeId:', employeeId, 'effectiveEmployeeId:', effectiveEmployeeId, 'selectedActivities:', selectedActivities.length);

    if (!effectiveEmployeeId) {
      toast({
        title: "Erro",
        description: "Selecione o funcionário responsável pelo relatório.",
        variant: "destructive",
      });
      return;
    }

    if (selectedActivities.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma atividade ao relatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // O payload agora é puramente baseado em selectedActivities
      const result = await createReport({
        teamIds: teamIds,
        employeeId: effectiveEmployeeId,
        companyId: selectedCompanyId, 
        activities: selectedActivities.map(a => `${a.stageName} (${a.subPoint})`).join(", "),
        selectedActivities: selectedActivities,
        metadata: {
          selectedActivities: selectedActivities,
        },
      });

      if (result.success) {
        resetReportDraft();
        toast({
          title: "Relatório enviado!",
          description: `O rdo com ${selectedActivities.length} atividades foi salvo com sucesso.`,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrevStep = () => {
    updateReportDraft({ step: 1 });
  };

  const getLocationsByType = () => {
    if (currentSubPointType === "TORRE") {
      return projectTowers.map((t) => ({
        id: t.externalId || t.name,
        label: t.name || t.externalId,
      }));
    }
    if (currentSubPointType === "VAO" || currentSubPointType === "TRECHO") {
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
            disabled={currentSubPointType === "GERAL"}
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
              <form onSubmit={handleSubmit} className="space-y-8 p-4">
                <div className="space-y-8">
                  {/* IDENTIFICAÇÃO BÁSICA (Fica fixo no topo) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                      {isSuperAdmin && (
                        <div className="space-y-3">
                          <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">Empresa</Label>
                          <Select value={selectedCompanyId || ""} onValueChange={(val) => { setSelectedCompanyId(val); setSelectedProjectId(undefined); updateReportDraft({ siteId: "" }); }}>
                            <SelectTrigger className="bg-black/20 border-primary/20 rounded-xl h-11"><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
                            <SelectContent className="glass-card">{companies?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">Obra / Projeto</Label>
                        <Select value={selectedProjectId || ""} onValueChange={(val) => { setSelectedProjectId(val); updateReportDraft({ siteId: "" }); }} disabled={!selectedCompanyId}>
                          <SelectTrigger className="bg-black/20 border-primary/20 rounded-xl h-11"><SelectValue placeholder="Selecione a obra..." /></SelectTrigger>
                          <SelectContent className="glass-card">{filteredProjects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">Canteiro</Label>
                        <Select value={effectiveSiteId || ""} onValueChange={(val) => updateReportDraft({ siteId: val })} disabled={!selectedProjectId}>
                          <SelectTrigger className="bg-black/20 border-primary/20 rounded-xl h-11"><SelectValue placeholder="Selecione o canteiro..." /></SelectTrigger>
                          <SelectContent className="glass-card">{sites.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">Responsável</Label>
                        {isWorker ? (
                          <div className="bg-black/20 border border-primary/10 h-11 flex items-center px-4 rounded-xl text-xs font-bold">{profile?.fullName}</div>
                        ) : (
                          <Select value={employeeId} onValueChange={(val) => updateReportDraft({ employeeId: val })} disabled={!selectedCompanyId}>
                            <SelectTrigger className="bg-black/20 border-primary/20 rounded-xl h-11"><SelectValue placeholder="Responsável..." /></SelectTrigger>
                            <SelectContent className="glass-card">{employees.map((e) => (<SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>))}</SelectContent>
                          </Select>
                        )}
                      </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-primary/80 font-bold uppercase text-[10px] tracking-widest pl-1">Equipes Envolvidas</Label>
                    <div className="flex flex-wrap gap-2 p-2 border border-primary/5 rounded-2xl bg-black/10">
                      {teams.map((t) => (
                        <Button
                          key={t.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "rounded-full text-[10px] font-bold px-4 h-8 transition-all",
                            teamIds.includes(t.id) ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-transparent border-primary/10 text-muted-foreground"
                          )}
                          onClick={() => {
                            const newIds = teamIds.includes(t.id) ? teamIds.filter(id => id !== t.id) : [...teamIds, t.id];
                            updateReportDraft({ teamIds: newIds });
                          }}
                        >
                          {t.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* SEÇÃO: ADICIONAR NOVA ATIVIDADE (MINI-RELATÓRIO) */}
                  <div className="p-8 bg-amber-500/5 border-2 border-amber-500/20 rounded-[2.5rem] space-y-8 relative overflow-hidden group/form">
                      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover/form:opacity-10 transition-opacity">
                         <Plus className="w-32 h-32" />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                          <Plus className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-amber-500 uppercase tracking-tight">Relatar Atividade Executada</h3>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Identifique a tarefa, o local e o que foi feito</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/40">1. Qual Atividade?</Label>
                          <Popover open={isActivityPopoverOpen} onOpenChange={setIsActivityPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start h-14 bg-black/40 border-amber-500/20 rounded-2xl hover:bg-black/60 transition-all text-left px-6">
                                <Search className="w-5 h-5 mr-3 text-amber-500/60" />
                                <span className="font-bold truncate">
                                  {currentStageId ? fixBrokenEncoding(workStages.find(s => s.id === currentStageId)?.name || "") : "Escolha a atividade..."}
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[450px] p-0 glass-card border-amber-500/30 shadow-2xl">
                              <Command className="bg-[#0c0c0e]">
                                <CommandInput placeholder="Filtrar atividades..." className="h-12 border-none" />
                                <CommandList className="max-h-[350px]">
                                  {workStagesGrouped.map((group) => (
                                    <CommandGroup key={group.category} heading={<span className="text-amber-500/60 font-black text-[10px] tracking-widest uppercase px-2">{group.category}</span>}>
                                      {group.items.map((stage) => (
                                        <CommandItem 
                                          key={stage.id} 
                                          value={stage.name} 
                                          onSelect={() => {
                                            setCurrentStageId(stage.id);
                                            setIsActivityPopoverOpen(false);
                                          }} 
                                          className="cursor-pointer aria-selected:bg-amber-500/20 rounded-xl m-1 px-4 py-3"
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-bold text-sm">{stage.name}</span>
                                            {stage.description && <span className="text-[10px] text-muted-foreground">{stage.description}</span>}
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
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/40">2. Onde? (Localização)</Label>
                          
                          <div className="flex flex-col md:flex-row gap-6">
                            {/* Coluna 1: Tipo e Opção Multi */}
                            <div className="flex flex-col gap-3 min-w-[150px]">
                              <Select value={currentSubPointType} onValueChange={(val: any) => setCurrentSubPointType(val)}>
                                <SelectTrigger className="bg-black/40 border-amber-500/20 rounded-2xl h-14 font-bold text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="glass-card">
                                  <SelectItem value="GERAL">Geral</SelectItem>
                                  <SelectItem value="TORRE">Torre</SelectItem>
                                  <SelectItem value="VAO">Vão</SelectItem>
                                  <SelectItem value="TRECHO">Trecho</SelectItem>
                                </SelectContent>
                              </Select>

                              <label className="flex items-center gap-2 text-[10px] font-bold text-amber-500/60 cursor-pointer pt-1">
                                <input 
                                  type="checkbox" 
                                  checked={currentIsMultiSelection} 
                                  onChange={e => { setCurrentIsMultiSelection(e.target.checked); setCurrentSubPointEnd(""); }} 
                                  className="rounded border-amber-500/30 bg-black/40 text-amber-500" 
                                />
                                SELEÇÃO MÚLTIPLA
                              </label>
                            </div>

                            {/* Coluna 2: Seletores de Localização e Botão de Adicionar */}
                            <div className="flex gap-3 items-center animate-in fade-in duration-500">
                               <div className="flex flex-row gap-2">
                                  <div className="w-[140px] relative">
                                    <LocationPicker value={currentSubPoint} onChange={setCurrentSubPoint} placeholder={currentIsMultiSelection ? "INÍCIO..." : "TORRE..."} />
                                  </div>
                                  
                                  {currentIsMultiSelection && (
                                    <div className="w-[140px] animate-in slide-in-from-left-2 duration-300">
                                      <LocationPicker value={currentSubPointEnd} onChange={setCurrentSubPointEnd} placeholder="FIM..." />
                                    </div>
                                  )}
                               </div>

                               {currentSubPoint && (
                                 <Button 
                                   type="button" 
                                   variant="outline" 
                                   size="icon" 
                                   onClick={() => {
                                     const activeSelection = currentDetails.filter(d => !lockedDetails.some(ld => ld.id === d.id));
                                     setLockedDetails([...lockedDetails, ...activeSelection]);
                                     setCurrentSubPoint("");
                                     setCurrentSubPointEnd("");
                                   }}
                                   className="bg-amber-500/20 border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-black h-14 w-14 rounded-2xl shrink-0 transition-all active:scale-90"
                                 >
                                   <Plus className="w-6 h-6" />
                                 </Button>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LISTA DE TORRES PARA REGISTRO INDIVIDUAL */}
                      {currentDetails.length > 0 && currentSubPointType !== 'GERAL' && (
                        <div className="space-y-4 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/40">Status Individual das Torres/Vãos</Label>
                          <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {currentDetails.map((detail, idx) => {
                              const isInvalid = timeConflicts.invalidIds.has(detail.id);
                              const isInternalOverlap = timeConflicts.internalOverlapIds.has(detail.id);
                              const isExternalOverlap = timeConflicts.externalOverlapIds.has(detail.id);
                              const isChronologyError = timeConflicts.chronologyErrorIds.has(detail.id);
                              const hasAnyConflict = isInvalid || isInternalOverlap || isExternalOverlap || isChronologyError;

                              return (
                                <div key={detail.id} className="space-y-2">
                                  <div className={cn(
                                    "flex flex-col md:flex-row items-center gap-4 bg-black/40 border p-4 rounded-3xl transition-all group/tower",
                                    hasAnyConflict ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-amber-500/10 hover:border-amber-500/30"
                                  )}>
                                    <div className="flex items-center gap-3 min-w-[150px]">
                                       <div className={cn(
                                         "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-colors",
                                         hasAnyConflict ? "bg-red-500 text-white" : "bg-amber-500/10 text-amber-500 group-hover/tower:bg-amber-500 group-hover/tower:text-black"
                                       )}>
                                         {idx + 1}
                                       </div>
                                    <span className="font-black text-xs uppercase tracking-tight w-12">{detail.id}</span>
                                    {lockedDetails.some(ld => ld.id === detail.id) && (
                                      <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => setLockedDetails(prev => prev.filter(ld => ld.id !== detail.id))}
                                        className="h-8 w-8 text-red-500/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl -ml-2"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <div className="flex gap-2">
                                      <div className="flex flex-col gap-0.5">
                                        <label className="text-[7px] font-black text-white/30 uppercase pl-1">Início</label>
                                        <TimePicker24h 
                                          value={detail.startTime || ""}
                                          onChange={(val) => {
                                            const newDetails = [...currentDetails];
                                            newDetails[idx].startTime = val;
                                            // Sempre preencher 1 minuto a mais para o fim ao preencher o início
                                            if (!newDetails[idx].endTime || toMinutes(newDetails[idx].endTime) <= toMinutes(val)) {
                                              newDetails[idx].endTime = addOneMinute(val);
                                            }
                                            setCurrentDetails(newDetails);
                                          }}
                                          className="text-amber-500"
                                          isError={timeConflicts.invalidIds.has(detail.id) || timeConflicts.chronologyErrorIds.has(detail.id) || timeConflicts.internalOverlapIds.has(detail.id) || timeConflicts.externalOverlapIds.has(detail.id)}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-0.5">
                                        <label className="text-[7px] font-black text-white/30 uppercase pl-1">Fim</label>
                                          <TimePicker24h 
                                            value={detail.endTime || ""}
                                            onChange={(val) => {
                                              const newDetails = [...currentDetails];
                                              const endTime = val;
                                              newDetails[idx].endTime = endTime;
                                              
                                              // Propagação Sequencial: Se houver um próximo item, preencher o início dele
                                              if (newDetails[idx + 1] && !newDetails[idx + 1].startTime) {
                                                newDetails[idx + 1].startTime = endTime;
                                              }
                                              
                                              setCurrentDetails(newDetails);
                                            }}
                                            isError={timeConflicts.invalidIds.has(detail.id) || timeConflicts.internalOverlapIds.has(detail.id) || timeConflicts.externalOverlapIds.has(detail.id)}
                                          />
                                      </div>
                                    </div>
                                 </div>
                                
                                <div className="min-w-[140px]">
                                  <Select 
                                    value={detail.status} 
                                    onValueChange={(val: any) => {
                                      const newDetails = [...currentDetails];
                                      newDetails[idx].status = val;
                                      if (val === 'FINISHED') newDetails[idx].progress = 100;
                                      else if (val === 'BLOCKED') newDetails[idx].progress = 0;
                                      else if (newDetails[idx].progress === 100) newDetails[idx].progress = 50;
                                      setCurrentDetails(newDetails);
                                    }}
                                  >
                                    <SelectTrigger className={cn(
                                      "h-9 rounded-xl border-none font-black text-[10px] uppercase transition-all shadow-lg",
                                      detail.status === 'FINISHED' ? "bg-green-600 text-white shadow-green-500/20 hover:bg-green-500" :
                                      detail.status === 'BLOCKED' ? "bg-red-600 text-white shadow-red-500/20 hover:bg-red-500" :
                                      "bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400"
                                    )}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="glass-card border-white/10">
                                      <SelectItem value="IN_PROGRESS" className="text-[10px] font-black uppercase">ANDAMENTO</SelectItem>
                                      <SelectItem value="FINISHED" className="text-[10px] font-black uppercase text-green-500">CONCLUÍDO</SelectItem>
                                      <SelectItem value="BLOCKED" className="text-[10px] font-black uppercase text-red-500">SEM ATIVIDADES</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {detail.status === 'BLOCKED' && !detail.comment && (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse">
                                    <Info className="w-3 h-3 text-red-500" />
                                    <span className="text-[8px] font-black text-red-500 uppercase">Atenção: É obrigatório adicionar um comentário justificando a falta de atividade!</span>
                                  </div>
                                )}

                                {detail.status === 'IN_PROGRESS' && (
                                  <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                                     <input 
                                       type="range" 
                                       min="0" 
                                       max="100" 
                                       step="5"
                                       value={detail.progress}
                                       onChange={(e) => {
                                         const newDetails = [...currentDetails];
                                         newDetails[idx].progress = parseInt(e.target.value);
                                         setCurrentDetails(newDetails);
                                       }}
                                       className="w-full accent-amber-500 h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer"
                                     />
                                     <span className="text-[10px] font-black text-amber-500 w-8">{detail.progress}%</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        type="button" 
                                        size="sm" 
                                        variant="outline" 
                                        className={cn("rounded-xl h-8 px-3 gap-2", detail.photos?.length ? "bg-primary/20 border-primary/40 text-primary" : "bg-black/20 border-white/5 opacity-40 hover:opacity-100")}
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase">{detail.photos?.length ? `${detail.photos.length} Fotos` : "Fotos"}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-96 p-4 glass-card border-white/10 shadow-2xl">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black uppercase text-primary">Fotos da Localização - {detail.id}</span>
                                        </div>
                                        <PhotoUploadZone 
                                          photos={detail.photos || []} 
                                          onChange={(photos) => {
                                            const newDetails = [...currentDetails];
                                            newDetails[idx].photos = photos;
                                            setCurrentDetails(newDetails);
                                          }}
                                          compact
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>

                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button 
                                        type="button" 
                                        size="sm" 
                                        variant="outline" 
                                        className={cn("rounded-xl h-8 px-3 gap-2", detail.comment ? "bg-primary/20 border-primary/40 text-primary" : (detail.status === 'BLOCKED' ? "bg-red-500/20 border-red-500 text-red-500 animate-bounce" : "bg-black/20 border-white/5 opacity-40 hover:opacity-100"))}
                                      >
                                        <Info className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase">{detail.comment ? "Comentário OK" : "Comentar"}</span>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-4 glass-card border-white/10 shadow-2xl">
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black uppercase text-primary">Comentário - {detail.id}</span>
                                        </div>
                                        <Textarea 
                                          placeholder={detail.status === 'BLOCKED' ? "Descreva o motivo de não haver atividades nesta torre..." : "Descreva observações específicas para esta torre..."}
                                          className="bg-black/40 border-white/5 rounded-xl text-xs min-h-[100px]"
                                          value={detail.comment || ""}
                                          onChange={(e) => {
                                            const newDetails = [...currentDetails];
                                            newDetails[idx].comment = e.target.value;
                                            setCurrentDetails(newDetails);
                                          }}
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                                     {/* Mensagens de Erro de Tempo */}
                                     {hasAnyConflict && (
                                       <div className="px-6 py-2 bg-red-500/5 rounded-2xl border border-red-500/10 flex flex-wrap gap-4 animate-in slide-in-from-top-2">
                                          {isInvalid && <span className="text-[9px] font-bold text-red-500 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Fim deve ser após Início</span>}
                                          {isInternalOverlap && <span className="text-[9px] font-bold text-red-400 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Sobreposição nesta lista</span>}
                                          {isExternalOverlap && <span className="text-[9px] font-bold text-orange-500 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Conflito com atividade já salva</span>}
                                          {isChronologyError && <span className="text-[9px] font-bold text-red-600 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Horário anterior ao último lançamento</span>}
                                       </div>
                                     )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 relative z-10">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/40">3. Relato Geral (Opcional)</Label>
                        <Textarea 
                          value={currentObservations} 
                          onChange={e => setCurrentObservations(e.target.value)}
                          placeholder="Ex: Escavação da base concluída com martelete, material rochoso encontrado..."
                          className="bg-black/40 border-amber-500/20 focus:ring-amber-500/40 rounded-3xl min-h-[120px] p-6 text-sm placeholder:text-muted-foreground/30 shadow-inner"
                        />
                        
                        <PhotoUploadZone 
                          photos={currentPhotos} 
                          onChange={setCurrentPhotos} 
                          title="Evidências Fotográficas Gerais (Opcional)"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-6 pt-4 relative z-10">
                         <div className="flex gap-2">
                            <Button type="button" onClick={() => setCurrentStatus('IN_PROGRESS')} variant="outline" className={cn("rounded-xl text-[10px] font-black uppercase border-amber-500/30 transition-all", currentStatus === 'IN_PROGRESS' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30 scale-105' : 'bg-black/20')}>ANDAMENTO</Button>
                            <Button type="button" onClick={() => setCurrentStatus('FINISHED')} variant="outline" className={cn("rounded-xl text-[10px] font-black uppercase border-green-500/30 transition-all", currentStatus === 'FINISHED' ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/30 scale-105' : 'bg-black/20')}>CONCLUÍDO</Button>
                         </div>

                         <Button 
                          type="button" 
                          onClick={handleAddItem}
                           disabled={
                             !currentStageId || 
                             (currentSubPointType !== 'GERAL' && !currentSubPoint) || 
                             currentDetails.some(d => d.status === 'BLOCKED' && !d.comment) ||
                             (currentSubPointType !== 'GERAL' && (
                               currentDetails.some(d => !d.startTime || !d.endTime) ||
                               timeConflicts.invalidIds.size > 0 ||
                               timeConflicts.internalOverlapIds.size > 0 ||
                               timeConflicts.externalOverlapIds.size > 0 ||
                               timeConflicts.chronologyErrorIds.size > 0
                             ))
                           }
                          className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest rounded-3xl h-16 shadow-xl shadow-amber-500/10 group active:scale-95 transition-all"
                         >
                           <Plus className="w-6 h-6 mr-3 group-hover:rotate-90 transition-transform" />
                           Adicionar Atividade ao RDO
                         </Button>
                      </div>
                  </div>

                  {/* LISTA DE ATIVIDADES JÁ RELATADAS */}
                  <div className="space-y-6 pt-10">
                    <div className="flex items-center justify-between px-2">
                       <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                         Atividades no Relatório ({selectedActivities.length})
                       </h3>
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Resumo do dia</span>
                    </div>

                    {selectedActivities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/5">
                         <Info className="w-10 h-10 text-white/10 mb-4" />
                         <p className="text-sm font-bold text-white/20 uppercase tracking-widest">Nenhuma atividade adicionada ainda</p>
                      </div>
                    ) : (
                      <div className={cn(
                        "grid gap-4",
                        selectedActivities.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                      )}>
                        {selectedActivities.map((act) => (
                          <div key={act.id} className="group/item glass-card p-6 rounded-4xl border-white/5 hover:border-primary/30 transition-all animate-in zoom-in-95">
                             <div className="flex items-start justify-between mb-4">
                               <div className="flex flex-col gap-1">
                                  <span className="text-xs font-black text-primary uppercase tracking-tighter line-clamp-1">{fixBrokenEncoding(act.stageName || "")}</span>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-muted-foreground uppercase bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                       {act.subPointType}: {act.subPoint} {act.isMultiSelection && `→ ${act.subPointEnd}`}
                                     </span>
                                     <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full", act.status === 'FINISHED' ? 'bg-green-500/20 text-green-500 border border-green-500/20' : 'bg-amber-500/20 text-amber-500 border border-amber-500/20')}>
                                       {act.status === 'FINISHED' ? 'CONCLUÍDO' : 'ANDAMENTO'}
                                     </span>
                                  </div>
                               </div>
                               <Button size="icon" variant="ghost" className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl" onClick={() => handleRemoveItem(act.id)}>
                                 <Plus className="w-5 h-5 rotate-45" />
                               </Button>
                             </div>
                             {act.observations && (
                               <p className="text-xs text-muted-foreground/60 leading-relaxed italic line-clamp-2 px-3 border-l-2 border-primary/20">"{act.observations}"</p>
                             )}

                             <div className="mt-4 flex flex-wrap gap-2">
                               <Popover>
                                 <PopoverTrigger asChild>
                                   <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-[8px] font-black uppercase rounded-lg gap-1.5", act.photos?.length ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40")}>
                                     <Camera className="w-3 h-3" />
                                     {act.photos?.length ? `${act.photos.length} Fotos Gerais` : "Fotos Gerais"}
                                   </Button>
                                 </PopoverTrigger>
                                 <PopoverContent className="w-96 p-4 glass-card border-white/10 shadow-2xl backdrop-blur-xl">
                                    <div className="space-y-3">
                                      <span className="text-[10px] font-black uppercase text-primary">Fotos Gerais da Atividade</span>
                                      <PhotoUploadZone 
                                        photos={act.photos || []} 
                                        onChange={(photos) => {
                                          const draft = dailyReportDraftSignal.value;
                                          const updatedActs = draft.selectedActivities.map(a => {
                                            if (a.id === act.id) return { ...a, photos };
                                            return a;
                                          });
                                          updateReportDraft({ selectedActivities: updatedActs });
                                        }}
                                        compact
                                      />
                                    </div>
                                 </PopoverContent>
                               </Popover>
                             </div>

                             {/* Detalhamento de Itens Individuais (Formato Tabelado) */}
                             {act.details && act.details.length > 0 && (
                               <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                 <div className="flex items-center px-4 py-2 bg-white/5 rounded-t-xl border-x border-t border-white/5">
                                   <span className="w-20 text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Início</span>
                                   <span className="w-20 text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Fim</span>
                                   <span className="w-24 text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Item/Local</span>
                                   <span className="w-24 text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider text-center">Status</span>
                                   <span className="flex-1 text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider pl-4">Comentário</span>
                                   <span className="w-10 text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider text-right">#</span>
                                 </div>
                                 <div className="max-h-[300px] overflow-y-auto space-y-px rounded-b-xl border border-white/5 divide-y divide-white/5">
                                   {act.details.map((d) => (
                                     <div key={d.id} className="space-y-px">
                                       <div className="group/row flex items-center px-4 py-2.5 bg-black/20 hover:bg-black/40 transition-colors">
                                         {/* Hora Início */}
                                         <div className="w-20">
                                           <span className="text-[10px] font-black text-amber-500/80 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 whitespace-nowrap">
                                             {d.startTime || "--:--"}
                                           </span>
                                         </div>

                                         {/* Hora Fim */}
                                         <div className="w-20">
                                           <span className="text-[10px] font-black text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 whitespace-nowrap">
                                             {d.endTime || "--:--"}
                                           </span>
                                         </div>

                                         {/* ID do Item */}
                                         <div className="w-24 flex items-center gap-2">
                                           <span className="text-[11px] font-black text-white/70">{d.id}</span>
                                         </div>
                                         
                                         {/* Status */}
                                         <div className="w-24 flex justify-center">
                                           <div className={cn(
                                             "px-2 py-0.5 rounded-full text-[8px] font-black border whitespace-nowrap",
                                             d.status === 'FINISHED' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                                             d.status === 'BLOCKED' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                                             "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                           )}>
                                             {d.status === 'FINISHED' ? 'CONCLUÍDO' : 
                                              d.status === 'BLOCKED' ? 'SEM ATIVIDADES' : 
                                              `ANDAMENTO - ${d.progress}%`}
                                           </div>
                                         </div>

                                         {/* Texto do Comentário (Truncado) */}
                                         <div className="flex-1 px-4 overflow-hidden">
                                           <p className="text-[10px] text-muted-foreground/70 italic truncate">
                                             {d.comment || '-'}
                                           </p>
                                         </div>

                                         {/* Ação/FullView (Edição Ativada) */}
                                         <div className="w-10 flex justify-end">
                                             <Popover>
                                               <PopoverTrigger asChild>
                                                 <button className={cn(
                                                   "p-1 hover:bg-primary/20 rounded-lg transition-colors",
                                                   d.comment ? "text-amber-500" : "text-white/10 hover:text-white/40"
                                                 )}>
                                                   <Info className="w-3.5 h-3.5 shadow-sm" />
                                                 </button>
                                               </PopoverTrigger>
                                               <PopoverContent className="w-72 p-4 glass-card border-white/10 shadow-2xl backdrop-blur-xl" side="left">
                                                 <div className="space-y-3">
                                                   <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                                     <span className="text-[10px] font-black uppercase text-primary tracking-widest">{d.id}</span>
                                                     <span className="text-[8px] font-black text-muted-foreground px-1.5 py-0.5 bg-white/5 rounded">EDITAR ITEM</span>
                                                   </div>
                                                   
                                                   <div className="grid grid-cols-2 gap-3">
                                                     <div className="space-y-1.5">
                                                       <Label className="text-[8px] font-black uppercase text-white/30">H. Início</Label>
                                                       <TimePicker24h 
                                                         value={d.startTime || ""}
                                                         className="text-amber-500"
                                                         onChange={(val) => {
                                                           const draft = dailyReportDraftSignal.value;
                                                           const updatedActs = draft.selectedActivities.map(a => {
                                                             if (a.id === act.id) {
                                                               return {
                                                                 ...a,
                                                                 details: a.details?.map(item => {
                                                                   if (item.id === d.id) {
                                                                     const newItem = { ...item, startTime: val };
                                                                     // Sempre preencher 1 minuto a mais para o fim ao preencher o início
                                                                     if (!newItem.endTime || toMinutes(newItem.endTime) <= toMinutes(val)) {
                                                                       newItem.endTime = addOneMinute(val);
                                                                     }
                                                                     return newItem;
                                                                   }
                                                                   return item;
                                                                 })
                                                               };
                                                             }
                                                             return a;
                                                           });
                                                           updateReportDraft({ selectedActivities: updatedActs });
                                                         }}
                                                       />
                                                     </div>
                                                     <div className="space-y-1.5">
                                                       <Label className="text-[8px] font-black uppercase text-white/30">H. Fim</Label>
                                                       <TimePicker24h 
                                                         value={d.endTime || ""}
                                                         onChange={(val) => {
                                                           const draft = dailyReportDraftSignal.value;
                                                           const updatedActs = draft.selectedActivities.map(a => {
                                                             if (a.id === act.id) {
                                                               return {
                                                                 ...a,
                                                                 details: a.details?.map(item => {
                                                                   if (item.id === d.id) {
                                                                     return { ...item, endTime: val };
                                                                   }
                                                                   return item;
                                                                 })
                                                               };
                                                             }
                                                             return a;
                                                           });
                                                           updateReportDraft({ selectedActivities: updatedActs });
                                                         }}
                                                       />
                                                     </div>
                                                   </div>

                                                   <div className="space-y-1.5">
                                                     <Label className="text-[8px] font-black uppercase text-white/30">Observação / Comentário</Label>
                                                     <Textarea 
                                                       placeholder="Adicionar observação para este item..."
                                                       className="bg-black/40 border-white/5 rounded-xl text-[11px] min-h-[80px] text-white/90 placeholder:text-white/20 italic"
                                                       value={d.comment || ""}
                                                       onChange={(e) => {
                                                         const draft = dailyReportDraftSignal.value;
                                                         const updatedActs = draft.selectedActivities.map(a => {
                                                           if (a.id === act.id) {
                                                             return {
                                                               ...a,
                                                               details: a.details?.map(item => {
                                                                 if (item.id === d.id) return { ...item, comment: e.target.value };
                                                                 return item;
                                                               })
                                                             };
                                                           }
                                                           return a;
                                                         });
                                                         updateReportDraft({ selectedActivities: updatedActs });
                                                       }}
                                                     />
                                                   </div>

                                                   <div className="pt-2 border-t border-white/5">
                                                     <Label className="text-[8px] font-black uppercase text-white/30 block mb-2">Fotos do Item</Label>
                                                     <PhotoUploadZone 
                                                       photos={d.photos || []} 
                                                       onChange={(photos) => {
                                                         const draft = dailyReportDraftSignal.value;
                                                         const updatedActs = draft.selectedActivities.map(a => {
                                                           if (a.id === act.id) {
                                                             return {
                                                               ...a,
                                                               details: a.details?.map(item => {
                                                                 if (item.id === d.id) return { ...item, photos };
                                                                 return item;
                                                               })
                                                             };
                                                           }
                                                           return a;
                                                         });
                                                         updateReportDraft({ selectedActivities: updatedActs });
                                                       }}
                                                       compact
                                                     />
                                                   </div>
                                                 </div>
                                               </PopoverContent>
                                             </Popover>
                                         </div>
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-10">
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-[2.5rem] py-14 group shadow-[0_25px_60px_rgba(var(--primary),0.4)] border-0 text-2xl font-black transition-all hover:scale-[1.01] active:scale-[0.98]"
                      disabled={isSaving || selectedActivities.length === 0}
                    >
                      {isSaving ? (
                        <Loader2 className="w-10 h-10 mr-4 animate-spin" />
                      ) : (
                        <Send className="w-10 h-10 mr-4 transition-transform group-hover:-translate-y-2 group-hover:translate-x-2" />
                      )}
                      REGISTRAR E ENVIAR RELATÓRIO COMPLETO
                    </Button>
                    <p className="text-[10px] text-center text-muted-foreground/40 mt-8 uppercase font-bold tracking-[0.3em]">
                      Este relatório contém {selectedActivities.length} mini-relatórios granulares
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
