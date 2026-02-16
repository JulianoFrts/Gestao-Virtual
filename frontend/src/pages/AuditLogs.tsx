import React, { useState, useMemo, useEffect } from "react";
import { useAuditLogs, AuditLog } from "@/hooks/useAuditLogs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Search,
  Eye,
  User,
  Calendar as CalendarIcon,
  Database,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  HardHat,
  Zap,
  Link,
  Info,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, formatNameForLGPD } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GAPOValidationList from "@/components/gapo/GAPOValidationList";
import { useAuth } from "@/contexts/AuthContext";
import { isProtectedSignal, can } from "@/signals/authSignals";
import { orionApi } from "@/integrations/orion/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "react-day-picker";

import { useSearchParams } from "react-router-dom";

export default function AuditLogs() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "audit";

  const isGod = isProtectedSignal.value || can("system.is_corporate");
  const {
    data: logs = [],
    isLoading,
    refetch: refetchLogs,
  } = useAuditLogs(isGod ? undefined : (profile as any)?.companyId);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Estados para Auditoria Arquitetural
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any[]>([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [selectedAuditResult, setSelectedAuditResult] = useState<any | null>(
    null,
  );
  const [auditSortConfig, setAuditSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>({ key: "lastDetectedAt", direction: "desc" });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);


  // Estados para Health Score
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [bySeverity, setBySeverity] = useState<{
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  } | null>(null);
  const [topIssues, setTopIssues] = useState<string[]>([]);

  // Estados para Streaming em Tempo Real
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamLogs, setStreamLogs] = useState<
    Array<{ type: string; data: any }>
  >([]);
  const [streamProgress, setStreamProgress] = useState(0);

  // Estados para Teste de Rotas
  const [isTestingRoutes, setIsTestingRoutes] = useState(false);
  const [routeResults, setRouteResults] = useState<any[]>([]);
  const [routeSearchTerm, setRouteSearchTerm] = useState("");
  const [selectedRouteResult, setSelectedRouteResult] = useState<any | null>(
    null,
  );
  const [routeSortConfig, setRouteSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Novos estados para visualização modernizada
  const [streamViewMode, setStreamViewMode] = useState<"terminal" | "table">("table");

  const handleSortAudit = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      auditSortConfig &&
      auditSortConfig.key === key &&
      auditSortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setAuditSortConfig({ key, direction });
  };

  const handleSortRoutes = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (
      routeSortConfig &&
      routeSortConfig.key === key &&
      routeSortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setRouteSortConfig({ key, direction });
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const generateMarkdownReport = () => {
    const violations = streamLogs.filter((l) => l.type === "violation");
    if (violations.length === 0) return "Nenhuma violação encontrada.";

    let md = "# Relatório de Auditoria Orion\n\n";
    md += "| N° | Severidade | Arquivo | Violação | Sugestão |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";
    violations.forEach((v) => {
      md += `| ${v.data.index} | ${v.data.severity} | ${v.data.file} | ${v.data.violation} | ${v.data.suggestion || '-'} |\n`;
    });
    return md;
  };

  const generateCSVReport = (data: any[]) => {
    if (data.length === 0) return "";
    const headers = ["N", "Severidade", "Arquivo", "Violacao", "Sugestao"];
    const rows = data.map((v, i) => [
      i + 1,
      v.severity || v.data?.severity,
      v.file || v.data?.file,
      v.violation || v.data?.violation,
      v.suggestion || v.data?.suggestion || ""
    ]);
    return [headers, ...rows].map(row => row.join("\t")).join("\n");
  };

  const SortIcon = ({
    config,
    columnKey,
  }: {
    config: any;
    columnKey: string;
  }) => {
    if (!config || config.key !== columnKey)
      return <RefreshCw className="w-3 h-3 opacity-20" />;
    return config.direction === "asc" ? (
      <ArrowRight className="w-3 h-3 -rotate-90 text-primary" />
    ) : (
      <ArrowRight className="w-3 h-3 rotate-90 text-primary" />
    );
  };

  const isValidDate = (date: any) => {
    if (!date) return false;
    try {
      const d = new Date(date);
      return (
        d instanceof Date && !isNaN(d.getTime()) && d.getFullYear() > 1900
      );
    } catch {
      return false;
    }
  };

  const safeFormat = (date: any, formatStr: string, options?: any) => {
    if (!isValidDate(date)) return "--";
    try {
      return format(new Date(date), formatStr, options);
    } catch {
      return "--";
    }
  };

  // Carregar histórico inicial
  // Carregar histórico inicial de rotas
  useEffect(() => {
    const fetchRouteHistory = async () => {
      try {
        // Buscar histórico de rotas
        const routeResp = await (orionApi.get(
          "/testing/routes",
        ) as Promise<any>);
        const routeData = routeResp.data?.data || routeResp.data || [];
        setRouteResults(Array.isArray(routeData) ? routeData : []);
      } catch (error) {
        console.error("Erro ao carregar histórico de rotas:", error);
      }
    };

    fetchRouteHistory();
  }, []);

  // Fetch Audit History with Filters
  const fetchAuditHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange?.from)
        params.append("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());

      const auditResp = await (orionApi.get(
        `/audit/architectural?${params.toString()}`,
      ) as Promise<any>);
      const auditData = auditResp.data?.data || auditResp.data || [];
      setAuditResults(Array.isArray(auditData) ? auditData : []);
    } catch (error) {
      console.error("Erro ao carregar histórico de auditoria:", error);
      toast.error("Falha ao atualizar filtros de auditoria.");
    }
  };

  // Trigger fetch on date range change
  useEffect(() => {
    fetchAuditHistory();
  }, [dateRange]);

  const handleRunArchitecturalAudit = async () => {
    setIsAuditing(true);
    try {
      const response = await (orionApi.post(
        "/audit/architectural",
      ) as Promise<any>);
      const data = response.data?.data || response.data || {};

      // Novo formato: { violations, healthScore, bySeverity, topIssues }
      const violations = data.violations || data || [];
      setAuditResults(Array.isArray(violations) ? violations : []);

      // Atualizar Health Score se disponível
      if (typeof data.healthScore === "number") {
        setHealthScore(data.healthScore);
      }
      if (data.bySeverity) {
        setBySeverity(data.bySeverity);
      }
      if (data.topIssues) {
        setTopIssues(data.topIssues);
      }

      toast.success(
        `Auditoria concluída! Health Score: ${data.healthScore ?? "--"}`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao executar auditoria.");
    } finally {
      setIsAuditing(false);
    }
  };

  // Handler para scan com streaming em tempo real via SSE
  const handleRunStreamingScan = async () => {
    setIsStreaming(true);
    setStreamLogs([]);
    setStreamProgress(0);

    try {
      // O token é armazenado como 'token' ou 'orion_token' no projeto
      const token =
        localStorage.getItem("token") || localStorage.getItem("orion_token");

      // DEBUG: Verificar se token existe
      console.log(
        "[SSE] Token presente?",
        !!token,
        token ? `${token.substring(0, 20)}...` : "null",
      );

      if (!token) {
        toast.error(
          "Token de autenticação não encontrado. Faça login novamente.",
        );
        setIsStreaming(false);
        return;
      }

      // SSE requer URL absoluta (EventSource não funciona com proxy Vite)
      // VITE_API_URL pode ser relativa ("/api/v1"), então forçamos URL absoluta
      const envUrl = import.meta.env.VITE_API_URL || "/api/v1";
      const backendUrl = envUrl.startsWith("http")
        ? envUrl
        : `${window.location.origin}${envUrl.startsWith("/") ? "" : "/"}${envUrl}`;
      const sseUrl = `${backendUrl}/audit/scan-stream?token=${encodeURIComponent(token)}`;
      console.log("[SSE] URL FINAL:", sseUrl);

      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStreamLogs((prev) => [...prev, { type: data.type, data }]);

          if (data.type === "violation" && data.total) {
            setStreamProgress(Math.round((data.index / data.total) * 100));
          }

          if (data.type === "complete") {
            setHealthScore(data.healthScore);
            setBySeverity(data.bySeverity);
            setTopIssues(data.topIssues || []);
            setStreamProgress(100);
            eventSource.close();
            setIsStreaming(false);
            toast.success(`Scan completo! Health Score: ${data.healthScore}`);
            // Recarregar lista de violações
            fetchAuditHistory();
          }

          if (data.type === "error") {
            toast.error(data.message);
            eventSource.close();
            setIsStreaming(false);
          }
        } catch (e) {
          console.error("Erro ao parsear SSE:", e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsStreaming(false);
        toast.error("Conexão com o servidor perdida.");
      };
    } catch (error) {
      console.error(error);
      toast.error("Erro ao iniciar streaming.");
      setIsStreaming(false);
    }
  };

  const handleRunRouteTests = async () => {
    setIsTestingRoutes(true);
    try {
      const response = await (orionApi.get("/testing/routes") as Promise<any>);
      const results =
        response.data?.data ||
        response.data ||
        (Array.isArray(response) ? response : []);
      setRouteResults(Array.isArray(results) ? results : []);
      toast.success("Teste de rotas concluído!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao testar rotas.");
    } finally {
      setIsTestingRoutes(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (log.table_name?.toLowerCase() || "").includes(searchLower) ||
        (log.performer_name?.toLowerCase() || "").includes(searchLower) ||
        (log.action?.toLowerCase() || "").includes(searchLower) ||
        (log.record_id?.toLowerCase() || "").includes(searchLower)
      );
    });
  }, [logs, searchTerm]);

  const filteredAuditResults = useMemo(() => {
    const filtered = auditResults.filter((res) => {
      const searchLower = auditSearchTerm.toLowerCase();
      return (
        (res.file?.toLowerCase() || "").includes(searchLower) ||
        (res.violation?.toLowerCase() || "").includes(searchLower) ||
        (res.message?.toLowerCase() || "").includes(searchLower) ||
        (res.severity?.toLowerCase() || "").includes(searchLower)
      );
    });

    // Grouping Logic: Summarize if improvement action (suggestion) is the same
    const groupedMap = new Map();
    filtered.forEach((item) => {
      const key = item.suggestion || item.violation;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, { ...item, count: 1, files: [item.file] });
      } else {
        const existing = groupedMap.get(key);
        existing.count++;
        if (!existing.files.includes(item.file)) {
          existing.files.push(item.file);
        }
        // Update timestamp to most recent
        if (new Date(item.lastDetectedAt) > new Date(existing.lastDetectedAt)) {
          existing.lastDetectedAt = item.lastDetectedAt;
        }
      }
    });

    const grouped = Array.from(groupedMap.values());

    if (auditSortConfig) {
      grouped.sort((a, b) => {
        const aValue = a[auditSortConfig.key];
        const bValue = b[auditSortConfig.key];
        if (aValue < bValue)
          return auditSortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue)
          return auditSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return grouped;
  }, [auditResults, auditSearchTerm, auditSortConfig]);

  const filteredRouteResults = useMemo(() => {
    const filtered = routeResults.filter((res) => {
      const searchLower = routeSearchTerm.toLowerCase();
      return (
        (res.route?.toLowerCase() || "").includes(searchLower) ||
        (res.status?.toLowerCase() || "").includes(searchLower) ||
        (res.suggestion?.toLowerCase() || "").includes(searchLower)
      );
    });

    if (routeSortConfig) {
      filtered.sort((a, b) => {
        let aValue = a[routeSortConfig.key];
        let bValue = b[routeSortConfig.key];

        // Tratamento especial para latência numérica
        if (routeSortConfig.key === "latency") {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        }

        if (aValue < bValue)
          return routeSortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue)
          return routeSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [routeResults, routeSearchTerm, routeSortConfig]);

  const getActionStyle = (action: string) => {
    switch (action) {
      case "INSERT":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "UPDATE":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "DELETE":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const getTableNameLabel = (name: string) => {
    const labels: Record<string, string> = {
      users: "Usuários (Sistema)",
      profiles: "Perfis (Legado)",
      employees: "Funcionários",
      teams: "Equipes",
      projects: "Obras",
      sites: "Canteiros",
      permission_matrix: "Matriz SU",
    };
    return labels[name] || name;
  };

  const getSeverityStyle = (severity?: string) => {
    switch (severity) {
      case "HIGH":
        return "bg-red-500 text-white shadow-red-500/50";
      case "MEDIUM":
        return "bg-amber-500 text-white shadow-amber-500/50";
      case "LOW":
        return "bg-blue-500 text-white shadow-blue-500/50";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const DiffViewer = ({ oldData, newData }: { oldData: any; newData: any }) => {
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "credential",
      "auth",
      "senha",
      "key",
      "access_token",
    ];

    const formatDisplayValue = (key: string, value: any) => {
      if (value === null || value === undefined) {
        return (
          <Badge
            variant="outline"
            className="text-[10px] opacity-30 border-white/10 font-mono"
          >
            NULL
          </Badge>
        );
      }

      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        return (
          <span className="text-primary font-mono tracking-widest text-xs">
            ••••••••
          </span>
        );
      }

      // ISO Date Check
      if (
        typeof value === "string" &&
        value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      ) {
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <CalendarIcon className="w-3 h-3 text-primary/50" />
            {format(new Date(value), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
          </span>
        );
      }

      // UUID check
      if (
        typeof value === "string" &&
        value.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        )
      ) {
        return (
          <span
            className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-blue-400 group-hover:text-blue-300 transition-colors"
            title={value}
          >
            {value.substring(0, 8)}...{value.substring(value.length - 4)}
          </span>
        );
      }

      if (typeof value === "boolean") {
        return (
          <Badge
            className={cn(
              "text-[9px] font-black uppercase tracking-tighter",
              value
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400",
            )}
          >
            {value ? "TRUE" : "FALSE"}
          </Badge>
        );
      }

      if (typeof value === "object") {
        return (
          <span className="text-[10px] font-mono text-muted-foreground italic truncate">
            JSON Object
          </span>
        );
      }

      return (
        <span className="text-xs font-bold text-foreground truncate">
          {String(value)}
        </span>
      );
    };

    if (!oldData && !newData)
      return (
        <div className="p-8 text-center text-muted-foreground italic border-2 border-dashed border-white/5 rounded-2xl">
          Sem dados para comparar
        </div>
      );

    const allKeys = Array.from(
      new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]),
    );
    const changes = allKeys.filter(
      (key) =>
        JSON.stringify(oldData?.[key]) !== JSON.stringify(newData?.[key]),
    );

    return (
      <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
        <div
          className={cn(
            "grid gap-2 p-1",
            changes.length > 4 ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1",
          )}
        >
          {changes.length === 0 ? (
            <div className="p-10 text-center space-y-2 col-span-full">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-black opacity-30">
                Nenhuma alteração detectada nos campos
              </p>
            </div>
          ) : (
            changes.map((key) => (
              <div
                key={key}
                className="group flex flex-col items-stretch gap-px rounded-lg overflow-hidden border border-white/5 bg-white/2 hover:border-primary/20 transition-all duration-300"
              >
                <div className="p-1.5 bg-black/40 border-b border-white/5 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase text-primary/40 tracking-widest group-hover:text-primary transition-colors">
                    {key}
                  </span>
                </div>

                <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center">
                  <div className="p-2 bg-red-500/5 min-h-[40px] flex items-center justify-center">
                    {formatDisplayValue(key, oldData?.[key])}
                  </div>

                  <div className="flex items-center justify-center px-2 bg-black/20 text-muted-foreground group-hover:text-primary transition-colors">
                    <ArrowRight className="w-3 h-3" />
                  </div>

                  <div className="p-2 bg-green-500/5 min-h-[40px] flex items-center justify-center">
                    {formatDisplayValue(key, newData?.[key])}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-foreground uppercase flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            Central de Segurança
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">
            Auditoria completa e validações técnicas do sistema Orion.
          </p>
        </div>
      </div>

      <Tabs
        defaultValue={defaultTab}
        className="w-full"
        onValueChange={(val) => {
          setSearchParams({ tab: val });
        }}
      >
        <TabsList className="glass-card mb-8 p-1 flex justify-start overflow-x-auto gap-2 border-white/5">
          <TabsTrigger value="audit" className="gap-2 px-6 py-2">
            <Database className="w-4 h-4" /> Trilha do Sistema
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2 px-6 py-2">
            <Activity className="w-4 h-4" /> Sanidade de Rotas
          </TabsTrigger>
          <TabsTrigger value="standards" className="gap-2 px-6 py-2">
            <ShieldAlert className="w-4 h-4" /> Auditoria de Padrões
          </TabsTrigger>
          <TabsTrigger value="gapo" className="gap-2 px-6 py-2">
            <CheckCircle2 className="w-4 h-4" /> Validação GAPO
          </TabsTrigger>
          <TabsTrigger value="checklist" className="gap-2 px-6 py-2">
            <ShieldCheck className="w-4 h-4" /> Diretrizes de Segurança
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: TRILHA DO SISTEMA */}
        <TabsContent value="audit" className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, tabela ou ação..."
                className="industrial-input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchLogs()}
              className="gap-2"
            >
              <RefreshCw
                className={cn("w-4 h-4", isLoading && "animate-spin")}
              />{" "}
              Atualizar Trilha
            </Button>
          </div>

          <Card className="glass-card overflow-hidden">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Registros do Servidor
              </CardTitle>
              <CardDescription>
                Mostrando os últimos {filteredLogs.length} eventos registrados.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/5 bg-white/2">
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest pl-6 w-[15%]">
                        Data/Hora
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest w-[30%]">
                        Usuário / IP
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest w-[30%]">
                        Módulo / Tabela
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest w-[15%]">
                        Ação
                      </TableHead>
                      <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest w-[10%]">
                        Detalhes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium text-muted-foreground">
                              Consultando arquivos de auditoria...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-20 text-muted-foreground italic font-medium"
                        >
                          Nenhum registro encontrado para esta busca.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((logItem) => (
                        <TableRow
                          key={logItem.id}
                          className="hover:bg-white/2 border-white/5 transition-colors group"
                        >
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-foreground">
                                {safeFormat(logItem.performed_at, "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {safeFormat(logItem.performed_at, "HH:mm:ss")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-[10px] font-black text-white shrink-0">
                                {formatNameForLGPD(logItem.performer_name)
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm text-foreground">
                                  {formatNameForLGPD(logItem.performer_name)}
                                </span>
                                <span className="text-[9px] font-mono text-muted-foreground bg-white/5 px-1 rounded w-fit">
                                  {logItem.ipAddress || "0.0.0.0"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono bg-muted/30"
                              >
                                {logItem.table_name}
                              </Badge>
                              {logItem.route && (
                                <span
                                  className="text-[9px] text-muted-foreground/50 truncate max-w-[150px]"
                                  title={logItem.route}
                                >
                                  {logItem.route}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest border",
                                getActionStyle(logItem.action),
                              )}
                            >
                              {logItem.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-primary/20 hover:text-primary"
                              onClick={() => setSelectedLog(logItem)}
                            >
                              <Eye className="w-4 h-4" />
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
        </TabsContent>

        {/* ABA 2: SANIDADE DE ROTAS (REAL) */}
        <TabsContent value="validation" className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/5 pb-6 gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Diagnóstico de Infraestrutura
                </CardTitle>
                <CardDescription>
                  Verificação em tempo real de acessibilidade e desempenho de
                  rotas críticas.
                </CardDescription>
              </div>
              <div className="flex w-full md:w-auto items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar rotas ou status..."
                    value={routeSearchTerm}
                    onChange={(e) => setRouteSearchTerm(e.target.value)}
                    className="pl-10 bg-black/20 border-white/10 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleRunRouteTests}
                  disabled={isTestingRoutes}
                  className="gap-2 shadow-glow shadow-blue-500/20 bg-blue-600 hover:bg-blue-500 text-white border-0 py-6 px-8 rounded-2xl shrink-0"
                >
                  {isTestingRoutes ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 shadow-xl" />
                  )}
                  Executar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/5 bg-white/2">
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest pl-6 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSortRoutes("status")}
                      >
                        <div className="flex items-center gap-2">
                          Status{" "}
                          <SortIcon
                            config={routeSortConfig}
                            columnKey="status"
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSortRoutes("route")}
                      >
                        <div className="flex items-center gap-2">
                          Rota / Endpoint{" "}
                          <SortIcon
                            config={routeSortConfig}
                            columnKey="route"
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSortRoutes("latency")}
                      >
                        <div className="flex items-center gap-2">
                          Latência{" "}
                          <SortIcon
                            config={routeSortConfig}
                            columnKey="latency"
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleSortRoutes("lastCheck")}
                      >
                        <div className="flex items-center gap-2">
                          Checagem{" "}
                          <SortIcon
                            config={routeSortConfig}
                            columnKey="lastCheck"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest pr-6">
                        Sugestão / Diagnóstico
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRouteResults.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-20 text-muted-foreground italic font-medium border-dashed border-white/5"
                        >
                          {isTestingRoutes
                            ? "Executando testes..."
                            : "Nenhum resultado encontrado para esta pesquisa."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRouteResults.map((res, i) => (
                        <TableRow
                          key={i}
                          className="hover:bg-white/5 border-white/5 transition-colors group cursor-pointer"
                          onClick={() => setSelectedRouteResult(res)}
                        >
                          <TableCell className="pl-6 py-4">
                            <Badge
                              className={cn(
                                "rounded-lg border-0 font-black text-[10px] uppercase",
                                res.status === "UP"
                                  ? "bg-green-500/10 text-green-500"
                                  : res.status === "SECURE"
                                    ? "bg-blue-500/10 text-blue-500"
                                    : "bg-red-500/10 text-red-500",
                              )}
                            >
                              {res.status === "SECURE"
                                ? `SECURE (${res.code})`
                                : res.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-foreground/80">
                            {res.route}
                          </TableCell>
                          <TableCell className="font-black text-sm text-foreground">
                            {res.latency}
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground font-medium">
                            {res.lastCheck && isValidDate(res.lastCheck)
                              ? format(new Date(res.lastCheck), "HH:mm:ss")
                              : "--:--"}
                          </TableCell>
                          <TableCell
                            className="pr-6 text-[11px] text-white/60 font-medium italic truncate max-w-[350px]"
                            title={res.suggestion}
                          >
                            {res.suggestion}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* MODAL DE DETALHES DA ROTA */}
          <Dialog
            open={!!selectedRouteResult}
            onOpenChange={(open) => !open && setSelectedRouteResult(null)}
          >
            <DialogContent className="max-w-2xl glass-card border-blue-500/20 bg-background/95 backdrop-blur-xl">
              <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div
                    className={cn(
                      "p-4 rounded-2xl shadow-glow",
                      selectedRouteResult?.status === "UP"
                        ? "bg-green-500/10 text-green-500"
                        : selectedRouteResult?.status === "SECURE"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-red-500/10 text-red-500",
                    )}
                  >
                    <Activity className="w-8 h-8" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                      Diagnóstico de Rota
                      <Badge
                        className={cn(
                          "rounded-lg border-0 font-black",
                          selectedRouteResult?.status === "UP"
                            ? "bg-green-500/10 text-green-500"
                            : selectedRouteResult?.status === "SECURE"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-red-500/10 text-red-500",
                        )}
                      >
                        {selectedRouteResult?.status}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs font-bold text-blue-400">
                      ENDPOINT: {selectedRouteResult?.route}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {selectedRouteResult && (
                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">
                        Velocidade de Resposta
                      </span>
                      <p className="text-3xl font-black text-foreground">
                        {selectedRouteResult.latency}
                      </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-black/20 border border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">
                        Última Verificação
                      </span>
                      <p className="text-3xl font-black text-foreground">
                        {selectedRouteResult.lastCheck &&
                          isValidDate(selectedRouteResult.lastCheck)
                          ? format(
                            new Date(selectedRouteResult.lastCheck),
                            "HH:mm:ss",
                          )
                          : "--:--"}
                      </p>
                    </div>
                  </div>

                  <div className="p-8 rounded-3xl bg-blue-500/5 border border-blue-500/20 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-400 fill-blue-400" />
                      <span className="text-xs font-black text-blue-400 uppercase tracking-widest">
                        Análise do Sistema
                      </span>
                    </div>
                    <p className="text-lg font-medium text-foreground leading-relaxed italic">
                      "{selectedRouteResult.suggestion}"
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/10 text-[10px] text-muted-foreground italic font-medium">
                    * Este diagnóstico é gerado em tempo real através de pings
                    sintéticos originados do servidor de aplicação.
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ABA 3: AUDITORIA DE PADRÕES (DETALHADA) */}
        <TabsContent value="standards" className="space-y-6">
          {/* HEALTH SCORE CARD */}
          {healthScore !== null && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Score Principal */}
              <Card
                className={cn(
                  "glass-card border-2 col-span-1 md:col-span-1 flex flex-col items-center justify-center py-8",
                  healthScore >= 80
                    ? "border-green-500/30 bg-green-500/5"
                    : healthScore >= 50
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-red-500/30 bg-red-500/5",
                )}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                  Health Score
                </span>
                <span
                  className={cn(
                    "text-6xl font-black",
                    healthScore >= 80
                      ? "text-green-500"
                      : healthScore >= 50
                        ? "text-amber-500"
                        : "text-red-500",
                  )}
                >
                  {healthScore}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  de 100
                </span>
              </Card>

              {/* Severidade */}
              {bySeverity && (
                <Card className="glass-card border-white/10 col-span-1 md:col-span-1 p-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block">
                    Por Severidade
                  </span>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge className="bg-red-500/20 text-red-500 border-0">
                        ALTA
                      </Badge>
                      <span className="font-black text-lg">
                        {bySeverity.HIGH}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge className="bg-amber-500/20 text-amber-500 border-0">
                        MÉDIA
                      </Badge>
                      <span className="font-black text-lg">
                        {bySeverity.MEDIUM}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge className="bg-blue-500/20 text-blue-500 border-0">
                        BAIXA
                      </Badge>
                      <span className="font-black text-lg">
                        {bySeverity.LOW}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Top Issues */}
              {topIssues.length > 0 && (
                <Card className="glass-card border-white/10 col-span-1 md:col-span-2 p-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block">
                    Top Code Smells
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {topIssues.map((issue, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs font-medium border-amber-500/30 text-amber-400 bg-amber-500/5"
                      >
                        {issue}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
          <Card className="glass-card border-amber-500/20 bg-amber-500/5 shadow-2xl">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-amber-500/10 pb-6 gap-4">
              <div>
                <CardTitle className="flex items-center gap-3 text-amber-500 font-black text-2xl uppercase tracking-tighter">
                  <ShieldAlert className="w-8 h-8 drop-shadow-glow" />
                  AUDITORIA ATIVA
                </CardTitle>
                <CardDescription className="text-amber-500/60 font-bold uppercase text-[10px] tracking-widest">
                  Análise estática de código para conformidade estrutural.
                </CardDescription>
              </div>
              <div className="flex w-full md:w-auto items-center gap-3">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-100",
                        !dateRange && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-amber-500" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yy")} -{" "}
                            {format(dateRange.to, "dd/MM/yy")}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yy")
                        )
                      ) : (
                        <span>Filtrar por Data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => setDateRange(range)}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {/* Order Select */}
                <div className="w-[200px]">
                  <Select
                    onValueChange={(val) => {
                      const [key, dir] = val.split("-");
                      setAuditSortConfig({
                        key,
                        direction: dir as "asc" | "desc",
                      });
                    }}
                    defaultValue="lastDetectedAt-desc"
                  >
                    <SelectTrigger className="border-amber-500/20 bg-amber-500/5 text-amber-100">
                      <SelectValue placeholder="Ordenação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastDetectedAt-desc">
                        Mais Recentes
                      </SelectItem>
                      <SelectItem value="lastDetectedAt-asc">
                        Mais Antigos
                      </SelectItem>
                      <SelectItem value="severity-desc">
                        Maior Severidade
                      </SelectItem>
                      <SelectItem value="severity-asc">
                        Menor Severidade
                      </SelectItem>
                      <SelectItem value="file-asc">
                        Nome do Arquivo (A-Z)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                  <Input
                    placeholder="Filtrar arquivos ou violações..."
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    className="pl-10 bg-amber-500/10 border-amber-500/20 rounded-xl text-amber-100 placeholder:text-amber-500/40"
                  />
                </div>
                <Button
                  onClick={handleRunArchitecturalAudit}
                  disabled={isAuditing || isStreaming}
                  variant="destructive"
                  className="gap-2 shadow-2xl shadow-red-600/30 font-black py-7 px-10 rounded-2xl text-lg uppercase tracking-widest scale-100 hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  {isAuditing ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6 fill-current" />
                  )}
                  SCAN
                </Button>
                <Button
                  onClick={handleRunStreamingScan}
                  disabled={isAuditing || isStreaming}
                  className="gap-2 shadow-2xl shadow-green-600/30 font-black py-7 px-8 rounded-2xl text-lg uppercase tracking-widest scale-100 hover:scale-105 active:scale-95 transition-all shrink-0 bg-green-600 hover:bg-green-500 text-white border-0"
                >
                  {isStreaming ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <Play className="w-6 h-6 fill-current" />
                  )}
                  LIVE
                </Button>
              </div>
            </CardHeader>

            {/* TERMINAL DE STREAMING EM TEMPO REAL - VISUAL PREMIUM */}
            {(isStreaming || streamLogs.length > 0) && (
              <div className="px-6 py-5 border-b border-amber-500/10 space-y-4">
                {/* Header com Status e Contadores */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isStreaming ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-500">
                          SCAN EM CURSO...
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                        <CheckCircle2 className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                          SCAN CONCLUÍDO
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contadores em Tempo Real e Ações */}
                  <div className="flex items-center gap-4">
                    {(() => {
                      const violations = streamLogs.filter(
                        (l) => l.type === "violation",
                      );
                      const high = violations.filter(
                        (l) => l.data.severity === "HIGH",
                      ).length;
                      const medium = violations.filter(
                        (l) => l.data.severity === "MEDIUM",
                      ).length;
                      const low = violations.filter(
                        (l) => l.data.severity === "LOW",
                      ).length;
                      return (
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-xs font-bold text-red-100">
                                {high}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-xs font-bold text-amber-100">
                                {medium}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-xs font-bold text-blue-100">
                                {low}
                              </span>
                            </div>
                          </div>

                          <div className="h-4 w-px bg-white/10" />

                          <div className="flex border border-white/10 rounded-lg overflow-hidden shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn("px-4 py-1 h-8 rounded-none text-[10px] uppercase font-black transition-all", streamViewMode === 'table' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'hover:bg-white/5')}
                              onClick={() => setStreamViewMode('table')}
                            >
                              <Activity className="w-3 h-3 mr-2" />
                              Visualização em Tabela (Colunas)
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn("px-4 py-1 h-8 rounded-none text-[10px] uppercase font-black transition-all", streamViewMode === 'terminal' ? 'bg-amber-500 text-black hover:bg-amber-600' : 'hover:bg-white/5')}
                              onClick={() => setStreamViewMode('terminal')}
                            >
                              <Play className="w-3 h-3 mr-2" />
                              Terminal
                            </Button>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-2 border-green-500/20 bg-green-500/5 text-[10px] font-black uppercase tracking-widest hover:bg-green-500/20 text-green-400"
                              onClick={() => copyToClipboard(generateCSVReport(streamLogs.filter(l => l.type === 'violation').map(l => l.data)))}
                            >
                              <Copy className="w-3 h-3" />
                              Copiar para Excel/CSV
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-2 border-amber-500/20 bg-amber-500/5 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20"
                              onClick={() => copyToClipboard(generateMarkdownReport())}
                            >
                              <Info className="w-3 h-3" />
                              Relatório Completo
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Barra de Progresso Visual */}
                {isStreaming && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-muted-foreground">
                        Analisando arquivos...
                      </span>
                      <span className="font-black text-primary">
                        {streamProgress}%
                      </span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-linear-to-r from-amber-500 via-orange-500 to-red-500 rounded-full transition-all duration-300 ease-out relative"
                        style={{ width: `${streamProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Visualização de Resultados (Terminal ou Tabela) */}
                {streamViewMode === "terminal" ? (
                  <div className="bg-[#0d1117] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                    {/* Terminal Header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-white/5">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-[10px] font-mono text-white/40 ml-2">
                        orion-audit --stream --mode=deep
                      </span>
                    </div>

                    {/* Terminal Content */}
                    <div className="p-4 font-mono text-xs max-h-72 overflow-y-auto scroll-smooth">
                      {streamLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "py-1 flex items-start gap-2",
                            log.type === "connected" && "text-green-400",
                            log.type === "complete" && "text-green-400 font-bold",
                            log.type === "error" && "text-red-500 font-bold",
                          )}
                        >
                          {log.type === "connected" && (
                            <>
                              <span className="text-green-500">➜</span>
                              <span className="text-green-400">
                                {log.data.message}
                              </span>
                            </>
                          )}
                          {log.type === "violation" && (
                            <>
                              <span className="text-white/30 w-14 shrink-0">
                                [{log.data.index}/{log.data.total}]
                              </span>
                              <span
                                className={cn(
                                  "w-16 shrink-0 font-bold",
                                  log.data.severity === "HIGH" && "text-red-400",
                                  log.data.severity === "MEDIUM" &&
                                  "text-amber-400",
                                  log.data.severity === "LOW" && "text-blue-400",
                                )}
                              >
                                {log.data.severity}
                              </span>
                              <span className="text-cyan-400 shrink-0">
                                {log.data.file}
                              </span>
                              <span className="text-white/40">→</span>
                              <span className="text-white/60 truncate">
                                {log.data.violation}
                              </span>
                            </>
                          )}
                          {log.type === "complete" && (
                            <>
                              <span className="text-green-500">✓</span>
                              <span>
                                Scan completo! Health Score:{" "}
                                <span className="text-primary font-black">
                                  {log.data.healthScore}
                                </span>
                                /100 | {log.data.violationsCount} violações
                              </span>
                            </>
                          )}
                          {log.type === "error" && (
                            <>
                              <span className="text-red-500">✗</span>
                              <span>Erro: {log.data.message}</span>
                            </>
                          )}
                        </div>
                      ))}
                      {isStreaming && (
                        <div className="py-1 text-green-400 animate-pulse">▌</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-xl overflow-hidden border border-amber-500/20 bg-black/40 shadow-2xl">
                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                      <Table className="min-w-[1000px]">
                        <TableHeader className="sticky top-0 bg-[#0d1117] z-10 border-b border-amber-500/10">
                          <TableRow className="border-amber-500/10 h-10 hover:bg-transparent">
                            <TableHead className="text-[9px] font-black uppercase text-amber-500/50 pl-6 w-12 text-center">N°</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-amber-500/50 w-24">Severidade</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-amber-500/50 w-[20%]">O que foi testado (Arquivo)</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-amber-500/50 w-[25%]">Violação Detectada</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-amber-500/50">Sugestão de Melhoria</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-amber-500/50 pr-6 text-right w-24">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {streamLogs.filter(l => l.type === 'violation').length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="py-24 text-center text-muted-foreground italic text-xs">
                                <Activity className="w-8 h-8 text-amber-500/20 mx-auto mb-3 animate-pulse" />
                                Aguardando detecções do scan em tempo real...
                              </TableCell>
                            </TableRow>
                          ) : (
                            streamLogs.filter(l => l.type === 'violation').map((log, idx) => (
                              <TableRow key={idx} className="border-amber-500/5 hover:bg-amber-500/5 group h-14">
                                <TableCell className="pl-6 text-[10px] font-mono text-muted-foreground text-center">
                                  {log.data.index}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={cn(
                                      "text-[8px] font-black px-1.5 py-0 border-0",
                                      log.data.severity === 'HIGH' ? 'bg-red-500/20 text-red-500' :
                                        log.data.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                                    )}
                                  >
                                    {log.data.severity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-mono text-blue-300 font-bold truncate max-w-xs" title={log.data.file}>
                                      {log.data.file.split('/').pop()}
                                    </span>
                                    <span className="text-[8px] font-mono text-muted-foreground italic truncate max-w-xs">
                                      {log.data.file}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-foreground font-medium italic">
                                  {log.data.violation}
                                </TableCell>
                                <TableCell className="text-xs text-amber-100/70">
                                  {log.data.suggestion || '--'}
                                </TableCell>
                                <TableCell className="pr-6 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-amber-500/20 text-blue-400 rounded-lg"
                                      onClick={() => copyToClipboard(log.data.file)}
                                      title="Copiar apenas o caminho do arquivo"
                                    >
                                      <Link className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-amber-500/20 text-amber-500 rounded-lg"
                                      onClick={() => copyToClipboard(`Arquivo: ${log.data.file}\nViolação: ${log.data.violation}\nSugestão: ${log.data.suggestion}`)}
                                      title="Copiar dados formatados"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <CardContent className="p-0 bg-black/5">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-amber-500/10 bg-amber-500/5">
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest pl-6 text-amber-500/70 cursor-pointer hover:text-amber-500 transition-colors"
                        onClick={() => handleSortAudit("status")}
                      >
                        <div className="flex items-center gap-2">
                          Auditor{" "}
                          <SortIcon
                            config={auditSortConfig}
                            columnKey="status"
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest text-amber-500/70 cursor-pointer hover:text-amber-500 transition-colors"
                        onClick={() => handleSortAudit("lastDetectedAt")}
                      >
                        <div className="flex items-center gap-2">
                          Data{" "}
                          <SortIcon
                            config={auditSortConfig}
                            columnKey="lastDetectedAt"
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest text-amber-500/70 cursor-pointer hover:text-amber-500 transition-colors"
                        onClick={() => handleSortAudit("severity")}
                      >
                        <div className="flex items-center gap-2">
                          Severidade{" "}
                          <SortIcon
                            config={auditSortConfig}
                            columnKey="severity"
                          />
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest text-amber-500/70 cursor-pointer hover:text-amber-500 transition-colors"
                        onClick={() => handleSortAudit("file")}
                      >
                        <div className="flex items-center gap-2">
                          Arquivos / Componente{" "}
                          <SortIcon config={auditSortConfig} columnKey="file" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="font-bold text-[10px] uppercase tracking-widest text-amber-500/70 cursor-pointer hover:text-amber-500 transition-colors"
                        onClick={() => handleSortAudit("violation")}
                      >
                        <div className="flex items-center gap-2">
                          Violação Sugerida{" "}
                          <SortIcon
                            config={auditSortConfig}
                            columnKey="violation"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-widest pr-6 text-amber-500/70">
                        Opção de Melhoria
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditResults.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-24 text-amber-500/20 italic font-medium border-dashed border-amber-500/10"
                        >
                          {isAuditing
                            ? "Executando scan estrutural..."
                            : "Nenhum problema encontrado ou filtro sem resultados."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAuditResults.map((res, i) => (
                        <TableRow
                          key={i}
                          className="hover:bg-amber-500/5 border-amber-500/10 transition-colors group cursor-pointer"
                          onClick={() => setSelectedAuditResult(res)}
                        >
                          <TableCell className="pl-6 py-5">
                            <div
                              className={cn(
                                "p-2 rounded-lg shrink-0",
                                res.status === "FAIL"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-amber-500/10 text-amber-500",
                              )}
                            >
                              {res.status === "FAIL" ? (
                                <XCircle className="w-5 h-5" />
                              ) : (
                                <AlertTriangle className="w-5 h-5" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-foreground">
                                {safeFormat(res.lastDetectedAt, "dd/MM/yy", {
                                  locale: ptBR,
                                })}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {safeFormat(res.lastDetectedAt, "HH:mm")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "rounded-lg border-0 font-black text-[10px] uppercase tracking-tight shadow-md",
                                getSeverityStyle(res.severity),
                              )}
                            >
                              {res.severity || "LOW"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span
                                className="text-xs font-bold text-foreground truncate max-w-[200px]"
                                title={res.file}
                              >
                                {res.file}
                              </span>
                              {res.count > 1 && (
                                <span className="text-[9px] text-muted-foreground truncate w-[200px]">
                                  + {res.count - 1} outros arquivos
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase text-amber-500/90">
                                {res.violation}
                              </span>
                              <span
                                className="text-[11px] text-muted-foreground leading-tight line-clamp-1 italic max-w-[250px]"
                                title={res.message}
                              >
                                {res.message}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-6">
                            <div className="flex items-center gap-2 bg-cyan-500/5 border border-cyan-500/10 p-3 rounded-xl">
                              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400 shrink-0" />
                              <p
                                className="text-[11px] font-bold text-cyan-100/90 leading-relaxed truncate max-w-[350px]"
                                title={res.suggestion}
                              >
                                {res.suggestion}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-amber-500/20 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(`Arquivo: ${res.file}\nViolação: ${res.violation}\nSugestão: ${res.suggestion}`);
                              }}
                              title="Copiar detalhes"
                            >
                              <Copy className="w-4 h-4" />
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

          {/* MODAL DE DETALHES DA AUDITORIA */}
          <Dialog
            open={!!selectedAuditResult}
            onOpenChange={(open) => !open && setSelectedAuditResult(null)}
          >
            <DialogContent className="max-w-4xl glass-card border-amber-500/20 bg-background/95 backdrop-blur-xl">
              <DialogHeader>
                <div className="flex items-center gap-5 mb-2">
                  <div
                    className={cn(
                      "p-5 rounded-[24px] shadow-2xl shadow-amber-500/20",
                      selectedAuditResult?.status === "FAIL"
                        ? "bg-red-500/20 text-red-500 border border-red-500/30"
                        : "bg-amber-500/20 text-amber-500 border border-amber-500/30",
                    )}
                  >
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between w-full">
                      <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-amber-500 leading-none">
                        Detalhes da Violação Estrutural
                      </DialogTitle>
                      <Badge
                        className={cn(
                          "rounded-xl border-0 font-black px-4 py-2 text-xs shadow-xl",
                          getSeverityStyle(selectedAuditResult?.severity),
                        )}
                      >
                        SEVERIDADE: {selectedAuditResult?.severity}
                      </Badge>
                    </div>
                    {(selectedAuditResult as any)?.files &&
                      (selectedAuditResult as any)?.files?.length > 1 ? (
                      <div className="mt-4 w-full">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <Database className="w-3 h-3" />{" "}
                            {(selectedAuditResult as any)?.count} ARQUIVOS
                            AFETADOS
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-2 hover:bg-white/10 border-white/10 bg-black/20"
                            onClick={() => {
                              if ((selectedAuditResult as any)?.files) {
                                navigator.clipboard.writeText(
                                  (selectedAuditResult as any)?.files.join(
                                    "\n",
                                  ),
                                );
                                toast.success(
                                  "Lista de arquivos copiada para a área de transferência!",
                                );
                              }
                            }}
                          >
                            <Copy className="w-3 h-3" /> COPIAR LISTA
                          </Button>
                        </div>
                        <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden shadow-inner">
                          <div className="max-h-[140px] overflow-y-auto p-2 space-y-1">
                            {(selectedAuditResult as any)?.files?.map(
                              (file: string, i: number) => (
                                <div
                                  key={i}
                                  className="text-[10px] font-mono text-cyan-100/70 break-all py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded transition-colors select-all"
                                >
                                  {file}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <DialogDescription className="font-mono text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest flex items-center gap-2">
                        <Database className="w-3 h-3" /> ARQUIVO:{" "}
                        {selectedAuditResult?.file}
                      </DialogDescription>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {selectedAuditResult && (
                <div className="space-y-8 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
                    <div className="space-y-6">
                      <div className="p-6 rounded-[24px] bg-black/40 border border-white/5 space-y-2">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                          Tipo de Violação
                        </span>
                        <p className="text-sm font-black text-foreground uppercase">
                          {selectedAuditResult.violation || "Desconhecida"}
                        </p>
                      </div>
                      <div className="p-6 rounded-[24px] bg-black/40 border border-white/5 space-y-2">
                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                          Estado de Scan
                        </span>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-500" />
                          <p className="text-sm font-black text-green-500 uppercase">
                            Monitoramento Ativo
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 rounded-[32px] bg-black/60 border-2 border-amber-500/10 shadow-inner space-y-4">
                      <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-amber-500" />
                        <span className="text-xs font-black text-amber-500 uppercase tracking-widest">
                          Descrição do Problema
                        </span>
                      </div>
                      <p className="text-lg font-bold text-foreground leading-relaxed">
                        {selectedAuditResult.message}
                      </p>
                    </div>
                  </div>

                  <div className="p-10 rounded-[40px] bg-cyan-500/5 border-2 border-cyan-500/20 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Zap className="w-32 h-32 text-cyan-400 rotate-12" />
                    </div>
                    <div className="flex items-start gap-6 relative z-10">
                      <div className="p-4 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                        <Zap className="w-10 h-10 fill-cyan-400" />
                      </div>
                      <div className="space-y-3">
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em]">
                          Plano de Refatoração Recomendado
                        </span>
                        <p className="text-xl font-mono text-cyan-50 font-bold leading-relaxed">
                          {selectedAuditResult.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-30">
                      ORION ARCHITECTURAL AUDITOR V2.4 //{" "}
                      {format(new Date(), "yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent >

        <TabsContent value="checklist" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card border-white/5 overflow-hidden border-linear-to-b from-primary/20 to-transparent">
              <CardHeader className="bg-primary/5 border-b border-white/5 p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl font-black uppercase tracking-tight">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                    Auditoria de Segurança
                  </CardTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black">
                    REPORT V3.0
                  </Badge>
                </div>
                <CardDescription className="text-muted-foreground mt-2 italic font-medium">
                  Checklist de conformidade técnica e LGPD - Gestão Virtual Online.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {[
                    { id: 1, title: "Autenticação e Sessões", severity: "CRÍTICO", details: ["Tokens expostos em tela/logs", "Sessões sem expiração renovável"], suggestion: "Implementar httpOnly cookies e expiração curta via middleware." },
                    { id: 2, title: "Controle de Acesso (RBAC)", severity: "CRÍTICO", details: ["Perfis com privilégios excessivos visíveis", "Falta de MFA para cargos diretivos"], suggestion: "Implementar matriz RBAC estrita e 2FA para perfis 'GOD'." },
                    { id: 3, title: "Exposição de Dados (LGPD)", severity: "ALTO", details: ["Nomes completos em dashboards públicos", "Dados sensíveis sem anonimização"], suggestion: "Utilizar helper formatNameForLGPD() e aplicar máscaras em campos sensíveis." },
                    { id: 4, title: "Validação de Dados", severity: "MÉDIO", details: ["Campos com 'Invalid Date' (RangeError)", "Falta de sanitização em inputs de texto"], suggestion: "Corrigir funções de manipulação de datas e integrar Zod no backend." },
                    { id: 5, title: "Dashboard e Métricas", severity: "BAIXO", details: ["Relatórios acessíveis sem filtro de perfil"], suggestion: "Implementar filtros de acesso por ID de Empresa/Canteiro no signal." }
                  ].map((item) => (
                    <div key={item.id} className="p-6 space-y-4 hover:bg-white/2 transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">0{item.id}</div>
                          <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">{item.title}</h3>
                        </div>
                        <Badge className={`${item.severity === 'CRÍTICO' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          item.severity === 'ALTO' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          } font-black text-[10px] tracking-widest`}>
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="pl-11 space-y-3">
                        <div className="space-y-1.5">
                          {item.details.map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <XCircle className="w-3.5 h-3.5 text-red-500/50" />
                              {detail}
                            </div>
                          ))}
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-primary-foreground text-xs font-bold flex items-start gap-3">
                          <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <p className="leading-relaxed"><span className="text-primary mr-2 uppercase tracking-widest text-[9px]">Correção sugerida:</span> {item.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="glass-card border-white/5 bg-linear-to-br from-primary/5 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <ShieldCheck className="w-40 h-40 text-primary" />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <Activity className="w-6 h-6 text-primary" />
                    Métricas de Resiliência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-[24px] bg-black/40 border border-white/5 group hover:border-primary/30 transition-all">
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Score de Segurança</span>
                      <p className="text-4xl font-black mt-2 text-primary tracking-tighter">84<span className="text-sm opacity-50 ml-1">/100</span></p>
                    </div>
                    <div className="p-6 rounded-[24px] bg-black/40 border border-white/5 group hover:border-amber-500/30 transition-all">
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Status Geral</span>
                      <p className="text-2xl font-black mt-2 text-amber-500 uppercase italic">EM ALERTA</p>
                    </div>
                  </div>

                  <div className="space-y-5 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">Criptografia em Repouso</span>
                        <span className="text-[10px] text-muted-foreground uppercase">AES-256 GCM</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">ATIVO</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">Monitoramento de Invasão</span>
                        <span className="text-[10px] text-muted-foreground uppercase">SSE Master Runner</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">ESTÁVEL</Badge>
                    </div>
                    <div className="flex items-center justify-between opacity-50">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">MFA Administrativo</span>
                        <span className="text-[10px] text-muted-foreground uppercase">TOTP / SMS</span>
                      </div>
                      <Badge variant="outline" className="border-white/10 text-muted-foreground">DESATIVADO</Badge>
                    </div>
                  </div>

                  <Button className="w-full py-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all">
                    GERAR RELATÓRIO PDF
                  </Button>
                </CardContent>
              </Card>

              <div className="p-8 rounded-[40px] bg-black/40 border border-white/5 flex items-center gap-6 group">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-glow">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-lg uppercase tracking-tight">Compromisso com a LGPD</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Todos os acessos à Central de Segurança são registrados e vinculados ao CPF do operador para fins de auditoria forense.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs >

      {/* DIALOG DE DETALHES DO LOG */}
      < Dialog
        open={!!selectedLog
        }
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-3xl glass-card border-primary/20 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div
                className={cn(
                  "p-3 rounded-2xl shadow-glow",
                  getActionStyle(selectedLog?.action || ""),
                )}
              >
                <Database className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                  {selectedLog?.action === "UPDATE"
                    ? "Alteração de Dados"
                    : "Detalhes do Evento"}
                  {selectedLog && (
                    <Badge className={getActionStyle(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="font-medium">
                  UUID do Registro:{" "}
                  <span className="font-mono text-[10px] bg-black/20 p-1 rounded">
                    {selectedLog?.record_id}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> Data e Hora
                  </label>
                  <p className="text-sm font-bold">
                    {safeFormat(selectedLog.performed_at, "dd/MM/yy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Autor da Ação
                  </label>
                  <p className="text-sm font-bold text-primary">
                    {selectedLog.performer_name}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Alvo / Afetado
                  </label>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold">
                      {(selectedLog.new_data as any)?.name ||
                        (selectedLog.old_data as any)?.name ||
                        (selectedLog.new_data as any)?.email ||
                        (selectedLog.old_data as any)?.email ||
                        "Registro ID"}
                    </p>
                    <span
                      className="text-[9px] font-mono text-muted-foreground truncate max-w-[120px]"
                      title={selectedLog.record_id}
                    >
                      {selectedLog.record_id}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Database className="w-3 h-3" /> Tabela
                  </label>
                  <p className="text-sm font-bold">
                    {getTableNameLabel(selectedLog.table_name)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Activity className="w-3 h-3" /> IP de Origem
                  </label>
                  <p className="text-sm font-mono font-bold text-muted-foreground">
                    {selectedLog.ipAddress || "Não registrado"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                    <Search className="w-3 h-3" /> Sistema
                  </label>
                  <p
                    className="text-[10px] text-muted-foreground leading-tight italic line-clamp-2"
                    title={selectedLog.userAgent}
                  >
                    {selectedLog.userAgent || "Desconhecido"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-muted-foreground">
                  Comparativo de Dados
                </label>
                <div className="p-1 rounded-xl bg-black/20 border border-white/5">
                  <DiffViewer
                    oldData={selectedLog.old_data}
                    newData={selectedLog.new_data}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog >
    </div >
  );
}
