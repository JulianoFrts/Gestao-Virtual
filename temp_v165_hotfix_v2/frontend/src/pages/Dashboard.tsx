import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Users,
    Clock,
    FileText,
    TrendingUp,
    ArrowRight,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useTeams } from '@/hooks/useTeams';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { useDailyReports } from '@/hooks/useDailyReports';
import { isProtectedSignal, can } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";

export default function Dashboard() {
  useSignals();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { employees, isLoading: loadingEmployees } = useEmployees();
  const { teams, isLoading: loadingTeams } = useTeams();
  const {
    records,
    getTodayRecords,
    isLoading: loadingRecords,
  } = useTimeRecords();
  const { getTodayReports, isLoading: loadingReports } = useDailyReports();

  const isDashboardLoading =
    loadingEmployees || loadingTeams || loadingRecords || loadingReports;

  const displayName =
    profile?.fullName || user?.email?.split("@")[0] || "Usuário";
  const activeEmployees = (employees || []).filter((e) => e.isActive).length;
  const activeTeams = (teams || []).filter((t) => t.isActive).length;
  const todayRecords = getTodayRecords ? getTodayRecords().length : 0;
  const todayReports = getTodayReports ? getTodayReports().length : 0;

  const stats = [
    {
      title: "Funcionários Ativos",
      value: activeEmployees,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Equipes Ativas",
      value: activeTeams,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Registros Hoje",
      value: todayRecords,
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Relatórios Hoje",
      value: todayReports,
      icon: FileText,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];

  const quickActions = [
    { label: "Registrar Ponto", path: "/time-clock", icon: Clock },
    { label: "Novo Relatório", path: "/daily-report", icon: FileText },
    { label: "Gerenciar Equipes", path: "/teams", icon: Users },
  ];

  const isAdmin = isProtectedSignal.value || can("system.is_corporate");
  const filteredQuickActions = quickActions.filter((action) => {
    if (action.path === "/daily-report") {
      return isAdmin; // Simplificado para o exemplo
    }
    return true;
  });

  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">
            Olá, {displayName.split(" ")[0]}! 👋
          </h1> 
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo do seu dia
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="glass-card hover-lift hover:shadow-strong transition-all"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 sm:p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`}
                  />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {stat.title}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            <CardDescription>Acesse as funções mais usadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredQuickActions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                className="w-full justify-between h-12 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all shadow-sm group"
                onClick={() => navigate(action.path)}
              >
                <span className="flex items-center gap-3">
                  <action.icon className="w-5 h-5 text-primary" />
                  {action.label}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Atividade Recente</CardTitle>
            <CardDescription>Últimos registros e ações</CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma atividade registrada ainda</p>
                <p className="text-sm mt-1">
                  Comece registrando um ponto ou relatório
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {records.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-full ${
                        record.recordType === "entry"
                          ? "bg-success/20"
                          : "bg-primary/20"
                      }`}
                    >
                      {record.recordType === "entry" ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {record.employeeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.recordType === "entry" ? "Entrada" : "Saída"} -{" "}
                        {(() => {
                           try {
                             const date = new Date(record.recordedAt);
                             if (isNaN(date.getTime())) return "Data Inválida";
                             return date.toLocaleTimeString("pt-BR", {
                               hour: "2-digit",
                               minute: "2-digit",
                             });
                           } catch (e) {
                             return "Erro data";
                           }
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Progresso do Dia</CardTitle>
          <CardDescription>Acompanhe as metas diárias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Registros de Ponto</span>
              <span className="text-muted-foreground">
                {todayRecords} / {activeEmployees * 2} esperados
              </span>
            </div>
            <Progress
              value={
                activeEmployees > 0
                  ? (todayRecords / (activeEmployees * 2)) * 100
                  : 0
              }
              className="h-2"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Relatórios Diários</span>
              <span className="text-muted-foreground">
                {todayReports} / {activeTeams} equipes
              </span>
            </div>
            <Progress
              value={activeTeams > 0 ? (todayReports / activeTeams) * 100 : 0}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
