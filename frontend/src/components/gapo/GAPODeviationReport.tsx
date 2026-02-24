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
  ChevronDown,
  Layers,
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
  displayOrder: number;
}

interface DeviationGroup extends DeviationItem {
  children: DeviationItem[];
}

/**
 * GAPODeviationReport — Agente 6
 * Relatório de Desvio de Cronograma (Planned vs Actual)
 * Ajustado para Hierarquia e Ordenação do Catálogo
 */
export default function GAPODeviationReport({ stages, projectId }: GAPODeviationReportProps) {
  const normalize = (val: number) => (val > 1.1 ? val / 100 : val);

  const getDeviationData = (s: WorkStage): DeviationItem => {
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
      displayOrder: s.displayOrder || 0,
    };
  };

  const deviationGroups = useMemo<DeviationGroup[]>(() => {
    if (!stages?.length) return [];

    // 1. Identificar pais e filhos
    const parents = stages.filter(s => !s.parentId).sort((a, b) => a.displayOrder - b.displayOrder);
    
    return parents.map(parent => {
      const children = stages
        .filter(s => s.parentId === parent.id)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(getDeviationData);

      return {
        ...getDeviationData(parent),
        children
      };
    }).filter(group => group.children.length > 0 || group.planned > 0 || group.actual > 0);
  }, [stages]);

  const summary = useMemo(() => {
    let critical = 0, behind = 0, onTrack = 0, ahead = 0, total = 0;

    deviationGroups.forEach(group => {
      // Contar pais se tiverem dados? Ou apenas filhos? Original contava tudo que tinha progresso.
      // Vamos contar tudo (pais e filhos)
      [group, ...group.children].forEach(item => {
        total++;
        if (item.status === 'critical') critical++;
        else if (item.status === 'behind') behind++;
        else if (item.status === 'on_track') onTrack++;
        else if (item.status === 'ahead') ahead++;
      });
    });

    return { critical, behind, onTrack, ahead, total };
  }, [deviationGroups]);

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

  if (deviationGroups.length === 0) {
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

      {/* Lista de Desvios Hierárquica */}
      <div className="space-y-4">
        {deviationGroups.map((group) => {
          const groupCfg = getStatusConfig(group.status);
          return (
            <div key={group.id} className="space-y-2">
              {/* Header da Atividade Mãe */}
              <div className="flex items-center gap-2 px-1 mb-1">
                <Layers className="w-3 h-3 text-primary/60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{group.name}</h3>
                <div className="h-px flex-1 bg-linear-to-r from-primary/20 to-transparent" />
              </div>

              {/* Card do Pai (opcional, mas bom para contexto) */}
              <DeviationRow item={group} isParent />

              {/* Filhos */}
              <div className="pl-6 space-y-1.5 border-l border-white/5 ml-2">
                {group.children.map((child) => (
                  <DeviationRow key={child.id} item={child} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeviationRow({ item, isParent }: { item: DeviationItem; isParent?: boolean }) {
  const cfg = useMemo(() => {
    switch (item.status) {
      case 'critical':
        return { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'CRÍTICO' };
      case 'behind':
        return { icon: TrendingDown, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'ATRASADO' };
      case 'on_track':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'NO PRAZO' };
      case 'ahead':
        return { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'ADIANTADO' };
    }
  }, [item.status]);

  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2.5 rounded-lg border transition-all hover:brightness-110",
        cfg.bg,
        cfg.border,
        isParent ? "opacity-90" : "opacity-100"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
        <div className="min-w-0">
          <span className={cn("text-[11px] font-bold truncate block tracking-tight", isParent ? "text-white" : "text-slate-200")}>
            {item.name}
          </span>
          <span className="text-[9px] text-muted-foreground/50 font-medium">
            Plan: {item.planned}% | Real: {item.actual}% | Peso: {item.weight}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right flex flex-col items-end">
          <span className={cn("text-[11px] font-black tabular-nums", cfg.color)}>
            {item.deviation > 0 ? '+' : ''}{item.deviation}%
          </span>
          <span className={cn("text-[7px] font-black uppercase tracking-widest", cfg.color)}>
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="glass-card border-primary/10 overflow-hidden relative group">
      <div className={cn("absolute top-0 left-0 w-1 h-full", color)} />
      <CardContent className="p-3 flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg bg-white/5", color)}>{icon}</div>
        <div>
          <span className="text-lg font-black tracking-tighter tabular-nums">{value}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block leading-none mt-0.5">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
