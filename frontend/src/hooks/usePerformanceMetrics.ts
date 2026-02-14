import { useState, useEffect } from 'react';
import { orionApi } from '@/integrations/orion/client';

export interface PerformanceMetrics {
  spi: number;
  cpi: number;
  plannedProgress: number;
  actualProgress: number;
  plannedHH: number;
  actualHH: number;
  plannedCost: number;
  actualCost: number;
}

export interface SCurveItem {
  date: string;
  planned: number;
  actual: number;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  efficiency: number;
  executedQuantity: number;
}

export function usePerformanceMetrics(projectId?: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [sCurveData, setSCurveData] = useState<SCurveItem[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [metricsRes, curveRes, teamsRes] = await Promise.all([
          orionApi.get<PerformanceMetrics>(`/analytics/performance?projectId=${projectId}`),
          orionApi.get<SCurveItem[]>(`/analytics/productivity?projectId=${projectId}`),
          orionApi.get<TeamPerformance[]>(`/analytics/teams?projectId=${projectId}`)
        ]);

        const mData = (metricsRes as { data: PerformanceMetrics }).data || metricsRes;
        const cData = (curveRes as { data: SCurveItem[] }).data || curveRes;
        const tData = (teamsRes as { data: TeamPerformance[] }).data || teamsRes;

        setMetrics(mData as PerformanceMetrics);
        setSCurveData(cData as SCurveItem[]);
        setTeamMetrics(tData as TeamPerformance[]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar métricas';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  return { metrics, sCurveData, teamMetrics, loading, error };
}
