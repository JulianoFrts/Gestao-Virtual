import { prisma } from "@/lib/prisma/client";
import { PerformanceMetrics, ProductivityData, TeamPerformance } from "../domain/performance.types";
import { format, isBefore, eachMonthOfInterval, endOfMonth } from "date-fns";

export class PerformanceAnalyticsService {
  /**
   * Obtém as métricas gerais de performance do projeto (SPI, CPI, HH, etc)
   */
  async getProjectMetrics(projectId: string): Promise<PerformanceMetrics> {
    // 1. Buscar Cronograma e Custos
    const [schedules, unitCosts, productionProgress, timeRecords] = await Promise.all([
      prisma.activitySchedule.findMany({
        where: { element: { projectId } },
      }),
      prisma.activityUnitCost.findMany({
        where: { projectId },
      }),
      prisma.mapElementProductionProgress.findMany({
        where: { projectId },
      }),
      prisma.timeRecord.findMany({
        where: { 
          team: { 
            site: { projectId } 
          } 
        },
      })
    ]);

    const costMap = new Map<string, number>();
    unitCosts.forEach(uc => costMap.set(uc.activityId, Number(uc.unitPrice || 0)));

    const now = new Date();
    let totalPV = 0; // Planned Value (Quanto deveríamos ter gasto até hoje)
    let totalEV = 0; // Earned Value (Quanto realmente produzimos em valor)
    let totalPlannedHH = 0;
    let totalActualHH = 0;

    // Calcular PV e HH Planejado
    schedules.forEach(sched => {
      const unitPrice = costMap.get(sched.activityId) || 0;
      const plannedQty = Number(sched.plannedQuantity || 0);
      const plannedHH = Number(sched.plannedHHH || 0);

      // Se a atividade já deveria ter terminado até hoje, PV = 100% do valor planejado
      // Se está no meio, PV é proporcional (simplificação)
      if (isBefore(new Date(sched.plannedEnd), now)) {
        totalPV += plannedQty * unitPrice;
        totalPlannedHH += plannedHH;
      } else if (isBefore(new Date(sched.plannedStart), now)) {
        // Proporcional ao tempo
        const totalDuration = new Date(sched.plannedEnd).getTime() - new Date(sched.plannedStart).getTime();
        const elapsed = now.getTime() - new Date(sched.plannedStart).getTime();
        const factor = Math.min(1, elapsed / totalDuration);
        totalPV += plannedQty * unitPrice * factor;
        totalPlannedHH += plannedHH * factor;
      }
    });

    // Calcular EV baseado no progresso real
    // Precisamos cruzar ProductionProgress com o valor planejado em Schedule
    const progressMap = new Map<string, number>();
    productionProgress.forEach(pp => {
      const key = `${pp.elementId}-${pp.activityId}`;
      progressMap.set(key, Number(pp.progressPercent || 0) / 100);
    });

    schedules.forEach(sched => {
      const progress = progressMap.get(`${sched.elementId}-${sched.activityId}`) || 0;
      const unitPrice = costMap.get(sched.activityId) || 0;
      const plannedQty = Number(sched.plannedQuantity || 0);
      
      totalEV += plannedQty * unitPrice * progress;
    });

    // Calcular HH Real
    // TimeRecord geralmente é um check-in/check-out. 
    // Se for TYPE=IN e TYPE=OUT, calculamos a diferença.
    // Simplificado para este exemplo: cada record conta como 8h (mock parcial, precisa de lógica de ponto real)
    // TODO: Implementar cálculo real de jornada baseado nos RecordType
    totalActualHH = timeRecords.length * 8; // MOCK até ter lógica de ponto completa

    const spi = totalPV > 0 ? totalEV / totalPV : 1;
    const cpi = totalActualHH > 0 ? (totalEV / (totalActualHH * 50)) : 1; // 50 é um custo médio de HH (mock)

    return {
      spi: Number(spi.toFixed(2)),
      cpi: Number(cpi.toFixed(2)),
      plannedProgress: totalPV, // Aqui deveríamos normalizar para %, mas retornamos valores absolutos para o painel tratar
      actualProgress: totalEV,
      plannedHH: totalPlannedHH,
      actualHH: totalActualHH,
      plannedCost: totalPV, // Simplificado
      actualCost: totalActualHH * 50
    };
  }

