import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkStage } from '@/hooks/useWorkStages';

interface GAPODeviationReportProps {
  stages: WorkStage[];
  projectId?: string;
}

interface DeviationItem {
  id: string;
  name: string;
  planned: number;
  actual: number;
  deviation: number;
  status: 'ahead' | 'on_track' | 'behind' | 'critical';
  weight: number;
}

/**
 * GAPODeviationReport — Agente 6
 * Relatório de Desvio de Cronograma (Planned vs Actual)
 */
export default function GAPODeviationReport({ stages, projectId }: GAPODeviationReportProps) {
  const deviations = useMemo<DeviationItem[]>(() => {
    if (!stages?.length) return [];

    const normalize = (val: number) => (val > 1.1 ? val / 100 : val);

    return stages
      .filter((s) => s.progress)
      .map((s) => {
        const planned = normalize(s.progress?.plannedPercentage || 0) * 100;
        const actual = normalize(s.progress?.actualPercentage || 0) * 100;
        const deviation = actual - planned;

        let status: DeviationItem['status'] = 'on_track';
        if (deviation > 5) status = 'ahead';
        else if (deviation < -15) status = 'critical';
        else if (deviation < -5) status = 'behind';

        return {
          id: s.id,
          name: s.name,
          planned: Math.round(planned * 10) / 10,
          actual: Math.round(actual * 10) / 10,
          deviation: Math.round(deviation * 10) / 10,
          status,
          weight: s.weight || 0,
        };
      })
      .sort((a, b) => a.deviation - b.deviation); // piores primeiro
  }, [stages]);

  const summary = useMemo(() => {
    const critical = deviations.filter((d) => d.status === 'critical').length;
    const behind = deviations.filter((d) => d.status === 'behind').length;
    const onTrack = deviations.filter((d) => d.status === 'on_track').length;
    const ahead = deviations.filter((d) => d.status === 'ahead').length;
    return { critical, behind, onTrack, ahead, total: deviations.length };
  }, [deviations]);

  const getStatusConfig = (status: DeviationItem['status']) => {
    switch (status) {
      case 'critical':
        return { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'CRÍTICO' };
      case 'behind':
        return { icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'ATRASADO' };
      case 'on_track':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'NO PRAZO' };
      case 'ahead':
        return { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'ADIANTADO' };
    }
  };

  if (deviations.length === 0) {
    return (
      <Card className="glass-card border-primary/10">
        <CardContent className="py-12 text-center">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-xs text-muted-foreground">Nenhuma atividade com dados de progresso para análise de desvio.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniCard icon={<AlertTriangle className="w-4 h-4" />} label="Críticos" value={summary.critical} color="text-red-400" />
        <MiniCard icon={<TrendingDown className="w-4 h-4" />} label="Atrasados" value={summary.behind} color="text-amber-400" />
        <MiniCard icon={<CheckCircle2 className="w-4 h-4" />} label="No Prazo" value={summary.onTrack} color="text-emerald-400" />
        <MiniCard icon={<TrendingUp className="w-4 h-4" />} label="Adiantados" value={summary.ahead} color="text-blue-400" />
      </div>

      {/* Lista de Desvios */}
      <Card className="glass-card border-primary/10">
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider">Desvio por Atividade (Planned vs Actual)</h3>
          </div>

          {deviations.map((item) => {
            const cfg = getStatusConfig(item.status);
            const Icon = cfg.icon;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  cfg.bg,
                  cfg.border
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon className={cn("w-4 h-4 shrink-0", cfg.color)} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold truncate block">{item.name}</span>
                    <span className="text-[9px] text-muted-foreground/60">
                      Peso: {item.weight} | Plan: {item.planned}% | Real: {item.actual}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-sm font-black", cfg.color)}>
                    {item.deviation > 0 ? '+' : ''}{item.deviation}%
                  </span>
                  <Badge className={cn("text-[8px] font-black uppercase", cfg.bg, cfg.color, "border-none")}>
                    {cfg.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="glass-card border-primary/10">
      <CardContent className="p-3 flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg bg-white/5", color)}>{icon}</div>
        <div>
          <span className="text-lg font-black">{value}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
