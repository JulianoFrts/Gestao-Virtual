import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orionApi } from '@/integrations/orion/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Fingerprint,
  Wifi,
  Clock,
  AlertTriangle,
  Monitor,
  Globe,
  Users,
  Activity,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecurityInsight {
  duplicateHwids: {
    hwid: string;
    users: string[];
    count: number;
  }[];
  unknownDevices: {
    userId: string;
    userName: string;
    device: string;
    ip: string;
    timestamp: string;
  }[];
  topIps: {
    ip: string;
    count: number;
    lastSeen: string;
  }[];
  accessTimeline: {
    hour: number;
    count: number;
  }[];
  summary: {
    totalLogs: number;
    uniqueDevices: number;
    uniqueIps: number;
    suspiciousEvents: number;
  };
}

export default function SecurityInsightsDashboard() {
  const { data: insights, isLoading } = useQuery<SecurityInsight>({
    queryKey: ['security-insights'],
    queryFn: async () => {
      const res = await orionApi.get<any>('/audit/insights');
      return res.data?.data || res.data;
    },
    refetchInterval: 60000, // Auto-refresh every 60s
  });

  const maxTimelineCount = useMemo(() => {
    if (!insights?.accessTimeline) return 1;
    return Math.max(...insights.accessTimeline.map(t => t.count), 1);
  }, [insights?.accessTimeline]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground text-sm">Carregando inteligência forense...</span>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="py-12 text-center text-muted-foreground/50">
        <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p className="text-sm">Nenhum dado de inteligência disponível.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Activity className="w-5 h-5" />}
          label="Total de Logs"
          value={insights.summary.totalLogs}
          color="text-blue-400"
        />
        <SummaryCard
          icon={<Monitor className="w-5 h-5" />}
          label="Dispositivos Únicos"
          value={insights.summary.uniqueDevices}
          color="text-emerald-400"
        />
        <SummaryCard
          icon={<Globe className="w-5 h-5" />}
          label="IPs Únicos"
          value={insights.summary.uniqueIps}
          color="text-amber-400"
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Eventos Suspeitos"
          value={insights.summary.suspiciousEvents}
          color={insights.summary.suspiciousEvents > 0 ? "text-red-400" : "text-emerald-400"}
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Timeline (Heatbar) */}
        <Card className="glass-card border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider">Timeline de Acessos (24h)</h3>
            </div>
            <div className="flex items-end gap-[3px] h-24">
              {insights.accessTimeline.map((slot) => {
                const height = (slot.count / maxTimelineCount) * 100;
                const isActive = slot.count > 0;
                return (
                  <div
                    key={slot.hour}
                    className="flex-1 flex flex-col items-center gap-1 group"
                    title={`${slot.hour}h: ${slot.count} acessos`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-sm transition-all duration-300",
                        isActive
                          ? "bg-linear-to-t from-primary/80 to-primary/30 group-hover:from-primary group-hover:to-primary/60"
                          : "bg-white/5"
                      )}
                      style={{ height: `${Math.max(height, 3)}%` }}
                    />
                    {slot.hour % 6 === 0 && (
                      <span className="text-[8px] text-muted-foreground/50">{slot.hour}h</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top IPs */}
        <Card className="glass-card border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Wifi className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-black uppercase tracking-wider">Top 10 IPs de Acesso</h3>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {insights.topIps.length === 0 ? (
                <p className="text-xs text-muted-foreground/40 py-4 text-center">Nenhum IP registrado.</p>
              ) : (
                insights.topIps.map((item, i) => (
                  <div
                    key={item.ip}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-muted-foreground/40 w-4">#{i + 1}</span>
                      <code className="text-[10px] font-mono text-foreground/80">{item.ip}</code>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold">
                      {item.count}x
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate HWIDs Alert */}
      {insights.duplicateHwids.length > 0 && (
        <Card className="glass-card border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Fingerprint className="w-4 h-4 text-red-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-red-400">
                ⚠ HWIDs Compartilhados Detectados
              </h3>
              <Badge className="bg-red-500/20 text-red-300 text-[9px]">
                {insights.duplicateHwids.length} alertas
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground/60 mb-3">
              Os seguintes identificadores de hardware estão sendo usados por múltiplos usuários, o que pode indicar compartilhamento de conta.
            </p>
            <div className="space-y-2">
              {insights.duplicateHwids.map((dup) => (
                <div
                  key={dup.hwid}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <div className="flex items-center justify-between">
                    <code className="text-[10px] font-mono text-red-300">{dup.hwid}</code>
                    <Badge className="bg-red-500/30 text-red-200 text-[9px]">
                      <Users className="w-3 h-3 mr-1" /> {dup.count} usuários
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="glass-card border-primary/10 hover:border-primary/30 transition-colors group">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors", color)}>
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter">{value}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
