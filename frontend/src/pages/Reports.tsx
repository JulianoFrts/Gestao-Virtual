import React, { useState, useMemo } from 'react';
import { useDailyReports, DailyReport, ActivityStatus } from '@/hooks/useDailyReports';
import { useTeams } from '@/hooks/useTeams';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Filter, Search, Eye, Calendar, User, Users as UsersIcon, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports() {
  const { reports, isLoading } = useDailyReports();
  const { teams } = useTeams();
  const { users } = useUsers();

  const [filterDate, setFilterDate] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(
    null,
  );

  // Helper for safe date formatting to prevent "Invalid time value" crashes
  const safeFormatDate = (date: any, formatStr: string, options?: any) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Data inválida";
      return format(d, formatStr, options);
    } catch (e) {
      console.error("[Reports] Error formatting date:", date, e);
      return "Erro na data";
    }
  };

  // Filter reports using useMemo for performance and stability
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Date filter
      let matchesDate = true;
      if (filterDate) {
        try {
          const reportDateStr = new Date(report.reportDate)
            .toISOString()
            .split("T")[0];
          matchesDate = reportDateStr === filterDate;
        } catch (e) {
          matchesDate = false;
        }
      }

      // Team filter
      const matchesTeam =
        filterTeam !== "all" ? report.teamId === filterTeam : true;

      // User filter
      const matchesUser =
        filterUser !== "all" ? report.createdBy === filterUser : true;

      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm
        ? (report.activities || "").toLowerCase().includes(searchLower) ||
          (report.observations &&
            report.observations.toLowerCase().includes(searchLower))
        : true;

      return matchesDate && matchesTeam && matchesUser && matchesSearch;
    });
  }, [reports, filterDate, filterTeam, filterUser, searchTerm]);

  const getReporterName = (userId: string | null) => {
    if (!userId) return "Desconhecido";
    const user = users.find((u) => u.id === userId);
    return user ? user.fullName : "Usuário não encontrado";
  };

  const getTeamName = (teamId: string, teamName?: string) => {
    if (teamName) return teamName;
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : "Equipe não encontrada";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center glass-card p-4 rounded-xl">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Data
            </label>
            <Input
              type="date"
              className="industrial-input"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <UsersIcon className="w-3 h-3" /> Equipe
            </label>
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="industrial-input">
                <SelectValue placeholder="Todas as equipes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as equipes</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Autor
            </label>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="industrial-input">
                <SelectValue placeholder="Todos os autores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os autores</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Search className="w-3 h-3" /> Busca
            </label>
            <Input
              placeholder="Buscar no conteúdo..."
              className="industrial-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-end pt-2 md:pt-0">
          <Button
            variant="outline"
            onClick={() => {
              setFilterDate("");
              setFilterTeam("all");
              setFilterUser("all");
              setSearchTerm("");
            }}
            className="hover:text-primary transition-all"
            title="Limpar filtros"
          >
            <Filter className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Histórico de Relatórios</CardTitle>
          <CardDescription>
            Mostrando {filteredReports.length} registro(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Atividades</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando relatórios...
                    </TableCell>
                  </TableRow>
                ) : filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum relatório encontrado com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report, index) => (
                    <TableRow
                      key={`report-${report.id || report.localId}-${index}`}
                    >
                      <TableCell>
                        {safeFormatDate(report.reportDate, "dd 'de' MMMM", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getTeamName(report.teamId, report.teamName)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {getReporterName(report.createdBy).charAt(0)}
                          </div>
                          <span className="text-sm">
                            {getReporterName(report.createdBy)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {report.selectedActivities && report.selectedActivities.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {report.selectedActivities.slice(0, 3).map((act: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-bold border-primary/20 text-primary/80">
                                {act.stageName || 'Atividade'}
                                {act.subPoint && <span className="text-muted-foreground ml-1">({act.subPoint})</span>}
                              </Badge>
                            ))}
                            {report.selectedActivities.length > 3 && (
                              <Badge variant="outline" className="text-[10px] font-bold border-muted-foreground/20">
                                +{report.selectedActivities.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <p className="truncate text-sm text-muted-foreground">
                            {report.activities}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:text-primary transition-all"
                          onClick={() => setSelectedReport(report)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Relatório</DialogTitle>
            <DialogDescription>
              Enviado em{" "}
              {selectedReport &&
                safeFormatDate(
                  selectedReport.createdAt,
                  "dd/MM/yyyy 'às' HH:mm",
                )}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Data de Referência
                  </label>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {safeFormatDate(
                      selectedReport.reportDate,
                      "dd 'de' MMMM, yyyy",
                      { locale: ptBR },
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Equipe
                  </label>
                  <p className="font-medium flex items-center gap-2">
                    <UsersIcon className="w-4 h-4 text-primary" />
                    {getTeamName(
                      selectedReport.teamId,
                      selectedReport.teamName,
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Enviado por
                  </label>
                  <p className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    {getReporterName(selectedReport.createdBy)}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Status de Sincronização
                  </label>
                  <p
                    className={`font-medium text-sm flex items-center gap-2 ${selectedReport.syncedAt ? "text-green-600" : "text-amber-600"}`}
                  >
                    {selectedReport.syncedAt
                      ? "Sincronizado"
                      : "Pendente de envio"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Atividades
                  Realizadas
                </label>

                {selectedReport.selectedActivities && selectedReport.selectedActivities.length > 0 ? (
                  <div className="space-y-4">
                    {selectedReport.selectedActivities.map((act: any, actIdx: number) => (
                      <div key={actIdx} className="p-3 bg-background/50 rounded-lg border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
                            {act.stageName || 'Atividade'}
                          </Badge>
                          {act.subPoint && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {act.subPointType}: {act.subPoint}
                              {act.isMultiSelection && act.subPointEnd && ` → ${act.subPointEnd}`}
                            </span>
                          )}
                          <Badge variant="outline" className={`text-[10px] font-bold ml-auto ${
                            act.status === ActivityStatus.FINISHED 
                              ? 'border-green-500/30 text-green-500' 
                              : 'border-amber-500/30 text-amber-500'
                          }`}>
                            {act.status === ActivityStatus.FINISHED ? 'CONCLUÍDO' : 'ANDAMENTO'}
                          </Badge>
                        </div>

                        {act.observations && (
                          <p className="text-xs text-muted-foreground italic mb-2 pl-2 border-l-2 border-primary/20">
                            "{act.observations}"
                          </p>
                        )}

                        {act.details && act.details.length > 0 && (
                          <div className="rounded-md border text-xs">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  <th className="p-2 text-left font-bold text-muted-foreground">Item</th>
                                  <th className="p-2 text-center font-bold text-muted-foreground">Início</th>
                                  <th className="p-2 text-center font-bold text-muted-foreground">Fim</th>
                                  <th className="p-2 text-center font-bold text-muted-foreground">Status</th>
                                  <th className="p-2 text-left font-bold text-muted-foreground">Obs</th>
                                </tr>
                              </thead>
                              <tbody>
                                {act.details.map((d: any, dIdx: number) => (
                                  <tr key={dIdx} className="border-b last:border-0">
                                    <td className="p-2 font-bold">{d.id}</td>
                                    <td className="p-2 text-center">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-amber-500" />
                                        {d.startTime || '--:--'}
                                      </span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-primary" />
                                        {d.endTime || '--:--'}
                                      </span>
                                    </td>
                                    <td className="p-2 text-center">
                                      <Badge variant="outline" className={`text-[9px] font-bold ${
                                        d.status === ActivityStatus.FINISHED ? 'border-green-500/30 text-green-500' :
                                        d.status === ActivityStatus.BLOCKED ? 'border-red-500/30 text-red-500' :
                                        'border-amber-500/30 text-amber-500'
                                      }`}>
                                        {d.status === ActivityStatus.FINISHED ? 'CONCLUÍDO' :
                                         d.status === ActivityStatus.BLOCKED ? 'PARADO' :
                                         `AND. ${d.progress || 0}%`}
                                      </Badge>
                                    </td>
                                    <td className="p-2 text-muted-foreground italic">{d.comment || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedReport.activities}
                  </p>
                )}
              </div>

              {selectedReport.observations && (
                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                  <label className="text-sm font-medium">Observações</label>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {selectedReport.observations}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
