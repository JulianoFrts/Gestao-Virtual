import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Search, 
  Filter, 
  FileEdit, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  ChevronRight,
  AlertCircle,
  MoreVertical,
  Trash2,
  ExternalLink,
  Loader2,
  Calendar
} from "lucide-react";
import { useDailyReports, DailyReportStatus } from "@/hooks/useDailyReports";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDailyReportContext } from "@/contexts/DailyReportContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RDOHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reports, isLoading, refresh } = useDailyReports();
  const { toast } = useToast();
  const dailyReport = useDailyReportContext();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("all");

  React.useEffect(() => {
    // We can potentially call a refresh if needed, but context handles its own init
  }, []);

  const handleCorrect = (report: any) => {
    const metadata = report.metadata || {};
    
    // Mapear o relatório do backend para o formato do Draft
    dailyReport.updateReportDraft({
      editingReportId: report.id,
      isCorrection: true,
      employeeId: report.employeeId,
      teamIds: [report.teamId],
      projectId: report.projectId || metadata.projectId,
      siteId: metadata.siteId,
      companyId: report.companyId,
      rdoNumber: report.rdoNumber,
      selectedActivities: metadata.selectedActivities || [],
      weather: metadata.weather,
      manpower: metadata.manpower || [],
      equipment: metadata.equipment || [],
      generalObservations: metadata.generalObservations || "",
      generalPhotos: metadata.generalPhotos || [],
      step: 1, // Começar do passo 1 para revisão completa
    });

    toast({
      title: "Relatório carregado para correção",
      description: "Você foi redirecionado para o formulário com os dados originais.",
    });

    navigate('/daily-report');
  };

  // Filter real reports from server
  const myReports = reports.filter(r => r.employeeId === user?.id || (r as any).userId === user?.id);
  
  // Get draft from context
  const { draft } = dailyReport;
  const hasDraft = draft && draft.updatedAt > 0 && draft.selectedActivities.length > 0;

  const filteredReports = myReports.filter(r => {
    const matchesSearch = r.rdoNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.teamName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "returned") return matchesSearch && r.status === DailyReportStatus.RETURNED;
    if (activeTab === "approved") return matchesSearch && r.status === DailyReportStatus.APPROVED;
    if (activeTab === "sent") return matchesSearch && r.status === DailyReportStatus.SENT;
    return matchesSearch;
  });

  const getStatusBadge = (status: DailyReportStatus) => {
    switch (status) {
      case DailyReportStatus.APPROVED:
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 font-black uppercase text-[10px]">Aprovado</Badge>;
      case DailyReportStatus.RETURNED:
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30 font-black uppercase text-[10px]">Devolvido</Badge>;
      case DailyReportStatus.SENT:
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 font-black uppercase text-[10px]">Enviado</Badge>;
      default:
        return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 font-black uppercase text-[10px]">Pendente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <History className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">Meus Relatórios</h1>
            </div>
            <p className="text-muted-foreground font-medium pl-1">Acompanhe seus envios, rascunhos e correções pendentes.</p>
          </div>
          
          <Button 
            onClick={() => navigate('/daily-report')}
            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-2xl h-14 px-8 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Novo Relatório
          </Button>
        </div>

        {/* Stats Section Placeholder or Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              <CardContent className="p-6 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <AlertCircle className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Devoluções</p>
                    <p className="text-2xl font-black">{myReports.filter(r => r.status === DailyReportStatus.RETURNED).length}</p>
                 </div>
              </CardContent>
           </Card>
           <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              <CardContent className="p-6 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-500">
                    <CheckCircle2 className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aprovados</p>
                    <p className="text-2xl font-black">{myReports.filter(r => r.status === DailyReportStatus.APPROVED).length}</p>
                 </div>
              </CardContent>
           </Card>
           <Card className="bg-white/5 border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              <CardContent className="p-6 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <FileText className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Enviado</p>
                    <p className="text-2xl font-black">{myReports.length}</p>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl h-14">
                <TabsTrigger value="all" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">Todos</TabsTrigger>
                <TabsTrigger value="returned" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-red-500 data-[state=active]:text-white">Devolvidos</TabsTrigger>
                <TabsTrigger value="drafts" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-amber-500 data-[state=active]:text-white">Rascunhos</TabsTrigger>
                <TabsTrigger value="approved" className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-green-500 data-[state=active]:text-white">Aprovados</TabsTrigger>
              </TabsList>

              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por número ou equipe..." 
                  className="bg-white/5 border-white/10 rounded-2xl h-14 pl-12 focus:ring-primary/20 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="drafts" className="mt-0 space-y-4">
               {hasDraft ? (
                 <Card className="bg-white/5 border border-amber-500/20 rounded-3xl overflow-hidden hover:bg-white/10 transition-all group">
                   <CardContent className="p-6 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <FileEdit className="w-7 h-7" />
                         </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <h3 className="text-xl font-black uppercase tracking-tight">Rascunho em andamento</h3>
                               <Badge className="bg-amber-500 text-white font-black text-[9px] uppercase">Local Cache</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                               <Clock className="w-3 h-3" /> Atualizado em {format(draft.updatedAt, "dd/MM 'às' HH:mm")} • {draft.selectedActivities.length} atividades logadas
                            </p>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <Button 
                           variant="ghost" 
                           className="rounded-xl h-12 w-12 text-white/40 hover:text-white hover:bg-white/5"
                           onClick={() => {
                             if (confirm("Deseja realmente excluir este rascunho?")) {
                               dailyReport.resetReportDraft();
                             }
                           }}
                         >
                            <Trash2 className="w-5 h-5" />
                         </Button>
                         <Button 
                           onClick={() => navigate('/daily-report')}
                           className="bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest rounded-xl h-12 px-6 shadow-lg shadow-amber-500/20 transition-all"
                         >
                            Continuar
                         </Button>
                      </div>
                   </CardContent>
                 </Card>
               ) : (
                 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                    <FileEdit className="w-16 h-16 text-muted-foreground" />
                    <p className="font-black uppercase tracking-widest text-xs">Nenhum rascunho local encontrado</p>
                 </div>
               )}
            </TabsContent>

            <TabsContent value={activeTab} className="mt-0 space-y-4">
               {isLoading ? (
                 <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="font-black uppercase tracking-widest text-xs opacity-50">Carregando seus relatórios...</p>
                 </div>
               ) : filteredReports.length > 0 ? (
                 filteredReports.map((report) => (
                   <Card key={report.id} className="bg-white/5 border-white/10 rounded-3xl overflow-hidden hover:bg-white/8 transition-all group border-l-4 border-l-transparent data-[status=RETURNED]:border-l-red-500" data-status={report.status}>
                      <CardContent className="p-6 flex items-center justify-between gap-6">
                         <div className="flex items-center gap-6">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-lg",
                              report.status === DailyReportStatus.APPROVED ? "bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/5" :
                              report.status === DailyReportStatus.RETURNED ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/5" :
                              "bg-primary/10 text-primary border-primary/20 shadow-primary/5"
                            )}>
                               {report.status === DailyReportStatus.APPROVED ? <CheckCircle2 className="w-7 h-7" /> :
                                report.status === DailyReportStatus.RETURNED ? <AlertCircle className="w-7 h-7" /> :
                                <FileText className="w-7 h-7" />}
                            </div>
                            <div>
                               <div className="flex items-center gap-3 mb-1">
                                  <h3 className="text-xl font-black uppercase tracking-tight">{report.rdoNumber || `RDO #${report.id.slice(-5).toUpperCase()}`}</h3>
                                  {getStatusBadge(report.status)}
                               </div>
                               <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(report.reportDate), "dd 'de' MMMM", { locale: ptBR })}</span>
                                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Enviado às {format(new Date(report.createdAt), "HH:mm")}</span>
                                  <span className="flex items-center gap-1.5 font-bold text-white/60">Equipe: {report.teamName}</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-4">
                            {report.status === DailyReportStatus.RETURNED && (
                               <div className="bg-red-500/10 px-4 py-2 rounded-xl flex items-center gap-2 text-red-400 animate-pulse border border-red-500/20">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Correção Pendente</span>
                               </div>
                            )}
                            
                            <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-xl h-12 w-12 text-white/40 hover:text-white hover:bg-white/5">
                                     <MoreVertical className="w-5 h-5" />
                                  </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="bg-[#0c0c0e] border-white/10 rounded-2xl w-56 p-2">
                                  <DropdownMenuItem className="rounded-xl p-3 font-bold uppercase text-[10px] tracking-widest focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer gap-3">
                                     <ExternalLink className="w-4 h-4" /> Detalhes Completos
                                  </DropdownMenuItem>
                                  {report.status === DailyReportStatus.RETURNED && (
                                     <DropdownMenuItem 
                                        onClick={() => handleCorrect(report)}
                                        className="rounded-xl p-3 font-bold uppercase text-[10px] tracking-widest focus:bg-red-500/10 focus:text-red-500 transition-colors cursor-pointer gap-3"
                                     >
                                        <FileEdit className="w-4 h-4" /> Corrigir e Reenviar
                                     </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className="rounded-xl p-3 font-bold uppercase text-[10px] tracking-widest focus:bg-white/5 transition-colors cursor-pointer gap-3">
                                     <Trash2 className="w-4 h-4" /> Arquivar
                                  </DropdownMenuItem>
                               </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <Button 
                              variant="ghost" 
                              className="rounded-xl h-12 w-12 bg-white/3 hover:bg-white/10 transition-all text-white group-hover:translate-x-1"
                              onClick={() => {
                                // ABRIR MODAL OU NAVEGAR
                              }}
                            >
                               <ChevronRight className="w-6 h-6" />
                            </Button>
                         </div>
                      </CardContent>
                   </Card>
                 ))
               ) : (
                 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
                    <History className="w-16 h-16 text-muted-foreground" />
                    <p className="font-black uppercase tracking-widest text-xs">Nenhum relatório {activeTab !== 'all' ? `com status "${activeTab}"` : ""} encontrado</p>
                 </div>
               )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
