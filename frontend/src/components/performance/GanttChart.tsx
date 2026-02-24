import { useState, useMemo, useEffect } from 'react';
import { orionApi } from '@/integrations/orion/client';
import { ChevronDown, ChevronRight, Calendar, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GanttNode {
  id: string;
  name: string;
  parentId: string | null;
  categoryName: string | null;
  weight: number;
  progress: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  plannedQuantity: number;
  plannedHhh: number;
  children: GanttNode[];
}

interface GanttResponse {
  projectId: string;
  stages: GanttNode[];
  totalStages: number;
}

interface GanttRowProps {
  node: GanttNode;
  level: number;
  timelineStart: Date;
  timelineEnd: Date;
  dayWidth: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
}

interface GanttChartProps {
  projectId?: string;
}

// Componente de uma linha do Gantt (recursivo para hierarquia)
function GanttRow({ node, level, timelineStart, timelineEnd, dayWidth, expandedNodes, toggleExpand }: GanttRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const totalDays = differenceInDays(timelineEnd, timelineStart) || 1;

  // Calcular posição e largura da barra
  const start = node.plannedStart ? new Date(node.plannedStart) : null;
  const end = node.plannedEnd ? new Date(node.plannedEnd) : null;

  let barLeft = 0;
  let barWidth = 0;
  let isOverdue = false;

  if (start && end) {
    const startOffset = Math.max(0, differenceInDays(start, timelineStart));
    const duration = Math.max(1, differenceInDays(end, start));
    barLeft = (startOffset / totalDays) * 100;
    barWidth = (duration / totalDays) * 100;
    isOverdue = node.progress < 100 && isAfter(new Date(), end);
  }

  const progressColor = node.progress >= 100 ? 'bg-green-500' : node.progress > 50 ? 'bg-amber-500' : 'bg-orange-500';

  return (
    <>
      <tr className={cn(
        "border-b border-border/50 hover:bg-muted/30 transition-colors",
        level === 0 && "bg-muted/20 font-medium"
      )}>
        {/* Coluna de Nome */}
        <td className="sticky left-0 z-10 bg-background/95 backdrop-blur-sm px-3 py-2 min-w-[250px]">
          <div 
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 16}px` }}
          >
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0"
                onClick={() => toggleExpand(node.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <span className="w-5" />
            )}
            <span className="truncate">{node.name}</span>
            {node.categoryName && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {node.categoryName}
              </Badge>
            )}
          </div>
        </td>

        {/* Coluna de Peso */}
        <td className="text-center text-sm text-muted-foreground px-2">
          {node.weight.toFixed(1)}
        </td>

        {/* Coluna de Progresso */}
        <td className="px-2 min-w-[100px]">
          <div className="flex items-center gap-2">
            <Progress value={node.progress} className="h-2 flex-1" />
            <span className="text-xs font-mono w-10 text-right">{node.progress.toFixed(1)}%</span>
          </div>
        </td>

        {/* Coluna de Datas */}
        <td className="text-xs text-muted-foreground px-2 whitespace-nowrap">
          {start && end ? (
            <span className={cn(isOverdue && "text-red-500")}>
              {format(start, 'dd/MM/yy', { locale: ptBR })} - {format(end, 'dd/MM/yy', { locale: ptBR })}
            </span>
          ) : '-'}
        </td>

        {/* Área do Gantt (Timeline) */}
        <td className="relative h-8 min-w-[400px]">
          <div className="absolute inset-0 flex items-center">
            {/* Grid de fundo */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: Math.min(31, totalDays) }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-border/20"
                  style={{ minWidth: `${dayWidth}px` }}
                />
              ))}
            </div>

            {/* Linha de hoje */}
            {isAfter(new Date(), timelineStart) && isBefore(new Date(), timelineEnd) && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{
                  left: `${(differenceInDays(new Date(), timelineStart) / totalDays) * 100}%`,
                }}
              />
            )}

            {/* Barra de progresso */}
            {start && end && (
              <div
                className={cn(
                  "absolute h-5 rounded-sm transition-all",
                  isOverdue ? "bg-red-500/20 border border-red-500" : "bg-primary/20 border border-primary"
                )}
                style={{
                  left: `${barLeft}%`,
                  width: `${Math.min(barWidth, 100 - barLeft)}%`,
                }}
              >
                {/* Progresso preenchido */}
                <div
                  className={cn("h-full rounded-sm", progressColor)}
                  style={{ width: `${node.progress}%` }}
                />
              </div>
            )}
          </div>
        </td>
      </tr>

      {/* Filhos (se expandido) */}
      {hasChildren && isExpanded && node.children.map(child => (
        <GanttRow
          key={child.id}
          node={child}
          level={level + 1}
          timelineStart={timelineStart}
          timelineEnd={timelineEnd}
          dayWidth={dayWidth}
          expandedNodes={expandedNodes}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
}

export function GanttChart({ projectId }: GanttChartProps) {
  const [data, setData] = useState<GanttResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await orionApi.get<{ data: GanttResponse }>(`/gantt?projectId=${projectId}`);
        const responseData = response.data as unknown as GanttResponse;
        setData(responseData);
        // Expandir nós raiz por padrão
        const roots = new Set<string>(responseData.stages.map((s) => s.id));
        setExpandedNodes(roots);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados do Gantt';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calcular range da timeline
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (!data?.stages.length) {
      const now = new Date();
      return {
        timelineStart: new Date(now.getFullYear(), now.getMonth(), 1),
        timelineEnd: new Date(now.getFullYear(), now.getMonth() + 2, 0),
        totalDays: 60,
      };
    }

    let minDate = new Date();
    let maxDate = new Date();

    const findDates = (nodes: GanttNode[]) => {
      for (const node of nodes) {
        if (node.plannedStart) {
          const start = new Date(node.plannedStart);
          if (start < minDate) minDate = start;
        }
        if (node.plannedEnd) {
          const end = new Date(node.plannedEnd);
          if (end > maxDate) maxDate = end;
        }
        if (node.children.length) findDates(node.children);
      }
    };

    findDates(data.stages);

    // Adicionar margem de 7 dias
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return {
      timelineStart: minDate,
      timelineEnd: maxDate,
      totalDays: differenceInDays(maxDate, minDate) || 60,
    };
  }, [data]);

  const dayWidth = Math.max(15, 600 / totalDays);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  if (!data?.stages.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Calendar className="h-12 w-12 mb-4 opacity-50" />
        <p>Nenhuma etapa cadastrada</p>
        <p className="text-sm">Crie etapas na aba "Avanço Físico" para visualizar o cronograma</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Estrutura Analítica do Projeto (EAP)</h3>
          <Badge variant="secondary">{data.totalStages} etapas</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {format(timelineStart, 'dd MMM', { locale: ptBR })} - {format(timelineEnd, 'dd MMM yyyy', { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Tabela Gantt */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50 text-sm">
            <tr>
              <th className="sticky left-0 z-10 bg-muted/95 backdrop-blur-sm text-left px-3 py-2 font-medium">
                Etapa
              </th>
              <th className="text-center px-2 py-2 font-medium w-16">Peso</th>
              <th className="text-left px-2 py-2 font-medium w-32">Progresso</th>
              <th className="text-left px-2 py-2 font-medium w-32">Período</th>
              <th className="text-left px-2 py-2 font-medium">Cronograma</th>
            </tr>
          </thead>
          <tbody>
            {data.stages.map(stage => (
              <GanttRow
                key={stage.id}
                node={stage}
                level={0}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                dayWidth={dayWidth}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-6 p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500" />
          <span>Em andamento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span>Inicial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 bg-red-500" />
          <span>Hoje</span>
        </div>
      </div>
    </div>
  );
}

export default GanttChart;
