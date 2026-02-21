import * as React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useDailyReports, DailyReportStatus, ActivityStatus } from "@/hooks/useDailyReports";
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
  Camera,
  ImageIcon,
  Trash2,
  X,
  CloudSun,
  Users,
  Truck,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Info,
  Search,
  Plus,
  RefreshCw,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useWorkStages } from "@/hooks/useWorkStages";
import { fetchWorkStages, hasWorkStagesFetchedSignal } from "@/signals/workStageSignals";
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

// Helper para resolver URL de fotos (local ou remota com proxy)
const getPhotoUrl = (photo: DailyReportPhoto) => {
  if (!photo) return "";
  
  // Prioridade 1: URI Local (Blob) para preview imediato
  if (photo.uri) return photo.uri;
  
  // Prioridade 2: URL Remota
  const url = photo.url || "";
  if (url.startsWith("/api/v1/storage")) {
    const fallbackBaseUrl = import.meta.env.VITE_API_URL || "";
    if (url.startsWith("http")) return url;
    // Evitar duplicação de /api/v1 se presente na base e no caminho
    if (fallbackBaseUrl.endsWith("/api/v1") && url.startsWith("/api/v1")) {
      return `${fallbackBaseUrl}${url.replace("/api/v1", "")}`;
    }
    return `${fallbackBaseUrl}${url}`;
  }
  
  return url;
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
  const { toast } = useToast();
  const [uploading, setUploading] = React.useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    let newUploadedPhotos = [...photos];

    try {
      for (const file of files) {
        // Criamos uma URL temporária apenas para preview no navegador
        const objectUrl = URL.createObjectURL(file);
        
        newUploadedPhotos.push({
          file: file, // mantemos o arquivo original instanciado
          uri: objectUrl,
          comment: ""
        });
      }
      
      onChange(newUploadedPhotos);
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao processar imagens localmente.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          {title} ({photos.length}) {uploading && <Loader2 className="w-3 h-3 animate-spin text-primary ml-2" />}
        </Label>
      )}
      
      <div className="flex flex-wrap gap-3">
        {/* Thumbnails */}
        {photos.map((photo, idx) => (
          <Dialog key={idx}>
            <DialogTrigger asChild>
              <div className={cn(
                "group relative bg-black/40 border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-primary/40 flex flex-col cursor-pointer",
                compact ? "w-24 h-[106px]" : "w-32 h-[114px]"
              )}>
                <img src={getPhotoUrl(photo)} alt={`Foto ${idx + 1}`} className="w-full flex-1 object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(idx);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                <div className="p-1 px-1.5 pb-2 bg-black/60 shrink-0">
                  <span className="text-[8px] font-bold text-white/50 truncate block">
                    {photo.comment || "Sem comentário..."}
                  </span>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#0c0c0e] border-white/10 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl">
               <DialogHeader>
                  <DialogTitle className="text-xl font-black uppercase text-primary tracking-widest flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Comentário da Evidência
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-bold">
                    Adicione uma nota técnica sobre o que esta foto comprova no campo.
                  </DialogDescription>
               </DialogHeader>
               
               <div className="space-y-6 pt-6">
                  <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black/40">
                    <img src={getPhotoUrl(photo)} className="w-full h-full object-contain" />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 text-primary" />
                      Descrição / Nota Técnica
                    </Label>
                    <Textarea 
                      placeholder="Descreva os detalhes observados nesta foto..."
                      className="bg-black/60 border-white/5 rounded-2xl text-sm min-h-[140px] text-white/90 placeholder:text-white/20 italic p-4 focus:ring-primary/20"
                      value={photo.comment || ""}
                      onChange={(e) => updateComment(idx, e.target.value)}
                    />
                  </div>
               </div>
            </DialogContent>
          </Dialog>
        ))}

        {/* Upload Button */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex flex-col items-center justify-center border-2 border-dashed border-white/5 hover:border-primary/20 bg-white/5 hover:bg-primary/5 rounded-2xl transition-all gap-2 group",
            compact ? "w-24 h-[106px]" : "w-32 h-[114px]",
            uploading && "opacity-50 pointer-events-none"
          )}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Plus className="w-5 h-5 text-white/20 group-hover:text-primary transition-colors" />
          )}
          <span className="text-[8px] font-black uppercase text-white/20 group-hover:text-primary">
             {uploading ? 'Enviando...' : 'Adicionar'}
          </span>
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
  const [hasAttemptedAutoLoad, setHasAttemptedAutoLoad] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

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
  const { createReport, getTodayReports, refresh } = useDailyReports();

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
    step,
    weather,
    manpower,
    equipment,
    projectId,
    rdoNumber,
    revision,
    projectDeadline,
    generalObservations,
    generalPhotos
  } = draft;

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);
  const [showManpower, setShowManpower] = React.useState(true);
  const [showEquipment, setShowEquipment] = React.useState(true);

    // Carregamento automático de programação
    React.useEffect(() => {
      if (!employeeId || selectedActivities.length > 0 || hasAttemptedAutoLoad) return;

      const allToday = getTodayReports();
      console.log("[DailyReport] Scheduling Auto-Load. Employee:", employeeId);
      setHasAttemptedAutoLoad(true);

      // 1. Identificar atividades que já foram relatadas HOJE (Relatórios reais, não programações nem devolvidos)
      const alreadyReported = allToday.filter(r => 
        r.status !== DailyReportStatus.PROGRAMMED && r.status !== DailyReportStatus.RETURNED
      );

      const normalizeSubPoint = (sp: any) => String(sp || "").replace(/^TORRE:\s*/i, "").trim();

      const doneKeys = new Set<string>();
      alreadyReported.forEach(r => {
        const acts = r.selectedActivities || (r.metadata as any)?.selectedActivities || [];
        acts.forEach((act: any) => {
          const sp = normalizeSubPoint(act.subPoint);
          doneKeys.add(`${act.stageId}-${sp}-${act.subPointType}`);
        });
      });

      // 2. Buscar RDOs que são programações OU que foram DEVOLVIDOS (para correção)
      const scheduledReports = allToday.filter(r => {
        const matchesEmp = r.employeeId === employeeId || (r.metadata as any)?.employeeId === employeeId;
        const isProgOrReturned = r.status === DailyReportStatus.PROGRAMMED || r.status === DailyReportStatus.RETURNED; 
        return matchesEmp && isProgOrReturned;
      });

      console.log("[DailyReport] Found Programs/Returned:", scheduledReports.length, "Already Reported Keys:", doneKeys.size);

      if (scheduledReports.length > 0) {
        const pendingActivities: any[] = [];
        let firstValidReport = scheduledReports[0];

        scheduledReports.forEach(r => {
          const acts = r.metadata?.selectedActivities || [];
          acts.forEach((act: any) => {
            const sp = normalizeSubPoint(act.subPoint);
            const key = `${act.stageId}-${sp}-${act.subPointType}`;
            // Só adiciona se não estiver no Set de já relatados
            if (!doneKeys.has(key)) {
              pendingActivities.push(act);
            }
          });
        });

        if (pendingActivities.length > 0) {
          // Deduplicação final por segurança (caso haja mais de uma programação para a mesma coisa)
          const uniqueActivities = pendingActivities.filter((act, index, self) =>
            index === self.findIndex((t) => (
              t.stageId === act.stageId && normalizeSubPoint(t.subPoint) === normalizeSubPoint(act.subPoint) && t.subPointType === act.subPointType
            ))
          );

          toast({
            title: "Programações Localizadas",
            description: `${uniqueActivities.length} atividades agendadas foram carregadas automaticamente.`,
            className: "bg-amber-500/10 border-amber-500/20 text-amber-500"
          });

          console.log("[DailyReport] Loading activities from programs:", uniqueActivities.length);

          updateReportDraft({
            selectedActivities: uniqueActivities,
            companyId: firstValidReport.companyId || undefined,
            siteId: (firstValidReport.metadata as any)?.siteId || undefined,
            projectId: (firstValidReport.metadata as any)?.projectId || undefined,
          });

          if (firstValidReport.companyId) setSelectedCompanyId(firstValidReport.companyId);
          const pId = (firstValidReport.metadata as any)?.projectId;
          if (pId) setSelectedProjectId(pId);
        }
      }
    }, [employeeId, getTodayReports, selectedActivities.length, toast]);

  // Estados locais para o "Mini-Relatório" de adição de atividade
  const employeesFilter = React.useMemo(
    () => ({ 
      companyId: selectedCompanyId,
      excludeCorporate: false,
      roles: ["WORKER", "SUPERVISOR", "MANAGER", "ADMIN", "SUPER_ADMIN", "GESTOR_PROJECT", "GESTOR_CANTEIRO", "TECHNICIAN"]
    }),
    [selectedCompanyId],
  );
  const { employees } = useEmployees(employeesFilter);

  // Componente de Seleção de Funcionário com Busca
  const EmployeePicker = ({ value, onChange, placeholder }: any) => {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

    const filteredEmployees = React.useMemo(() => {
      if (!searchTerm) return employees.slice(0, 10);
      const search = searchTerm.toLowerCase();
      return employees.filter(e => 
        e.fullName.toLowerCase().includes(search) || 
        (e.registrationNumber || "").toLowerCase().includes(search) ||
        (e.email || "").toLowerCase().includes(search)
      ).slice(0, 50);
    }, [employees, searchTerm]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-black/20 border-primary/20 hover:bg-black/40 hover:border-primary/40 text-foreground h-11 rounded-xl font-normal transition-all"
            disabled={!selectedCompanyId}
          >
            <span className="truncate">
              {value ? employees.find((e) => e.id === value)?.fullName : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 glass-card border-primary/20" align="start">
          <Command shouldFilter={false} className="bg-transparent text-foreground">
            <CommandInput 
              placeholder="Buscar por nome, email ou matrícula..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
              className="h-11 border-none focus:ring-0 text-foreground text-xs" 
            />
            <CommandList>
              <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">Nenhum colaborador encontrado.</CommandEmpty>
              <CommandGroup heading={searchTerm ? "Resultados da Busca" : "Sugestões Recentes"}>
                {filteredEmployees.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={e.id}
                    onSelect={() => {
                      onChange(e.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                    className="hover:bg-primary/20 cursor-pointer text-foreground data-[selected=true]:bg-primary/20 p-2"
                  >
                    <Check className={cn("mr-2 h-4 w-4 text-primary shrink-0", value === e.id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-bold text-sm truncate">{e.fullName}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{e.registrationNumber || e.email}</span>
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
    if (currentStageIds.length === 0) {
      toast({ title: "Atividade não selecionada", description: "Escolha pelo menos uma atividade na lista antes de adicionar.", variant: "destructive" });
      return;
    }

    if (currentSubPointType !== 'GERAL' && !currentSubPoint && currentDetails.length === 0) {
      toast({ title: "Localização ausente", description: "Informe a torre ou vão da atividade.", variant: "destructive" });
      return;
    }

    if (currentIsMultiSelection && !currentSubPointEnd) {
      toast({ title: "Intervalo incompleto", description: "Informe o ponto final da atividade.", variant: "destructive" });
      return;
    }

    const selectedStages = workStages.filter(s => currentStageIds.includes(s.id));
    const stageNames = selectedStages.map(s => fixBrokenEncoding(s.name));
    const stageName = stageNames.length > 1 ? `(${stageNames.join(" | ")})` : (stageNames[0] || "Atividade");
    const primaryStageId = currentStageIds[0];

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

    const effectiveSubPoint = currentSubPoint || (currentDetails.length > 0 ? currentDetails.map(d => d.id).join(", ") : "");
    const effectiveSubPointEnd = currentSubPointEnd || "";
    const effectiveIsMultiSelection = currentIsMultiSelection || currentDetails.length > 1;

    const existingActivityIndex = selectedActivities.findIndex(a => a.stageName === stageName);

    if (existingActivityIndex !== -1) {
      // Mesclar com atividade existente
      const updatedActivities = [...selectedActivities];
      const existing = updatedActivities[existingActivityIndex];
      
      updatedActivities[existingActivityIndex] = {
        ...existing,
        details: [...existing.details, ...currentDetails],
        // observations e photos agora são globais, removidos do item individual se possível ou mantidos se necessário pelo types
        observations: "", 
        photos: [],
        // Atualiza subPoint para refletir múltiplos se for diferente
        subPoint: (existing.subPoint === effectiveSubPoint || !effectiveSubPoint) ? existing.subPoint : `${existing.subPoint}, ${effectiveSubPoint}`,
        isMultiSelection: existing.isMultiSelection || effectiveIsMultiSelection
      };

      updateReportDraft({
        selectedActivities: updatedActivities
      });
    } else {
      const newItem: DailyReportActivity = {
        id: crypto.randomUUID(),
        stageId: primaryStageId,
        stageName,
        subPointType: currentSubPointType,
        subPoint: effectiveSubPoint,
        subPointEnd: effectiveSubPointEnd,
        isMultiSelection: effectiveIsMultiSelection,
        observations: "",
        status: currentStatus,
        details: currentDetails,
        photos: []
      };

      updateReportDraft({
        selectedActivities: [...selectedActivities, newItem]
      });
    }


    // Reset local form
    setCurrentStageIds([]);
    setCurrentDetails([]);
    setLockedDetails([]);
    setCurrentSubPoint("");
    setCurrentSubPointEnd("");
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
    
    const groupsMap = new Map<string, any[]>();
    
    // Mapeamento explícito fornecido pelo usuário para garantir precisão
    const activityToCategory: Record<string, string> = {
      // SERVIÇOS PRELIMINARES
      "CROQUI DE ACESSO": "SERVIÇOS PRELIMINARES",
      "SONDAGEM": "SERVIÇOS PRELIMINARES",
      "CONFERÊNCIA DE PERFIL": "SERVIÇOS PRELIMINARES",
      "SUPRESSÃO VEGETAL (ÁREA)": "SERVIÇOS PRELIMINARES",
      "ABERTURA DE ACESSOS": "SERVIÇOS PRELIMINARES",
      // FUNDAÇÃO
      "ESCAVAÇÃO": "FUNDAÇÃO",
      "ARMAÇÃO": "FUNDAÇÃO",
      "CONCRETAGEM": "FUNDAÇÃO",
      "REATERRO": "FUNDAÇÃO",
      // MONTAGEM
      "PRÉ-MONTAGEM": "MONTAGEM",
      "IÇAMENTO": "MONTAGEM",
      "REVISÃO": "MONTAGEM",
      "TORQUEAMENTO": "MONTAGEM",
      // CABOS
      "LANÇAMENTO CABO GUIA": "CABOS",
      "LANÇAMENTO CONDUTOR": "CABOS",
      "GRAMPEAÇÃO": "CABOS",
      "REGULAÇÃO": "CABOS"
    };

    uniqueStages.forEach(s => {
      let categoryName = "";
      const nameUpper = s.name.toUpperCase().trim();
      
      // 1. Prioridade: Mapeamento Explícito
      if (activityToCategory[nameUpper]) {
        categoryName = activityToCategory[nameUpper];
      }
      
      // 2. Tentar encontrar o nome do pai
      if (!categoryName && s.parentId) {
        const parent = workStages.find(p => p.id === s.parentId);
        if (parent) {
          categoryName = fixBrokenEncoding(parent.name).toUpperCase();
        }
      }
      
      // 3. Critérios de busca por palavras-chave
      if (!categoryName) {
        const descUpper = (s.description || "").toUpperCase();
        const keywords = ["FUNDAÇÃO", "MONTAGEM", "CABOS", "PRELIMINARES", "ESTRUTURA"];
        
        const foundInDesc = keywords.find(k => descUpper.includes(k));
        if (foundInDesc) {
           categoryName = foundInDesc === "PRELIMINARES" ? "SERVIÇOS PRELIMINARES" : foundInDesc;
        } else {
           const foundInName = keywords.find(k => nameUpper.includes(k));
           if (foundInName) categoryName = foundInName === "PRELIMINARES" ? "SERVIÇOS PRELIMINARES" : foundInName;
        }
      }

      // 4. Fallback Final
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

  const [previewData, setPreviewData] = React.useState<{
    expandedTowers: string[];
    finalLabel: string;
    metrics: { towers: number; km: string };
    details?: Array<{ id: string; progress: number; status: ActivityStatus }>;
  }>({ expandedTowers: [], finalLabel: "", metrics: { towers: 0, km: "0.00" } });
  const [isPreviewing, setIsPreviewing] = React.useState(false);

  // Estados locais para o "Mini-Relatório" de adição de atividade (Movido para cá para evitar erro de referência com previewData)
  const [currentStageIds, setCurrentStageIds] = React.useState<string[]>([]);
  const [currentSubPointType, setCurrentSubPointType] = React.useState<'GERAL' | 'TORRE' | 'VAO' | 'TRECHO' | 'ESTRUTURA'>('TORRE');
  const [currentSubPoint, setCurrentSubPoint] = React.useState<string>("");
  const [currentSubPointEnd, setCurrentSubPointEnd] = React.useState<string>("");
  const [currentIsMultiSelection, setCurrentIsMultiSelection] = React.useState<boolean>(false);
  const [currentObservations, setCurrentObservations] = React.useState<string>("");
  const [currentStatus, setCurrentStatus] = React.useState<ActivityStatus>(ActivityStatus.FINISHED);
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

    // Se temos um preview com detalhes enriquecidos do backend
    if (previewData.details && previewData.details.length > 0) {
      const lastAct = selectedActivities[selectedActivities.length - 1];
      const lastItemInLastAct = lastAct?.details?.[lastAct.details.length - 1];
      const lastReportEndTime = lastItemInLastAct?.endTime || "";

      activeDetails = previewData.details.map((d, idx) => ({
        id: d.id,
        status: d.status as ActivityStatus,
        progress: d.progress,
        comment: "",
        startTime: idx === 0 ? lastReportEndTime : "" ,
        endTime: ""
      }));
    } else if (previewData.expandedTowers && previewData.expandedTowers.length > 0) {
        // Fallback básico caso o backend não retorne details mas retorne expandedTowers
        activeDetails = previewData.expandedTowers.map((id, idx) => {
          const lastAct = selectedActivities[selectedActivities.length - 1];
          const lastItemInLastAct = lastAct?.details?.[lastAct.details.length - 1];
          const lastReportEndTime = lastItemInLastAct?.endTime || "";

          return {
            id,
            status: currentStatus as ActivityStatus,
            progress: 0,
            comment: "",
            startTime: idx === 0 ? lastReportEndTime : "" ,
            endTime: ""
          };
        });
    } else if (currentSubPoint && currentSubPointType !== 'GERAL') {
      // Ponto único (fallback se o preview ainda não carregou ou falhou)
      const lastAct = selectedActivities[selectedActivities.length - 1];
      const lastItemInLastAct = lastAct?.details?.[lastAct.details.length - 1];
      const lastReportEndTime = lastItemInLastAct?.endTime || "";

      activeDetails = [{
        id: currentSubPoint,
        status: currentStatus as ActivityStatus,
        progress: 0,
        comment: "",
        startTime: lastReportEndTime,
        endTime: ""
      }];
    }

    // Remover duplicatas entre activeDetails e lockedDetails (priorizar locked)
    const filteredActive = activeDetails.filter(ad => !lockedDetails.some(ld => ld.id === ad.id));
    setCurrentDetails([...lockedDetails, ...filteredActive]);

  }, [previewData, currentSubPoint, currentSubPointType, currentStatus, selectedActivities, lockedDetails]);

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
        stageId: currentStageIds[0] // Passar o primeiro stageId para buscar progresso
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
    currentStageIds,
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
          .eq("companyId", selectedCompanyId)
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
      // 1. Função Helper para Uploads Deferidos (GCS)
      const uploadPhotos = async (photosToUpload: DailyReportPhoto[], torreName: string, atividadeName: string) => {
        const updatedPhotos: DailyReportPhoto[] = [];
        
        // Dados dinâmicos puxados da seleção do RDO
        const companyName = companies?.find(c => c.id === selectedCompanyId)?.name || "EMPRESA_PADRAO";
        const projectName = projects.find(p => p.id === selectedProjectId)?.name || "PROJETO_ATUAL";
        const siteName = sites.find(s => s.id === effectiveSiteId)?.name || "SITE_ATUAL";
        const respName = profile?.fullName || "USUARIO";

        const now = new Date();
        const utc3Date = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const day = String(utc3Date.getUTCDate()).padStart(2, '0');
        const month = String(utc3Date.getUTCMonth() + 1).padStart(2, '0');
        const year = String(utc3Date.getUTCFullYear());
        const formattedDate = `${day}${month}${year}`;

        for (const photo of photosToUpload) {
          if (photo.file) {
            try {
              const formData = new FormData();
              formData.append("file", photo.file);
              formData.append("empresa", companyName);
              formData.append("obra", projectName);
              formData.append("canteiro", siteName);
              formData.append("torre", torreName);
              formData.append("atividade", atividadeName);
              formData.append("dataPostagem", formattedDate);
              formData.append("responsavel", respName);

              const response = await fetch("/api/upload", { method: "POST", body: formData });
              const data = await response.json();

              if (data.success) {
                 updatedPhotos.push({ url: data.url, comment: photo.comment });
              } else {
                 console.error("GCS Upload failed for file:", photo.file.name, data.message);
              }
            } catch (e) {
              console.error("Network error during GCS upload:", e);
            }
          } else if (photo.url) {
            // Já foi feito upload antes ou é legada (base64)
            updatedPhotos.push(photo);
          }
        }
        return updatedPhotos;
      };

      toast({
        title: "Processando...",
        description: "Enviando imagens para a nuvem. Aguarde...",
      });

      // 2. Upload de fotos gerais
      const processedGeneralPhotos = await uploadPhotos(generalPhotos || [], "", "");

      // 3. Upload de fotos de atividades e detalhes
      const processedActivities = await Promise.all(selectedActivities.map(async (act) => {
        // Para fotos atreladas à atividade macro, usamos o subPoint (nome da torre/vão)
        const torreNameMacro = act.subPoint || "";
        const actPhotos = await uploadPhotos(act.photos || [], torreNameMacro, act.stageName || "");
        
        const details = await Promise.all((act.details || []).map(async (d) => {
          // Para fotos atreladas a um detalhe específico (ex: uma torre dentro de um trecho)
          // Se o id do detalhe for um UUID genérico, usamos o da macro. Senão, assumimos que é o nome.
          const isGenericId = d.id && d.id.length > 20; 
          const torreNameDetail = isGenericId ? torreNameMacro : (d.id || torreNameMacro);

          const detailPhotos = await uploadPhotos(d.photos || [], torreNameDetail, act.stageName || "");
          return { ...d, photos: detailPhotos };
        }));

        return { ...act, photos: actPhotos, details };
      }));

      const reportPayload = {
        teamIds: teamIds,
        employeeId: effectiveEmployeeId,
        companyId: selectedCompanyId, 
        activities: selectedActivities.map(a => `${a.stageName} (${a.subPoint})`).join(", "),
        selectedActivities: processedActivities, 
        status: DailyReportStatus.SENT,
        weather: weather,
        manpower: manpower,
        equipment: equipment,
        generalObservations: generalObservations,
        generalPhotos: processedGeneralPhotos, 
        rdoNumber: rdoNumber,
        revision: revision,
        projectDeadline: projectDeadline,
        metadata: {
          selectedActivities: processedActivities,
          weather,
          manpower,
          equipment,
          generalObservations,
          generalPhotos: processedGeneralPhotos,
          isCorrection: draft.isCorrection,
          originalReportId: draft.editingReportId
        },
      };

      // 4. Salvar RDO no Backend (Create ou Update se for correção)
      let result;
      if (draft.isCorrection && draft.editingReportId) {
        result = await (updateReport as any)(draft.editingReportId, reportPayload);
      } else {
        result = await createReport(reportPayload);
      }

      if (result.success) {
        resetReportDraft();
        toast({
          title: "Relatório enviado!",
          description: `O rdo com ${selectedActivities.length} atividades foi salvo com sucesso.`,
        });
      } else {
         toast({
          title: "Erro ao salvar RDO",
          description: "Não foi possível sincronizar com o servidor.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Submit Error:", err);
      toast({
        title: "Ocorreu um Erro",
        description: "Falha catastrófica ao finalizar o relatório.",
        variant: "destructive",
      });
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
    <>
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
                    {draft.isCorrection && (
                      <div className="mb-6 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          <h4 className="text-sm font-black uppercase text-red-500 tracking-widest">Relatório Devolvido para Correção</h4>
                        </div>
                        <p className="text-sm text-white/80 font-medium italic">
                          "{(reports.find(r => r.id === draft.editingReportId) as any)?.rejectionReason || "Sem motivo específico informado."}"
                        </p>
                      </div>
                    )}
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
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[10px] uppercase font-black tracking-widest text-primary/40 hover:text-primary transition-all flex items-center gap-2"
                        onClick={async () => {
                          setIsRefreshing(true);
                          try {
                            await refresh({ hard: true });
                            setHasAttemptedAutoLoad(false); // Permite tentar auto-load de novo após limpar cache
                            toast({
                              title: "Cache Limpo",
                              description: "As programações foram atualizadas com o servidor.",
                            });
                          } finally {
                            setIsRefreshing(false);
                          }
                        }}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                        Limpar Cache e Sincronizar
                      </Button>
                    </div>

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
                            <EmployeePicker 
                              value={employeeId} 
                              onChange={(val: string) => updateReportDraft({ employeeId: val })} 
                              placeholder="Buscar responsável..." 
                            />
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

                    {/* EQUIPAMENTOS */}
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
                                    {currentStageIds.length > 0 
                                      ? (currentStageIds.length === 1 
                                          ? fixBrokenEncoding(workStages.find(s => s.id === currentStageIds[0])?.name || "")
                                          : `${currentStageIds.length} Atividades selecionadas`)
                                      : "Escolha as atividades..."}
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
                                              if (currentStageIds.includes(stage.id)) {
                                                setCurrentStageIds(currentStageIds.filter(id => id !== stage.id));
                                              } else {
                                                setCurrentStageIds([...currentStageIds, stage.id]);
                                              }
                                            }} 
                                            className="cursor-pointer aria-selected:bg-amber-500/20 rounded-xl m-1 px-4 py-3"
                                          >
                                            <div className="flex items-center justify-between w-full">
                                              <div className="flex flex-col">
                                                <span className="font-bold text-sm">{stage.name}</span>
                                                {stage.description && <span className="text-[10px] text-muted-foreground">{stage.description}</span>}
                                              </div>
                                              {currentStageIds.includes(stage.id) && (
                                                <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                                  <Check className="w-3 h-3 text-black" />
                                                </div>
                                              )}
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
                            
                            <div className="flex flex-wrap items-center gap-4 lg:gap-6 relative z-10">
                              {/* Seletor de Tipo */}
                              <div className="min-w-[140px]">
                                <Select value={currentSubPointType} onValueChange={(val: any) => setCurrentSubPointType(val)}>
                                  <SelectTrigger className="bg-black/40 border-amber-500/20 rounded-2xl h-14 font-bold text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent className="glass-card">
                                    <SelectItem value="GERAL">Geral</SelectItem>
                                    <SelectItem value="TORRE">Torre</SelectItem>
                                    <SelectItem value="VAO">Vão</SelectItem>
                                    <SelectItem value="TRECHO">Trecho</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Checkbox de Seleção Múltipla */}
                              <label className="flex items-center gap-2 text-[10px] font-bold text-amber-500/60 cursor-pointer whitespace-nowrap px-2">
                                <input 
                                  type="checkbox" 
                                  checked={currentIsMultiSelection} 
                                  onChange={e => { setCurrentIsMultiSelection(e.target.checked); setCurrentSubPointEnd(""); }} 
                                  className="rounded border-amber-500/30 bg-black/40 text-amber-500" 
                                />
                                SELEÇÃO MÚLTIPLA
                              </label>

                              {/* Seletores de Localização e Botão de Adicionar */}
                              <div className="flex gap-3 items-center animate-in fade-in duration-500 flex-1 min-w-[300px]">
                                 <div className="flex flex-row gap-2 flex-1">
                                    <div className="flex-1 relative">
                                      <LocationPicker value={currentSubPoint} onChange={setCurrentSubPoint} placeholder={currentIsMultiSelection ? "INÍCIO..." : "TORRE..."} />
                                    </div>
                                    
                                    {currentIsMultiSelection && (
                                      <div className="flex-1 animate-in slide-in-from-left-2 duration-300">
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
                        {currentDetails.length > 0 && (
                          <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between px-2">
                               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/40">2. Detalhamento por Localização ({currentDetails.length})</Label>
                               {currentDetails.length > 20 && (
                                 <span className="text-[8px] font-black text-amber-500/60 uppercase">Dica: Use a propagação sequencial para ganhar tempo</span>
                               )}
                            </div>
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                              {currentDetails.slice(0, 50).map((detail, idx) => {
                                const isInvalid = timeConflicts.invalidIds.has(detail.id);
                                const isInternalOverlap = timeConflicts.internalOverlapIds.has(detail.id);
                                const isExternalOverlap = timeConflicts.externalOverlapIds.has(detail.id);
                                const isChronologyError = timeConflicts.chronologyErrorIds.has(detail.id);
                                const hasAnyConflict = isInvalid || isInternalOverlap || isExternalOverlap || isChronologyError;

                                return (
                                  <div key={`${detail.id}-${idx}`} className="space-y-2">
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
                                      onValueChange={(val: ActivityStatus) => {
                                        const newDetails = [...currentDetails];
                                        newDetails[idx].status = val;
                                        if (val === ActivityStatus.FINISHED) newDetails[idx].progress = 100;
                                        else if (val === ActivityStatus.BLOCKED) newDetails[idx].progress = 0;
                                        else if (newDetails[idx].progress === 100) newDetails[idx].progress = 50;
                                        setCurrentDetails(newDetails);
                                      }}
                                    >
                                      <SelectTrigger className={cn(
                                        "h-9 rounded-xl border-none font-black text-[10px] uppercase transition-all shadow-lg",
                                        detail.status === ActivityStatus.FINISHED ? "bg-green-600 text-white shadow-green-500/20 hover:bg-green-500" :
                                        detail.status === ActivityStatus.BLOCKED ? "bg-red-600 text-white shadow-red-500/20 hover:bg-red-500" :
                                        "bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400"
                                      )}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="glass-card border-white/10">
                                        <SelectItem value={ActivityStatus.IN_PROGRESS} className="text-[10px] font-black uppercase">ANDAMENTO</SelectItem>
                                        <SelectItem value={ActivityStatus.FINISHED} className="text-[10px] font-black uppercase text-green-500">CONCLUÍDO</SelectItem>
                                        <SelectItem value={ActivityStatus.BLOCKED} className="text-[10px] font-black uppercase text-red-500">SEM ATIVIDADES</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {detail.status === ActivityStatus.BLOCKED && !detail.comment && (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg animate-pulse">
                                      <Info className="w-3 h-3 text-red-500" />
                                      <span className="text-[8px] font-black text-red-500 uppercase">Atenção: É obrigatório adicionar um comentário justificando a falta de atividade!</span>
                                    </div>
                                  )}

                                  {detail.status === ActivityStatus.IN_PROGRESS && (
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
                                          className={cn("rounded-xl h-8 px-3 gap-2", detail.comment ? "bg-primary/20 border-primary/40 text-primary" : (detail.status === ActivityStatus.BLOCKED ? "bg-red-500/20 border-red-500 text-red-500 animate-bounce" : "bg-black/20 border-white/5 opacity-40 hover:opacity-100"))}
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
                                            placeholder={detail.status === ActivityStatus.BLOCKED ? "Descreva o motivo de não haver atividades nesta torre..." : "Descreva observações específicas para esta torre..."}
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
                               
                               {currentDetails.length > 50 && (
                                 <div className="p-6 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-3xl text-center">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-relaxed">
                                      Exibindo as primeiras 50 localizações de {currentDetails.length}.<br/>
                                      Para melhor performance, edite os itens em blocos menores ou use a propagação automática.
                                    </p>
                                    <Button 
                                      variant="ghost" 
                                      className="mt-3 text-[10px] font-bold text-amber-500 hover:bg-amber-500/10"
                                      onClick={() => toast({ title: "Performance", description: "A exibição está limitada para evitar lentidão. Os dados de todas as torres serão salvos normalmente." })}
                                    >
                                      POR QUE NÃO VEJO TUDO?
                                    </Button>
                                 </div>
                               )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-6 pt-4 relative z-10">

                           <Button 
                            type="button" 
                            onClick={handleAddItem}
                             disabled={
                               currentStageIds.length === 0 || 
                               (currentSubPointType !== 'GERAL' && currentDetails.length === 0) || 
                               currentDetails.some(d => d.status === ActivityStatus.BLOCKED && !d.comment) ||
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
                                     {act.details.map((d, dIdx) => (
                                       <div key={`${d.id}-${dIdx}`} className="space-y-px">
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
                                               d.status === ActivityStatus.BLOCKED ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                                               "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                             )}>
                                               {d.status === 'FINISHED' ? 'CONCLUÍDO' : 
                                                d.status === ActivityStatus.BLOCKED ? 'SEM ATIVIDADES' : 
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
                                                <Dialog>
                                                  <DialogTrigger asChild>
                                                    <button className={cn(
                                                      "p-1 hover:bg-primary/20 rounded-lg transition-colors",
                                                      d.comment ? "text-amber-500" : "text-white/10 hover:text-white/40"
                                                    )}>
                                                      <Info className="w-3.5 h-3.5 shadow-sm" />
                                                    </button>
                                                  </DialogTrigger>
                                                  <DialogContent className="sm:max-w-xl p-8 glass-card border-white/10 shadow-2xl backdrop-blur-xl">
                                                    <DialogHeader className="pb-4 border-b border-white/5">
                                                      <div className="flex items-center justify-between">
                                                        <DialogTitle className="text-xl font-black uppercase text-primary tracking-widest">{d.id}</DialogTitle>
                                                        <DialogDescription className="sr-only">
                                                          Edite os detalhes da atividade para o item {d.id}
                                                        </DialogDescription>
                                                        <span className="text-xs font-black text-muted-foreground px-3 py-1 bg-white/5 rounded-full">EDITAR ITEM</span>
                                                      </div>
                                                    </DialogHeader>
                                                    
                                                    <div className="space-y-6 pt-6">
                                                      <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-2.5">
                                                          <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                                                            <Clock className="w-3 h-3 text-amber-500" />
                                                            H. Início
                                                          </Label>
                                                          <input
                                                            type="time" 
                                                            value={d.startTime || ""}
                                                            className="w-full bg-black/40 border-white/5 rounded-2xl text-sm text-amber-500 font-bold p-3 focus:ring-primary/20 color-scheme-dark"
                                                            onChange={(e) => {
                                                              const val = e.target.value;
                                                              const draft = dailyReportDraftSignal.value;
                                                              const updatedActs = draft.selectedActivities.map(a => {
                                                                if (a.id === act.id) {
                                                                  return {
                                                                    ...a,
                                                                    details: a.details?.map((item, itemIdx) => {
                                                                      if (itemIdx === dIdx) {
                                                                        const newItem = { ...item, startTime: val };
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
                                                        <div className="space-y-2.5">
                                                          <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                                                            <Clock className="w-3 h-3 text-primary" />
                                                            H. Fim
                                                          </Label>
                                                          <input
                                                            type="time" 
                                                            value={d.endTime || ""}
                                                            className="w-full bg-black/40 border-white/5 rounded-2xl text-sm text-primary font-bold p-3 focus:ring-primary/20 color-scheme-dark"
                                                            onChange={(e) => {
                                                              const val = e.target.value;
                                                              const draft = dailyReportDraftSignal.value;
                                                              const updatedActs = draft.selectedActivities.map(a => {
                                                                if (a.id === act.id) {
                                                                  return {
                                                                    ...a,
                                                                    details: a.details?.map((item, itemIdx) => {
                                                                      if (itemIdx === dIdx) {
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

                                                      <div className="grid grid-cols-2 gap-6 pt-2">
                                                        <div className="space-y-2.5">
                                                          <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                                                            <Info className="w-3 h-3 text-white/60" />
                                                            Status Atividade
                                                          </Label>
                                                          <Select
                                                            value={d.status || ActivityStatus.IN_PROGRESS}
                                                            onValueChange={(val: ActivityStatus) => {
                                                              const draft = dailyReportDraftSignal.value;
                                                              const updatedActs = draft.selectedActivities.map(a => {
                                                                if (a.id === act.id) {
                                                                  return {
                                                                    ...a,
                                                                    details: a.details?.map((item, itemIdx) => {
                                                                      if (itemIdx === dIdx) {
                                                                        return { ...item, status: val, progress: val === ActivityStatus.FINISHED ? 100 : item.progress };
                                                                      }
                                                                      return item;
                                                                    })
                                                                  };
                                                                }
                                                                return a;
                                                              });
                                                              updateReportDraft({ selectedActivities: updatedActs });
                                                            }}
                                                          >
                                                            <SelectTrigger className="w-full bg-black/40 border-white/5 rounded-2xl h-12 text-sm font-bold">
                                                              <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="glass-card">
                                                              <SelectItem value={ActivityStatus.IN_PROGRESS} className="font-bold text-amber-500">EM ANDAMENTO</SelectItem>
                                                              <SelectItem value={ActivityStatus.FINISHED} className="font-bold text-green-500">CONCLUÍDO</SelectItem>
                                                              <SelectItem value={ActivityStatus.BLOCKED} className="font-bold text-red-500">SEM ATIVIDADES / BLOQUEADO</SelectItem>
                                                            </SelectContent>
                                                          </Select>
                                                        </div>
                                                        <div className="space-y-2.5">
                                                          <div className="flex items-center justify-between">
                                                            <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                                                              Andamento
                                                            </Label>
                                                            <span className="text-[10px] font-black text-primary">{d.progress}%</span>
                                                          </div>
                                                          <input
                                                            title="Andamento da atividade"
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            step="5"
                                                            value={d.progress || 0}
                                                            disabled={d.status === ActivityStatus.FINISHED || d.status === ActivityStatus.BLOCKED}
                                                            className={cn("w-full accent-primary", (d.status === ActivityStatus.FINISHED || d.status === ActivityStatus.BLOCKED) ? "opacity-50" : "")}
                                                            onChange={(e) => {
                                                              const progressVal = parseInt(e.target.value);
                                                              const draft = dailyReportDraftSignal.value;
                                                              const updatedActs = draft.selectedActivities.map(a => {
                                                                if (a.id === act.id) {
                                                                  return {
                                                                    ...a,
                                                                    details: a.details?.map((item, itemIdx) => {
                                                                      if (itemIdx === dIdx) return { ...item, progress: progressVal };
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
 
                                                      <div className="space-y-2.5">
                                                        <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Observação / Comentário</Label>
                                                        <Textarea 
                                                          placeholder="Adicionar observação para este item..."
                                                          className="bg-black/40 border-white/5 rounded-2xl text-sm min-h-[120px] text-white/90 placeholder:text-white/20 italic p-4 focus:ring-primary/20"
                                                          value={d.comment || ""}
                                                          onChange={(e) => {
                                                            const draft = dailyReportDraftSignal.value;
                                                            const updatedActs = draft.selectedActivities.map(a => {
                                                              if (a.id === act.id) {
                                                                return {
                                                                  ...a,
                                                                  details: a.details?.map((item, itemIdx) => {
                                                                    if (itemIdx === dIdx) return { ...item, comment: e.target.value };
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
 
                                                      <div className="pt-4 border-t border-white/5">
                                                        <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest block mb-4">Fotos do Item</Label>
                                                        <PhotoUploadZone 
                                                          photos={d.photos || []} 
                                                          onChange={(photos) => {
                                                            const draft = dailyReportDraftSignal.value;
                                                            const updatedActs = draft.selectedActivities.map(a => {
                                                              if (a.id === act.id) {
                                                                return {
                                                                  ...a,
                                                                  details: a.details?.map((item, itemIdx) => {
                                                                    if (itemIdx === dIdx) return { ...item, photos };
                                                                    return item;
                                                                    })
                                                                  };
                                                                }
                                                                return a;
                                                              });
                                                              updateReportDraft({ selectedActivities: updatedActs });
                                                            }}
                                                            compact={false}
                                                          />
                                                        </div>
                                                      </div>
                                                    </DialogContent>
                                                  </Dialog>

                                           </div>
                                         </div>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                               {/* FOTOS DA ATIVIDADE E ELEMENTOS (RELATORIO FOTOGRAFICO) */}
                               {(() => {
                                 const allPhotos: any[] = [];
                                 let docCounter = 1;

                                 if (act.photos && act.photos.length > 0) {
                                   allPhotos.push(...act.photos.map((p: any) => ({ ...p, source: 'Geral', displayLabel: `Doc. ${String(docCounter++).padStart(3, '0')}` })));
                                 }
                                 if (act.details && act.details.length > 0) {
                                   act.details.forEach((d: any) => {
                                     if (d.photos && d.photos.length > 0) {
                                       allPhotos.push(...d.photos.map((p: any) => ({ ...p, source: d.id })));
                                     }
                                   });
                                 }

                                 if (allPhotos.length === 0) return null;

                                 return (
                                   <div className="mt-8 pt-6 border-t border-white/5 space-y-6">
                                     <div className="flex items-center gap-3 border-b border-primary/20 pb-4 px-2">
                                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                                          <Camera className="w-4 h-4 text-primary" />
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-widest text-white/90">Registro Fotográfico</h4>
                                     </div>
                                     <div className="flex flex-wrap justify-center gap-8 px-2">
                                        {allPhotos.map((photo: any, pIdx: number) => {
                                          const displayUrl = getPhotoUrl(photo);

                                          return (
                                          <div key={pIdx} className="group flex flex-col glass-card border-white/5 bg-black/40 rounded-3xl overflow-hidden hover:border-primary/50 transition-all cursor-zoom-in w-full md:w-[calc(50%-2rem)] lg:w-[calc(33.33%-2.5rem)]" onClick={() => setSelectedPhoto(displayUrl)}>
                                            <div className="relative w-full aspect-video bg-black/60 overflow-hidden">
                                              <img src={displayUrl} alt={`Foto ${photo.source}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm text-[9px] font-black uppercase text-primary px-2 py-0.5 rounded-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                                {photo.source === 'Geral' ? photo.displayLabel : `ID: ${photo.source}`}
                                              </div>
                                            </div>
                                            <div className="p-4 bg-white/5 border-t border-white/5 flex-1 flex items-start gap-3 min-h-[60px]">
                                              <MessageSquare className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                                              <p className={cn(
                                                "text-xs font-medium leading-relaxed italic",
                                                photo.comment ? "text-white/80" : "text-white/20"
                                              )}>
                                                {photo.comment ? `"${photo.comment}"` : "Sem observação técnica."}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                     </div>
                                   </div>
                                 );
                               })()}
                             </div>
                           ))}
                        </div>
                      )}
                    </div>

                    {/* SEÇÃO: RELATO GERAL E EVIDÊNCIAS FOTOGRÁFICAS (GLOBAL) */}
                    <div className="space-y-8 pt-10 px-2">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                           <MessageSquare className="w-6 h-6 text-primary" />
                           Relato do Dia e Fotos
                         </h3>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div className="space-y-4">
                           <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Relato Geral (Opcional)</Label>
                           <Textarea 
                             value={generalObservations || ""} 
                             onChange={e => updateReportDraft({ generalObservations: e.target.value })}
                             placeholder="Descreva as atividades gerais do dia, condições encontradas, etc..."
                             className="bg-black/40 border-primary/20 focus:ring-primary/40 rounded-3xl min-h-[200px] p-6 text-sm placeholder:text-muted-foreground/30 shadow-inner"
                           />
                         </div>
                         <div className="space-y-4">
                            <PhotoUploadZone 
                              photos={generalPhotos || []} 
                              onChange={(photos) => updateReportDraft({ generalPhotos: photos })} 
                              title="Evidências Fotográficas Gerais (Opcional)"
                            />
                         </div>
                      </div>
                    </div>

                    {/* SEÇÃO: CLIMA, EFETIVO E EQUIPAMENTOS */}
                    <div className="space-y-8 pt-10 px-2">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                           <CloudSun className="w-6 h-6 text-primary" />
                           Condições e Recursos
                         </h3>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Clima */}
                        <Card className="glass-card border-white/5 bg-white/5 p-6 rounded-3xl">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 block">Condições Climáticas</Label>
                          <div className="space-y-4">
                            {(['Manhã', 'Tarde', 'Noite'] as const).map((period) => {
                              const key = (period === 'Manhã' ? 'morning' : period === 'Tarde' ? 'afternoon' : 'night') as keyof typeof weather;
                              const currentVal = weather?.[key];
                              return (
                                <div key={period} className="flex items-center justify-between bg-black/20 p-3 rounded-2xl">
                                  <span className="text-[10px] font-bold uppercase">{period}</span>
                                  <div className="flex gap-1">
                                    {(['GOOD', 'RAIN', 'IMPRACTICABLE'] as const).map((status) => (
                                      <Button
                                        key={status}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                          "h-7 px-2 text-[8px] font-black rounded-lg transition-all",
                                          currentVal === status 
                                            ? (status === 'GOOD' ? "bg-green-600 text-white shadow-lg shadow-green-500/20" : status === 'RAIN' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-red-600 text-white shadow-lg shadow-red-500/20")
                                            : "text-white/20 hover:text-white/40"
                                        )}
                                        onClick={() => {
                                          const newWeather = { ...weather, [key]: status };
                                          updateReportDraft({ weather: newWeather as any });
                                        }}
                                      >
                                        {status === 'GOOD' ? 'BOM' : status === 'RAIN' ? 'CHUVA' : 'IMPRAT.'}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </Card>

                         {/* Efetivo */}
                         <Card className="glass-card border-white/5 bg-white/5 p-6 rounded-3xl lg:col-span-2 flex flex-col">
                           <div 
                             className="flex items-center justify-between group/header cursor-pointer select-none mb-4"
                             onClick={() => setShowManpower(!showManpower)}
                           >
                             <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 group-hover:text-white transition-colors">
                               <Users className="w-3.5 h-3.5" />
                               Quadro de Efetivo
                             </Label>
                             <div className="flex items-center gap-2">
                               <Button 
                                 type="button" 
                                 variant="outline" 
                                 size="sm" 
                                 className="h-7 px-3 rounded-full bg-primary/10 border-primary/20 text-primary text-[9px] font-black"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const newManpower = [...(manpower || []), { registration: '', name: '', role: '' }];
                                   updateReportDraft({ manpower: newManpower });
                                 }}
                               >
                                 <Plus className="w-3 h-3 mr-1" /> ADICIONAR
                               </Button>
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/40">
                                 {showManpower ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                               </Button>
                             </div>
                           </div>
                           
                           {showManpower && (
                             <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                               {/* Cabeçalho de Colunas */}
                               {(manpower || []).length > 0 && (
                                 <div className="grid grid-cols-[100px_1fr_1fr_40px] gap-4 px-4 mb-2">
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Matrícula</span>
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Nome do Colaborador</span>
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Função / Cargo</span>
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider text-right">#</span>
                                 </div>
                               )}

                               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                 {(manpower || []).length === 0 ? (
                                     <div className="text-center py-10 text-white/10 text-[10px] uppercase font-bold">Nenhum efetivo adicionado</div>
                                 ) : (
                                   (manpower || []).map((m, idx) => (
                                     <div key={idx} className="grid grid-cols-[100px_1fr_1fr_40px] gap-4 items-center bg-black/20 p-2.5 rounded-2xl animate-in slide-in-from-right-2 border border-white/5 hover:border-primary/20 transition-all">
                                       <input 
                                         placeholder="Ex: 005655" 
                                         className="bg-black/40 border-none rounded-xl text-[11px] font-bold text-white px-3 py-2 focus:ring-1 focus:ring-primary/40 transition-all font-mono"
                                         value={m.registration || ""}
                                         onChange={(e) => {
                                           const newManpower = [...(manpower || [])];
                                           newManpower[idx] = { ...newManpower[idx], registration: e.target.value };
                                           updateReportDraft({ manpower: newManpower });
                                         }}
                                       />
                                       <input 
                                         placeholder="Nome Completo..." 
                                         className="bg-black/40 border-none rounded-xl text-[11px] font-bold text-white px-3 py-2 focus:ring-1 focus:ring-primary/40 transition-all"
                                         value={m.name}
                                         onChange={(e) => {
                                           const newManpower = [...(manpower || [])];
                                           newManpower[idx] = { ...newManpower[idx], name: e.target.value };
                                           updateReportDraft({ manpower: newManpower });
                                         }}
                                       />
                                       <input 
                                         placeholder="Função (Ex: Pedreiro...)" 
                                         className="bg-black/40 border-none rounded-xl text-[11px] font-bold text-white px-3 py-2 focus:ring-1 focus:ring-primary/40 transition-all"
                                         value={m.role}
                                         onChange={(e) => {
                                           const newManpower = [...(manpower || [])];
                                           newManpower[idx] = { ...newManpower[idx], role: e.target.value };
                                           updateReportDraft({ manpower: newManpower });
                                         }}
                                       />
                                       <div className="flex justify-end">
                                         <Button 
                                           type="button" 
                                           variant="ghost" 
                                           size="icon" 
                                           className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                           onClick={() => {
                                             const newManpower = (manpower || []).filter((_, i) => i !== idx);
                                             updateReportDraft({ manpower: newManpower });
                                           }}
                                         >
                                           <Trash2 className="w-4 h-4" />
                                         </Button>
                                       </div>
                                     </div>
                                   ))
                                 )}
                               </div>
                             </div>
                           )}
                         </Card>

                         {/* Equipamentos */}
                         <Card className="glass-card border-white/5 bg-white/5 p-6 rounded-3xl lg:col-span-3 flex flex-col">
                           <div 
                             className="flex items-center justify-between group/header cursor-pointer select-none mb-4 px-2"
                             onClick={() => setShowEquipment(!showEquipment)}
                           >
                             <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 group-hover:text-white transition-colors">
                               <Truck className="w-3.5 h-3.5" />
                               Quadro de Equipamentos
                             </Label>
                             <div className="flex items-center gap-2">
                               <Button 
                                 type="button" 
                                 variant="outline" 
                                 size="sm" 
                                 className="h-7 px-3 rounded-full bg-primary/10 border-primary/20 text-primary text-[9px] font-black"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const newEquip = [...(equipment || []), { equipment: '', type: '', model: '', driverName: '', plate: '' }];
                                   updateReportDraft({ equipment: newEquip });
                                 }}
                               >
                                 <Plus className="w-3 h-3 mr-1" /> ADICIONAR
                               </Button>
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/40">
                                 {showEquipment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                               </Button>
                             </div>
                           </div>

                           {showEquipment && (
                             <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                               {/* Cabeçalho de Colunas */}
                               {(equipment || []).length > 0 && (
                                 <div className="grid grid-cols-[1fr_1fr_120px_1fr_40px] gap-4 px-6 mb-2">
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Tipo / Equipamento</span>
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Modelo</span>
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Placa/ID</span>
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Motorista / Operador</span>
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider text-right">#</span>
                                 </div>
                               )}

                               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                 {(equipment || []).length === 0 ? (
                                   <div className="text-center py-10 text-white/10 text-[10px] uppercase font-bold">Nenhum equipamento adicionado</div>
                                 ) : (
                                   (equipment || []).map((e, idx) => (
                                     <div key={idx} className="grid grid-cols-[1fr_1fr_120px_1fr_40px] gap-4 items-center bg-black/20 p-3 rounded-2xl animate-in zoom-in-95 group/equip border border-white/5 hover:border-primary/20 transition-all">
                                       <input 
                                         placeholder="Ex: Caminhão Munck..." 
                                         className="bg-black/40 border-none rounded-xl text-[11px] font-bold text-white px-3 py-2.5 focus:ring-1 focus:ring-primary/40 transition-all"
                                         value={e.equipment}
                                         onChange={(val) => {
                                      const newEquip = [...(equipment || [])];
                                      newEquip[idx] = { ...newEquip[idx], equipment: val.target.value };
                                      updateReportDraft({ equipment: newEquip });
                                    }}
                                  />
                                  <input 
                                    placeholder="Modelo..." 
                                    className="bg-black/40 border-none rounded-xl text-[11px] font-bold text-white px-3 py-2.5 focus:ring-1 focus:ring-primary/40 transition-all"
                                    value={e.model || ""}
                                    onChange={(val) => {
                                      const newEquip = [...(equipment || [])];
                                      newEquip[idx] = { ...newEquip[idx], model: val.target.value };
                                      updateReportDraft({ equipment: newEquip });
                                    }}
                                  />
                                  <input 
                                    placeholder="ABC-1234 / ID..." 
                                    className="bg-black/40 border-none rounded-xl text-[11px] font-bold text-white px-3 py-2.5 focus:ring-1 focus:ring-primary/40 transition-all font-mono"
                                    value={e.plate || ""}
                                    onChange={(val) => {
                                      const newEquip = [...(equipment || [])];
                                      newEquip[idx] = { ...newEquip[idx], plate: val.target.value };
                                      updateReportDraft({ equipment: newEquip });
                                    }}
                                  />
                                  <input 
                                    placeholder="Nome do Condutor..." 
                                    className="bg-black/40 border-none rounded-xl text-[11px] font-bold text-white px-3 py-2.5 focus:ring-1 focus:ring-primary/40 transition-all"
                                    value={e.driverName || ""}
                                    onChange={(val) => {
                                      const newEquip = [...(equipment || [])];
                                      newEquip[idx] = { ...newEquip[idx], driverName: val.target.value };
                                      updateReportDraft({ equipment: newEquip });
                                    }}
                                  />
                                  <div className="flex justify-end">
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                                      onClick={() => {
                                        const newEquip = (equipment || []).filter((_, i) => i !== idx);
                                        updateReportDraft({ equipment: newEquip });
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        )}
                      </Card>
                      </div>
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
                        {draft.isCorrection ? "REENVIAR RELATÓRIO CORRIGIDO" : "REGISTRAR E ENVIAR RELATÓRIO COMPLETO"}
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
      
      {/* Dialog para Expandir Foto */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none [&>button]:text-white [&>button]:bg-black/50 [&>button]:hover:bg-black [&>button]:w-10 [&>button]:h-10 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:top-4 [&>button]:right-4">
          <DialogTitle className="sr-only">Visualização de Foto Expandida</DialogTitle>
          <DialogDescription className="sr-only">Imagem em alta resolução anexada à atividade</DialogDescription>
          {selectedPhoto && (
            <div className="relative w-full h-[85vh] flex items-center justify-center">
              <img src={selectedPhoto} alt="Foto Expandida" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
