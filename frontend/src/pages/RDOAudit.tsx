import React, { useState, useMemo } from 'react';
import { useDailyReports, DailyReport, DailyReportStatus, ActivityStatus } from '@/hooks/useDailyReports';
import { useTeams } from '@/hooks/useTeams';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText, Filter, Search, Eye, Calendar, User, Users, 
  Clock, MapPin, CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  X, Loader2, Camera, CloudSun, Truck, Plus, Trash2, Printer,
  MessageSquare,
  Info,
  Check,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  ChevronsUpDown,
  RefreshCw,
  Send,
  ChevronRight,
  ChevronLeft,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { dailyReportService } from '@/services/api/project/DailyReportService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Color } from 'three';

export default function RDOAudit() {
  const { reports, isLoading, refresh } = useDailyReports();
  const { teams } = useTeams();
  const { users } = useUsers();
  const { toast } = useToast();

  const [filterDate, setFilterDate] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string>(DailyReportStatus.SENT);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'reportDate',
    direction: 'desc'
  });

  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showManpower, setShowManpower] = useState(true);
  const [showEquipment, setShowEquipment] = useState(true);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Helper for safe date formatting
  const safeFormatDate = (date: any, formatStr: string, options?: any) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Data inválida";
      return format(d, formatStr, options);
    } catch (e) {
      return "Erro na data";
    }
  };

  // Filter reports based on all criteria
  const filteredReports = useMemo(() => {
    const filtered = reports.filter((report) => {
      // Status filter
      if (filterStatus === DailyReportStatus.DRAFT) {
        if (report.status !== DailyReportStatus.DRAFT && report.status !== DailyReportStatus.PROGRAMMED) return false;
      } else if (filterStatus !== 'all' && report.status !== filterStatus) {
        return false;
      }

      // Date filter
      let matchesDate = true;
      if (filterDate) {
        try {
          const reportDateStr = new Date(report.reportDate).toISOString().split("T")[0];
          matchesDate = reportDateStr === filterDate;
        } catch (e) {
          matchesDate = false;
        }
      }

      // Team filter
      const matchesTeam = filterTeam !== "all" ? report.teamId === filterTeam : true;

      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm
        ? (report.activities || "").toLowerCase().includes(searchLower) ||
          (report.observations && report.observations.toLowerCase().includes(searchLower))
        : true;

      return matchesDate && matchesTeam && matchesSearch;
    });

    return filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortConfig.key) {
        case 'reportDate':
          valA = new Date(a.reportDate).getTime();
          valB = new Date(b.reportDate).getTime();
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'reporter':
          valA = getReporterName(a.createdBy).toLowerCase();
          valB = getReporterName(b.createdBy).toLowerCase();
          break;
        case 'team':
          valA = getTeamName(a.teamId, a.teamName).toLowerCase();
          valB = getTeamName(b.teamId, b.teamName).toLowerCase();
          break;
        case 'items':
          valA = a.selectedActivities?.reduce((acc: number, act: any) => acc + (act.details?.length || 0), 0) || 0;
          valB = b.selectedActivities?.reduce((acc: number, act: any) => acc + (act.details?.length || 0), 0) || 0;
          break;
        default:
          valA = new Date(a.createdAt || a.reportDate).getTime();
          valB = new Date(b.createdAt || b.reportDate).getTime();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [reports, filterDate, filterTeam, filterStatus, searchTerm, sortConfig, users, teams]);



  const getReporterName = (userId: string | null) => {
    if (!userId) return "Desconhecido";
    const user = users.find((u) => u.id === userId);
    return user ? user.fullName : "Usuário não encontrado";
  };

  const getTeamName = (teamId: string | null, teamName?: string) => {
    if (teamName) return teamName;
    if (!teamId) return "Geral";
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Equipe não encontrada";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case DailyReportStatus.SENT:
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-lg">Pendente</Badge>;
      case DailyReportStatus.APPROVED:
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-lg">Aprovado</Badge>;
      case DailyReportStatus.RETURNED:
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-lg">Devolvido</Badge>;
      case DailyReportStatus.DRAFT:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-lg">Rascunho</Badge>;
      case DailyReportStatus.PROGRAMMED:
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-black uppercase text-[9px] tracking-widest px-2 py-0.5 rounded-lg">Programado</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">{status}</Badge>;
    }
  };

  // Clear selection when filters change to avoid accidental bulk actions on hidden items
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [filterDate, filterTeam, filterStatus, searchTerm]);

  const handleApprove = async () => {
    if (!selectedReport) return;

    setIsProcessing(true);
    try {
      const result = await dailyReportService.approve(selectedReport.id);
      if (result.success) {
        toast({
          description: "O progresso foi atualizado com sucesso.",
        });
        setSelectedReport(null);
        refresh({ hard: true });
      } else {
        toast({
          title: "Erro ao aprovar",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      const result = await dailyReportService.reject(selectedReport.id, rejectionReason);
      if (result.success) {
        toast({
          title: "Relatório devolvido",
          description: "O encarregado será notificado para correção.",
          variant: "destructive",
        });
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        setSelectedReport(null);
        refresh({ hard: true });
      } else {
        toast({
          title: "Erro ao rejeitar",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = React.useState(false);

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredReports.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setIsBulkProcessing(true);

    try {
      const result = await dailyReportService.bulkApprove(Array.from(selectedIds));

      if (result.success) {
        toast({
          title: "Processamento iniciado",
          description: "Os relatórios selecionados foram enviados para aprovação em segundo plano.",
        });
        setSelectedIds(new Set());
        // Hard refresh após 3s para garantir sincronia com worker e limpar cache local
        setTimeout(() => refresh({ hard: true }), 3000);
      } else {
        toast({
          title: "Erro na aprovação em lote",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0 || !rejectionReason.trim()) return;

    setIsBulkProcessing(true);

    try {
      const result = await dailyReportService.bulkReject(Array.from(selectedIds), rejectionReason);

      if (result.success) {
        toast({
          title: "Processamento iniciado",
          description: "Os relatórios selecionados foram enviados para devolução em segundo plano.",
          variant: "destructive"
        });
        setSelectedIds(new Set());
        setIsRejectDialogOpen(false);
        setRejectionReason("");
        // Hard refresh após 3s para garantir sincronia com worker e limpar cache local
        setTimeout(() => refresh({ hard: true }), 3000);
      } else {
        toast({
          title: "Erro na devolução em lote",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] animate-fade-in relative">
      <div className="flex-none space-y-4 mb-4 z-20">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8" /> Auditoria de RDO
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Existem <strong>{reports.filter(r => r.status === DailyReportStatus.SENT).length}</strong> relatórios aguardando sua revisão.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 glass-card p-3 rounded-2xl items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-primary/5 border-primary/20 w-[160px] h-10 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value={DailyReportStatus.SENT}>Pendentes de Aprovação</SelectItem>
                  <SelectItem value={DailyReportStatus.APPROVED}>Aprovados</SelectItem>
                  <SelectItem value={DailyReportStatus.RETURNED}>Aguardando Edição</SelectItem>
                  <SelectItem value={DailyReportStatus.DRAFT}>Rascunhos / Programações</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Data</label>
              <Input
                type="date"
                className="bg-primary/5 border-primary/20 h-10 rounded-xl"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Equipe</label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="bg-primary/5 border-primary/20 w-[180px] h-10 rounded-xl">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="all">Todas</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Busca</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  placeholder="Pesquisar..."
                  className="bg-primary/5 border-primary/20 pl-9 h-10 rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Ordem</label>
              <Select
                value={sortConfig.direction}
                onValueChange={(v: "desc" | "asc") => setSortConfig(prev => ({ ...prev, direction: v }))}
              >
                <SelectTrigger className="bg-primary/5 border-primary/20 w-[140px] h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="desc">Mais Recentes</SelectItem>
                  <SelectItem value="asc">Mais Antigos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

      {/* Floating Bulk Action Bar - Fixed at Top */}
      {selectedIds.size > 0 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 duration-500 ease-out">
          <div className="bg-[#0c0c0e]/90 backdrop-blur-xl border border-primary/30 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6 px-8">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center font-black text-white shadow-lg shadow-primary/20">
                 {selectedIds.size}
               </div>
               <div className="flex flex-col">
                 <span className="text-xs font-black text-white uppercase tracking-tight">Relatórios</span>
                 <span className="text-[9px] font-bold text-primary uppercase">Selecionados</span>
               </div>
            </div>

            <div className="h-10 w-px bg-white/10" />

            <div className="flex gap-3">
              <Button
                size="sm"
                variant="destructive"
                className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-500/10"
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={isBulkProcessing}
              >
                <X className="w-4 h-4 mr-2" /> Devolver Selecionados
              </Button>
              <Button
                size="sm"
                className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                onClick={handleBulkApprove}
                disabled={isBulkProcessing}
              >
                {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aprovar Todos
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="bg-card text-card-foreground glass-card border-none shadow-2xl rounded-4xl flex flex-col overflow-hidden min-h-0 mt-2">
        <CardContent className="p-0 flex flex-col overflow-hidden min-h-0">
          <Table
            className="border-separate border-spacing-0"
            containerClassName="relative w-full overflow-auto flex-1 custom-scrollbar min-h-0"
          >
            <TableHeader className="sticky top-0 z-30 bg-[#0c0c0e] shadow-xl">
              <TableRow className="border-primary/10 hover:bg-transparent">
                <TableHead className="w-14 items-center justify-center pl-8 sticky top-0 left-0 z-50 bg-[#0c0c0e] border-b border-primary/20 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.5)]">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-md border-2 border-primary/30 flex items-center justify-center cursor-pointer transition-all",
                      selectedIds.size === filteredReports.length && filteredReports.length > 0 ? "bg-primary border-primary shadow-lg shadow-primary/20" : "bg-white/5 hover:border-primary/60"
                    )}
                    onClick={() => toggleAll(selectedIds.size !== filteredReports.length)}
                  >
                    {selectedIds.size === filteredReports.length && filteredReports.length > 0 && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </TableHead>
                <TableHead
                  className="font-black text-primary uppercase text-[10px] tracking-widest h-14 cursor-pointer hover:bg-primary/10 transition-colors sticky top-0 z-20 bg-[#0c0c0e] border-b border-primary/20 shadow-xl"
                  onClick={() => {
                    const direction = sortConfig.key === 'reportDate' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfig({ key: 'reportDate', direction });
                  }}
                >
                  <div className="flex items-center gap-2">
                    Data RDO
                    {sortConfig.key === 'reportDate' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead
                  className="font-black text-primary uppercase text-[10px] tracking-widest h-14 cursor-pointer hover:bg-primary/10 transition-colors sticky top-0 z-30 bg-[#0c0c0e] border-b border-primary/20 shadow-xl"
                  onClick={() => {
                    const direction = sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfig({ key: 'status', direction });
                  }}
                >
                  <div className="flex items-center gap-2">
                    Status
                    {sortConfig.key === 'status' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead
                  className="font-black text-primary uppercase text-[10px] tracking-widest h-14 cursor-pointer hover:bg-primary/10 transition-colors sticky top-0 z-30 bg-[#0c0c0e] border-b border-primary/20 shadow-xl"
                  onClick={() => {
                    const direction = sortConfig.key === 'reporter' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfig({ key: 'reporter', direction });
                  }}
                >
                   <div className="flex items-center gap-2">
                    Encarregado / Equipe
                    {sortConfig.key === 'reporter' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead className="font-black text-primary uppercase text-[10px] tracking-widest h-14 sticky top-0 z-30 bg-[#0c0c0e] border-b border-primary/20 shadow-xl">Atividades Principais</TableHead>
                <TableHead
                  className="font-black text-primary uppercase text-[10px] tracking-widest h-14 text-center cursor-pointer hover:bg-primary/10 transition-colors sticky top-0 z-30 bg-[#0c0c0e] border-b border-primary/20 shadow-xl"
                  onClick={() => {
                    const direction = sortConfig.key === 'items' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    setSortConfig({ key: 'items', direction });
                  }}
                >
                   <div className="flex items-center justify-center gap-2">
                    Itens
                    {sortConfig.key === 'items' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </TableHead>
                <TableHead className="font-black text-primary uppercase text-[10px] tracking-widest h-14 text-right pr-8 sticky top-0 z-30 bg-[#0c0c0e] border-b border-primary/20 shadow-xl">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-muted-foreground font-bold animate-pulse">CARREGANDO RELATÓRIOS PARA AUDITORIA...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <CheckCircle2 className="w-16 h-16" />
                      <p className="font-black uppercase tracking-tighter text-xl">Nenhum RDO encontrado</p>
                      <p className="text-sm">Tente ajustar os filtros acima.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id} className={cn("border-primary/5 hover:bg-primary/5 transition-colors group", selectedIds.has(report.id) && "bg-primary/5")}>
                    <TableCell className="pl-8 py-5 sticky left-0 z-10 bg-[#0c0c0e]/80 backdrop-blur-sm border-r border-primary/10">
                       <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 border-primary/30 flex items-center justify-center cursor-pointer transition-all",
                          selectedIds.has(report.id) ? "bg-primary border-primary shadow-lg shadow-primary/20" : "bg-white/5 group-hover:border-primary/60"
                        )}
                        onClick={() => toggleOne(report.id, !selectedIds.has(report.id))}
                      >
                        {selectedIds.has(report.id) && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-lg text-foreground tracking-tight leading-none">
                          {safeFormatDate(report.reportDate, "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {report.scheduledAt && (
                            <span className="text-[9px] font-bold text-blue-400 uppercase flex items-center gap-1 leading-none">
                              <Calendar className="w-2.5 h-2.5" /> Progr: {safeFormatDate(report.scheduledAt, "dd/MM HH:mm")}
                            </span>
                          )}
                          {report.executedAt && (
                            <span className="text-[9px] font-bold text-amber-400 uppercase flex items-center gap-1 leading-none">
                              <Clock className="w-2.5 h-2.5" /> Exec: {safeFormatDate(report.executedAt, "dd/MM HH:mm")}
                            </span>
                          )}
                          {report.reviewedAt && (
                            <span className="text-[9px] font-bold text-green-400 uppercase flex items-center gap-1 leading-none">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Rev: {safeFormatDate(report.reviewedAt, "dd/MM HH:mm")}
                            </span>
                          )}
                          {!report.scheduledAt && !report.executedAt && !report.reviewedAt && (
                            <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1 leading-none">
                              <Clock className="w-2.5 h-2.5" /> Criado: {safeFormatDate(report.createdAt, "dd/MM HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(report.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary border border-primary/20">
                          {getReporterName(report.createdBy).charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm tracking-tight">{getReporterName(report.createdBy)}</span>
                          <span className="text-[10px] uppercase font-black text-primary/60">{getTeamName(report.teamId, report.teamName)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      <div className="flex flex-wrap gap-1.5">
                        {report.selectedActivities?.slice(0, 2).map((act, i) => (
                          <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
                            {act.stageName}
                          </Badge>
                        ))}
                        {(report.selectedActivities?.length || 0) > 2 && (
                          <Badge variant="outline" className="bg-muted/50 border-muted-foreground/20 text-[10px] font-bold px-2 py-0.5">
                            +{(report.selectedActivities?.length || 0) - 2}
                          </Badge>
                        )}
                        {!report.selectedActivities && <span className="text-xs text-muted-foreground truncate">{report.activities}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-black text-primary/40 text-sm">
                       {report.selectedActivities?.reduce((acc, act) => acc + (act.details?.length || 0), 0) || 0}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-2xl bg-primary/5 hover:bg-primary text-primary hover:text-white transition-all duration-300"
                        onClick={() => setSelectedReport(report)}
                      >
                        <Eye className="w-5 h-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DETALHES DO RDO PARA AUDITORIA - FULL PAGE  - botao close desabilitado*/}

      <Dialog open={!!selectedReport} onOpenChange={(open) => open }>
        
        <DialogContent hideClose className="max-w-none w-screen h-screen m-0 rounded-none bg-[#0a0a0b] border-none p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Detalhes do Relatório</DialogTitle>
          <DialogDescription className="sr-only">Visualização detalhada do relatório para auditoria</DialogDescription>
          {selectedReport && (
            <div className="flex flex-col h-full">
              {/* Header Fixo */}
              <div className={cn(
                "bg-linear-to-br from-primary/10 to-transparent border-b border-white/5 relative shrink-0 transition-all duration-300",
                isHeaderCollapsed ? "py-5" : "py-5"
              )}>
                {/* Botão de Alternância (Expandir/Recolher) */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 z-90 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"
                  onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                >
                  {isHeaderCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </Button>

                <div className="flex flex-col items-center justify-center relative z-10 max-w-7xl mx-auto w-full text-center">
                  {!isHeaderCollapsed && (
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-6 animate-in fade-in zoom-in duration-300">
                      <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Relatório Diário de Obra</h2>
                      {selectedReport.status === DailyReportStatus.APPROVED ? (
                        <Badge className="bg-green-500 text-white font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] shadow-lg shadow-green-500/20">Aprovado</Badge>
                      ) : selectedReport.status === DailyReportStatus.RETURNED ? (
                        <Badge className="bg-red-500 text-white font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] shadow-lg shadow-red-500/20">Devolvido</Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20">Aguardando Aprovação</Badge>
                      )}
                    </div>
                  )}

                  <div className={cn(
                    "flex flex-wrap items-center justify-center gap-x-5 gap-y-4 pb-4 transition-all duration-300",
                    isHeaderCollapsed && "justify-right gap-x-5"
                  )}>
                    {isHeaderCollapsed && (
                      <div className="flex items-center gap-4 pr-4 border-r border-white/10 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex flex-col items-start">
                          <span className="text-[10px] font-black text-primary uppercase tracking-tight">Relatório Diário de Obra</span>
                          <div className="flex items-center gap-2">
                            {selectedReport.status === DailyReportStatus.APPROVED ? (
                              <Badge className="bg-green-500 text-white font-black px-2 py-0.5 rounded-md uppercase tracking-widest text-[8px]">Aprovado</Badge>
                            ) : selectedReport.status === DailyReportStatus.RETURNED ? (
                              <Badge className="bg-red-500 text-white font-black px-2 py-0.5 rounded-md uppercase tracking-widest text-[8px]">Devolvido</Badge>
                            ) : (
                              <Badge className="bg-amber-500 text-white font-black px-2 py-0.5 rounded-md uppercase tracking-widest text-[8px]">Pendente</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-primary" />
                       <div className="flex flex-col items-start">
                         <span className="text-[8px] uppercase text-muted-foreground/50 font-black tracking-widest">Data do Relatório</span>
                         <span className="text-sm font-bold text-white tracking-tight">
                           {safeFormatDate(selectedReport.reportDate, "dd 'de' MMMM, yyyy", { locale: ptBR }).toUpperCase()}
                         </span>
                       </div>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2">
                       <Users className="w-4 h-4 text-primary" />
                       <div className="flex flex-col items-start">
                         <span className="text-[8px] uppercase text-muted-foreground/50 font-black tracking-widest">Equipe Executora</span>
                         <span className="text-sm font-bold text-white tracking-tight">{getTeamName(selectedReport.teamId, selectedReport.teamName).toUpperCase()}</span>
                       </div>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-white/40" />
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] uppercase text-muted-foreground/50 font-black tracking-widest">Supervisão</span>
                        <span className="text-sm font-black text-white tracking-tight">{getReporterName(selectedReport.createdBy).toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] uppercase text-muted-foreground/50 font-black tracking-widest">Responsável</span>
                        <span className="text-sm font-black text-white tracking-tight">{getReporterName(selectedReport.employeeId || (selectedReport as any).userId).toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] uppercase text-muted-foreground/50 font-black tracking-widest">RDO Numero</span>
                        <span className="text-sm font-black text-white tracking-tight">{selectedReport.rdoNumber || `RDO-${selectedReport.id.slice(-5).toUpperCase()}`}</span>
                      </div>
                    </div>

                    <div className="w-px h-8 bg-white/10 hidden md:block" />

                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-start">
                        <span className="text-[8px] uppercase text-muted-foreground/50 font-black tracking-widest">Revisão</span>
                        <span className="text-sm font-black text-white tracking-tight">{selectedReport.revision || `00`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conteúdo Scrollável */}
              <ScrollArea className="flex-4">
                <div className="p-0 max-w-9/10 mx-auto w-full space-y-8 pb-32">

                  {/* SEÇÃO: CONDIÇÕES CLIMÁTICAS */}
                  {selectedReport.weather && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 pl-2 flex items-center gap-2">
                        <CloudSun className="w-4 h-4" /> Condições Climáticas
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {['morning', 'afternoon', 'night'].map((period) => {
                          const status = selectedReport.weather[period];
                          const label = period === 'morning' ? 'Manhã' : period === 'afternoon' ? 'Tarde' : 'Noite';
                          return (
                            <div key={period} className="bg-white/5 p-4 rounded-3xl border border-white/5 flex items-center justify-between">
                              <span className="text-xs font-bold uppercase text-muted-foreground">{label}</span>
                              <Badge className={cn(
                                "font-black text-[10px] text-shadow-primary-foreground px-3 py-1 rounded-lg uppercase",
                                status === 'GOOD' ? 'bg-green-600' : status === 'RAIN' ? 'bg-blue-600' : 'bg-red-600'
                              )}>
                                {status === 'GOOD' ? 'BOM' : status === 'RAIN' ? 'CHUVA' : 'IMPRATICÁVEL'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ATIVIDADES DETALHADAS */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 pl-2">Produção Logada no Campo</h3>
                    
                    <div className="grid grid-cols-1 gap-8">
                      {selectedReport.selectedActivities && selectedReport.selectedActivities.length > 0 ? (
                        selectedReport.selectedActivities.map((act: any, idx: number) => (
                          <div key={idx} className="bg-white/5 rounded-4xl border border-white/10 overflow-hidden shadow-2xl transition-all h-full">
                            <div className="bg-primary/5 p-6 border-b border-white/5 flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-black text-white shadow-lg shadow-primary/20 text-xl">
                                  {idx + 1}
                                </div>
                                <div>
                                  <h4 className="font-black text-xl tracking-tight text-white uppercase">{act.stageName}</h4>
                                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase opacity-60">
                                    <MapPin className="w-3 h-3" /> {act.subPointType}: {act.subPoint}
                                  </div>
                                </div>
                              </div>
                              <Badge className={cn(
                                "font-black text-[10px] px-4 py-1.5 rounded-full uppercase tracking-widest",
                                act.status === 'FINISHED' ? 'bg-green-500/20 text-green-500 border border-green-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              )}>
                                {act.status === 'FINISHED' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}
                              </Badge>
                            </div>
                            
                             <div className="p-8 space-y-8">
                               {act.observations && (
                                 <div className="p-6 bg-black/40 rounded-3xl border-l-4 border-primary italic text-base text-muted-foreground leading-relaxed">
                                   "{act.observations}"
                                 </div>
                               )}

                               {/* FOTOS DA ATIVIDADE E ELEMENTOS */}
                               {(() => {
                                 const allPhotos: any[] = [];
                                 let docCounter = 1;

                                 if (act.photos && act.photos.length > 0) {
                                   allPhotos.push(...act.photos.map((p: any) => ({ ...p, source: 'Geral', displayLabel: `DOC: ${String(docCounter++).padStart(3, '0')}` })));
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
                                   <div className="space-y-6 pt-4">
                                     <div className="flex items-center gap-3 border-b border-primary/20 pb-4">
                                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                                          <Camera className="w-4 h-4 text-primary" />
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-widest text-white/90">Registro Fotográfico</h4>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {allPhotos.map((photo: any, pIdx: number) => {
                                          let displayUrl = photo.url || photo.uri;
                                          
                                          // Se for uma URL absoluta do GCS, reescrevemos para passar pelo nosso Proxy Seguro
                                          if (displayUrl && displayUrl.includes('storage.googleapis.com')) {
                                              try {
                                                  const urlObj = new URL(displayUrl);
                                                  // O pathname normal é /nome-do-bucket/caminho/do/arquivo
                                                  // Vamos extrair apenas o caminho do arquivo
                                                  const pathParts = urlObj.pathname.split('/').filter(Boolean);
                                                  if (pathParts.length > 1) {
                                                      const bucketName = pathParts.shift(); // Remove o nome do bucket
                                                      const filePath = pathParts.join('/');
                                                      displayUrl = `/api/v1/storage/gcs?path=${encodeURIComponent(filePath)}`;
                                                  }
                                              } catch(e) {}
                                          } else if (displayUrl && displayUrl.startsWith('/api/v1/storage/gcs')) {
                                              // Se já for proxy, garantimos que a rota base da API seja usada sem conflitos de CORS, 
                                              // o Vite e o Nginx resolvem rotas relativas perfeitamente.
                                              displayUrl = displayUrl; 
                                          }

                                          return (
                                          <div key={pIdx} className="group flex flex-col glass-card border-white/5 bg-black/40 rounded-3xl overflow-hidden hover:border-primary/50 transition-all cursor-zoom-in" onClick={() => setSelectedPhoto(displayUrl)}>
                                            <div className="relative w-full aspect-4/3 bg-[#0A0A0B]/80 overflow-hidden ring-1 ring-white/10 rounded-t-3xl">
                                              <img src={displayUrl} alt={`Foto ${photo.source}`} className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700 ease-out" />
                                              <div className="absolute top-3 left-3 bg-black/90 backdrop-blur-md text-[9px] font-black uppercase text-primary px-2.5 py-1 rounded-md border border-primary/20 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.3)]">
                                                {photo.source === 'Geral' ? photo.displayLabel : `ID: ${photo.source}`}
                                              </div>
                                            </div>
                                            {photo.comment && (
                                              <div className="p-4 bg-white/5 border-t border-white/5 flex-1 flex items-start gap-3">
                                                <MessageSquare className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                                                <p className="text-xs font-medium text-white/80 leading-relaxed italic">
                                                  "{photo.comment}"
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                     </div>
                                   </div>
                                 );
                               })()}
                               
                               {act.details && act.details.length > 0 && (
                                 <div className="space-y-6 pt-8">
                                   <div className="flex items-center gap-3 border-b border-primary/20 pb-4">
                                      <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                      </div>
                                      <h4 className="text-sm font-black uppercase tracking-widest text-white/90">Status da Produção</h4>
                                   </div>
                                   <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/2 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                                    <Table className="border-collapse">
                                         <TableHeader className="bg-black/40">
                                           <TableRow className="border-white/5 h-14">
                                             <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/80 pl-8">Elemento</TableHead>
                                             <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/80 text-center">U.N</TableHead>
                                             <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/80 text-center">Previsto</TableHead>
                                             <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/80 text-center">Executado</TableHead>
                                             <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/80 text-center">Acumulado</TableHead>
                                             <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/80 text-center">Progresso</TableHead>
                                             <TableHead className="font-black uppercase text-[10px] tracking-widest text-primary/80 px-6">Observações</TableHead>
                                           </TableRow>
                                         </TableHeader>
                                         <TableBody>
                                           {act.details.slice(0, 100).map((d: any, di: number) => {
                                             const actualProgress = d.status === ActivityStatus.FINISHED ? 100 : d.status === ActivityStatus.BLOCKED ? 0 : (d.progress || 0);
                                             const executed = (actualProgress / 100).toFixed(1);
                                             const acumulado = ((d.previousProgress || 0) + actualProgress) / 100;

                                             return (
                                               <TableRow key={`${act.id}-${d.id}-${di}`} className="border-white/5 hover:bg-white/5 transition-colors h-16 bg-black/20">
                                                 <TableCell className="font-black text-white px-8 text-sm">{d.id}</TableCell>
                                                 <TableCell className="text-center text-[11px] font-bold text-muted-foreground uppercase">{act.subPointType === 'TORRE' ? 'UN' : 'KM'}</TableCell>
                                                 <TableCell className="text-center font-mono text-xs text-white/40">1.0</TableCell>
                                                 <TableCell className="text-center">
                                                    <span className="font-black text-primary text-base">{executed}</span>
                                                 </TableCell>
                                                 <TableCell className="text-center font-mono text-xs text-primary/40">{acumulado > 0 ? acumulado.toFixed(1) : '---'}</TableCell>
                                                 <TableCell className="text-center">
                                                   <Badge variant="outline" className={cn(
                                                     "font-black text-[10px] px-3 py-1 uppercase tracking-widest shadow-lg",
                                                     d.status === ActivityStatus.FINISHED ? 'border-green-500/50 text-green-400 bg-green-500/10 shadow-green-500/10' : 
                                                     d.status === ActivityStatus.BLOCKED ? 'border-red-500/50 text-red-400 bg-red-500/10 shadow-red-500/10' : 
                                                     'border-amber-500/50 text-amber-400 bg-amber-500/10 shadow-amber-500/10'
                                                   )}>
                                                     {d.status === ActivityStatus.BLOCKED ? 'SEM ATIVIDADE' : `${actualProgress}%`}
                                                   </Badge>
                                                 </TableCell>
                                               <TableCell className="px-6 py-4">
                                                  <div className="flex flex-col gap-4">
                                                    {d.comment && (
                                                      <span className="text-[11px] font-medium text-white/70 bg-black/40 px-3 py-2 rounded-xl block max-w-sm border border-white/5">
                                                        {d.comment}
                                                      </span>
                                                    )}
                                                  </div>
                                               </TableCell>
                                             </TableRow>
                                           );
                                           })}
                                           {act.details.length > 100 && (
                                             <TableRow className="border-white/5 bg-primary/10">
                                               <TableCell colSpan={7} className="text-center py-6">
                                                 <p className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center justify-center gap-2">
                                                   <Info className="w-4 h-4" />
                                                   Exibindo 100 de {act.details.length} itens limitados no navegador. Baixe o PDF A4 completo para ver todos os dados.
                                                 </p>
                                               </TableCell>
                                             </TableRow>
                                           )}
                                         </TableBody>
                                      </Table>
                                   </div>
                                 </div>
                               )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white/5 rounded-4xl border border-white/10 p-12">
                           <p className="text-xl whitespace-pre-wrap text-muted-foreground italic tracking-tight font-medium leading-relaxed">
                              {selectedReport.activities}
                           </p>
                        </div>
                       )}
                   </div>
                  </div>

                  {/* SEÇÃO: RECURSOS (EFETIVO E EQUIPAMENTOS) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* EFETIVO */}
                      <div className="space-y-4">
                        <div
                          className="flex items-center justify-between group/header cursor-pointer select-none pl-2"
                          onClick={() => setShowManpower(!showManpower)}
                        >
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 flex items-center gap-2 group-hover/header:text-primary transition-colors">
                            <Users className="w-4 h-4" /> Quadro de Efetivo
                          </h3>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/40 group-hover/header:text-primary">
                            {showManpower ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                         {showManpower && (
                           <div className="bg-white/5 rounded-4xl border border-white/10 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                            <Table>
                              <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5">
                                  <TableHead className="text-[10px] font-black uppercase py-4 pl-6">Matrícula</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase py-4">Nome do Colaborador</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase py-4">Função / Cargo</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedReport.manpower && selectedReport.manpower.length > 0 ? (
                                  selectedReport.manpower.map((m: any, idx: number) => (
                                    <TableRow key={idx} className="border-white/5">
                                      <TableCell className="pl-6 font-mono text-xs text-primary/60">{m.registration || "---"}</TableCell>
                                      <TableCell className="font-bold text-sm text-white uppercase">{m.name || "---"}</TableCell>
                                      <TableCell className="font-bold text-xs text-muted-foreground uppercase">{m.role}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs italic">Nenhum dado informado</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                         </div>
                         )}
                      </div>

                      {/* EQUIPAMENTOS */}
                      <div className="space-y-4">
                        <div
                          className="flex items-center justify-between group/header cursor-pointer select-none pl-2"
                          onClick={() => setShowEquipment(!showEquipment)}
                        >
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 flex items-center gap-2 group-hover/header:text-primary transition-colors">
                            <Truck className="w-4 h-4" /> Quadro de Equipamentos
                          </h3>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/40 group-hover/header:text-primary">
                            {showEquipment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                         {showEquipment && (
                           <div className="bg-white/5 rounded-4xl border border-white/10 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                            <Table>
                              <TableHeader className="bg-white/5">
                                <TableRow className="border-white/5">
                                  <TableHead className="text-[10px] font-black uppercase py-4 pl-6">Tipo / Equipamento</TableHead>
                                  <TableHead className="text-[10px] font-black py-4 uppercase">Modelo</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase py-4">Placa / ID</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase py-4">Motorista / Operador</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {selectedReport.equipment && selectedReport.equipment.length > 0 ? (
                                  selectedReport.equipment.map((e: any, idx: number) => (
                                    <TableRow key={idx} className="border-white/5">
                                      <TableCell className="pl-6 font-bold text-sm text-white uppercase">{e.equipment}</TableCell>
                                      <TableCell className="font-bold text-xs text-muted-foreground uppercase">{e.model || "---"}</TableCell>
                                      <TableCell className="font-mono text-xs text-primary/60 uppercase">{e.plate || "---"}</TableCell>
                                      <TableCell className="font-bold text-xs text-white/80 uppercase">{e.driverName || "---"}</TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs italic">Nenhum dado informado</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          )}
                       </div>
                   </div>

                  {selectedReport.observations && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 pl-2">Observações Gerais do Relatório</h3>
                      <div className="bg-amber-500/5 rounded-4xl border border-amber-500/10 p-10 text-lg text-amber-200/70 italic leading-loose shadow-xl">
                        {selectedReport.observations}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Botões de Ação Fixos no Rodapé */}
              <div className="p-4 bg-[#0a0a0b]/80 border-t border-white/10 flex flex-col sm:flex-row gap-4 justify-between backdrop-blur-2xl shrink-0">
                 <Button
                    variant="ghost"
                    className="h-10 px-10 rounded-2xl border border-white/10 font-black uppercase transition-all hover:bg-white/10 text-white/50 hover:text-white"
                    onClick={() => setSelectedReport(null)}
                    disabled={isProcessing}
                 >
                   Fechar Visualização
                 </Button>
                 
                 <div className="flex gap-4">
                     <Button
                        variant="outline"
                        className="h-10 px-8 rounded-2xl font-black uppercase tracking-widest text-xs border-primary/20 text-primary hover:bg-primary/10 transition-all"
                        onClick={() => window.print()}
                        disabled={isProcessing}
                     >
                        <Printer className="w-4 h-4 mr-2" /> Imprimir
                     </Button>
                     <Button
                        variant="destructive"
                        className="h-10 px-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_40px_rgba(239,68,68,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all bg-red-600 hover:bg-red-500 border-none"
                        onClick={() => setIsRejectDialogOpen(true)}
                        disabled={isProcessing}
                    >
                      <X className="w-4 h-4 mr-2" /> Devolver / Rejeitar
                    </Button>
                    <Button
                        className="h-10 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-linear-to-br from-primary to-primary/80 text-white shadow-[0_10px_40px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all border-none"
                        onClick={handleApprove}
                        disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                           <Loader2 className="w-5 h-5 animate-spin" />
                           Processando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                           <CheckCircle2 className="w-5 h-5" /> Aprovar Relatório
                        </div>
                      )}
                    </Button>
                 </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG DE REJEIÇÃO */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md bg-[#0c0c0e] border-red-500/30 rounded-4xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-red-500 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" /> Devolver Relatório
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold">
              Descreva o motivo da devolução para que o encarregado possa corrigir os dados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
             <Textarea
                placeholder="Ex: A torre T045 não foi concluída conforme relatado..."
                className="min-h-[150px] bg-red-500/5 border-red-500/20 rounded-2xl focus:ring-red-500/30 text-white placeholder:text-muted-foreground/30 p-4"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
             />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="px-6 h-12 rounded-xl border border-white/5 uppercase font-bold text-xs"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12 rounded-xl uppercase font-black text-xs tracking-widest shadow-lg shadow-red-500/10"
              onClick={selectedIds.size > 0 ? handleBulkReject : handleReject}
              disabled={isProcessing || isBulkProcessing || !rejectionReason.trim()}
            >
              {isProcessing || isBulkProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirmar Devolução"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog para Expandir Foto */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none [&>button]:text-white [&>button]:bg-black/50 [&>button]:hover:bg-black [&>button]:w-10 [&>button]:h-10 [&>button]:rounded-full [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:top-4 [&>button]:right-4">
          <DialogTitle className="sr-only">Visualização de Foto Expandida</DialogTitle>
          <DialogDescription className="sr-only">Imagem em alta resolução anexada ao relatório</DialogDescription>
          {selectedPhoto && (
            <div className="relative w-full h-[85vh] flex items-center justify-center">
              <img src={selectedPhoto} alt="Foto Expandida" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