  /**
   * Gera dados para a Curva S do projeto (Acumulado Mensal)
   */
  async getSCurveData(projectId: string): Promise<ProductivityData[]> {
    const schedules = await prisma.activitySchedule.findMany({
      where: { element: { projectId } },
      orderBy: { plannedStart: 'asc' }
    });

    if (schedules.length === 0) return [];

    const production = await prisma.mapElementProductionProgress.findMany({
      where: { projectId },
    });

    const unitCosts = await prisma.activityUnitCost.findMany({
      where: { projectId },
    });

    const costMap = new Map<string, number>();
    unitCosts.forEach(uc => costMap.set(uc.activityId, Number(uc.unitPrice || 0)));

    const start = schedules[0].plannedStart;
    const end = schedules[schedules.length - 1].plannedEnd;
    const months = eachMonthOfInterval({ start, end });

    return months.map(month => {
      const monthEnd = endOfMonth(month);
      let monthPlanned = 0;
      let monthActual = 0;

      // Calcular Planejado Acumulado até o fim deste mês
      schedules.forEach(sched => {
        const unitPrice = costMap.get(sched.activityId) || 0;
        const qty = Number(sched.plannedQuantity || 0);
        const pStart = new Date(sched.plannedStart);
        const pEnd = new Date(sched.plannedEnd);

        if (isBefore(pEnd, monthEnd)) {
          monthPlanned += qty * unitPrice;
        } else if (isBefore(pStart, monthEnd)) {
          const totalDuration = pEnd.getTime() - pStart.getTime();
          const elapsed = monthEnd.getTime() - pStart.getTime();
          const factor = Math.min(1, elapsed / totalDuration);
          monthPlanned += qty * unitPrice * factor;
        }
      });

      // Calcular Realizado Acumulado até o fim deste mês
      // Usamos o histórico do production progress se disponível, 
      // ou a data de término (endDate)
      production.forEach(p => {
        const unitPrice = costMap.get(p.activityId) || 0;
        const sched = schedules.find(s => s.elementId === p.elementId && s.activityId === p.activityId);
        const qty = sched ? Number(sched.plannedQuantity || 0) : 1;
        const progress = Number(p.progressPercent || 0) / 100;
        
        // Se temos data de conclusão e ela é antes do fim do mês
        if (p.endDate && isBefore(new Date(p.endDate), monthEnd)) {
          monthActual += qty * unitPrice * progress;
        } else if (p.startDate && isBefore(new Date(p.startDate), monthEnd)) {
          // Simplificação: se iniciou mas não terminou, progresso linear até agora
          monthActual += qty * unitPrice * progress;
        }
      });

      // Normalizar para 0-100% se necessário ou manter valores absolutos
      // O painel do frontend espera algo próximo ou absoluto
      return {
        date: format(month, 'MMM/yy'),
        planned: Number(monthPlanned.toFixed(2)),
        actual: Number(monthActual.toFixed(2))
      };
    });
  }

  /**
   * Obtém desempenho detalhado por equipe
   */
  async getTeamPerformance(projectId: string): Promise<TeamPerformance[]> {
    const teams = await prisma.team.findMany({
      where: { site: { projectId } },
      include: {
        _count: { select: { timeRecords: true } }
      }
    });

    const production = await prisma.mapElementProductionProgress.findMany({
      where: { projectId },
    });

    // Esta é uma visão complexa que exige cruzar quem estava alocado no dia em que a atividade foi concluída.
    // Para a V1, vamos usar uma agregação simplificada baseada no histórico se disponível nas atividades.
    
    return teams.map(team => {
      // Mock logico: encontrar atividades onde o metadados cita a equipe ou o supervisor
      const teamProduction = production.filter(p => {
        const history = p.history as any[];
        return Array.isArray(history) && history.some(h => h.teamId === team.id);
      });

      const executedQty = teamProduction.length;
      const hhReal = (team._count.timeRecords || 0) * 8;
      
      return {
        teamId: team.id,
        teamName: team.name,
        efficiency: hhReal > 0 ? (executedQty / hhReal) * 100 : 0,
        executedQuantity: executedQty
      };
    });
  }

  /**
   * Obtém a distribuição de custos por categoria
   */
  async getCostDistribution(projectId: string): Promise<any[]> {
    const unitCosts = await prisma.activityUnitCost.findMany({
      where: { projectId },
    });

    const categoryMap: Record<string, number> = {
      "Mão de Obra": 0,
      "Materiais": 0,
      "Equipamentos": 0,
      "Indiretos": 0
    };

    unitCosts.forEach(uc => {
      // Mock logico: dividir o preço unitário baseado em categorias aproximadas 
      // Em um sistema real, cada ActivityUnitCost teria sub-itens (insumos)
      const price = Number(uc.unitPrice || 0);
      categoryMap["Mão de Obra"] += price * 0.45;
      categoryMap["Materiais"] += price * 0.30;
      categoryMap["Equipamentos"] += price * 0.15;
      categoryMap["Indiretos"] += price * 0.10;
    });

    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }));
  }
}
