import { useMemo } from 'react';
import { WorkStage } from './useWorkStages';
import { TimeRecord } from './useTimeRecords';

export function useGAPOAnalytics(stages: WorkStage[], timeRecords: TimeRecord[]) {

    // 1. Calculate weighted physical progress
    const physicalProgressData = useMemo(() => {
        if (!stages.length) return { totalActual: 0, totalPlanned: 0 };

        const totalWeight = stages.reduce((acc, s) => acc + (s.weight || 0), 0);
        if (totalWeight === 0) return { totalActual: 0, totalPlanned: 0 };

        // Ensure we handle both 0-1 and 0-100 formats (normalize to 0-1)
        const normalize = (val: number) => val > 1.1 ? val / 100 : val;

        const actual = stages.reduce((acc, s) => {
            const val = normalize(s.progress?.actualPercentage || 0);
            return acc + (val * (s.weight || 0));
        }, 0) / totalWeight;

        const planned = stages.reduce((acc, s) => {
            const val = normalize(s.progress?.plannedPercentage || 0);
            return acc + (val * (s.weight || 0));
        }, 0) / totalWeight;

        return {
            totalActual: actual,
            totalPlanned: planned
        };
    }, [stages]);

    // 2. Correlation between HH (Hours) and Progress
    const hhEfficiency = useMemo(() => {
        if (!timeRecords.length || !physicalProgressData.totalActual) return 0;

        // Total hours: in this system, timeRecords are check-ins. 
        // We'll estimate each record as an average work block if no duration is present.
        const totalHH = timeRecords.length * 8.8; // Average shift for display
        
        // Efficiency is Progress / Hours. We want a readable index.
        return (physicalProgressData.totalActual * 1000) / totalHH;
    }, [timeRecords, physicalProgressData]);

    // 3. S-Curve Data (Mocking temporal distribution)
    const sCurveData = useMemo(() => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        const currentActual = physicalProgressData.totalActual * 100;
        const currentPlanned = physicalProgressData.totalPlanned * 100;

        return months.map((m, i) => {
            const factor = (i + 1) / months.length;
            return {
                month: m,
                planned: Number((currentPlanned * factor).toFixed(1)),
                actual: Number((currentActual * factor * (0.9 + Math.random() * 0.2)).toFixed(1))
            };
        });
    }, [physicalProgressData]);

    return {
        physicalProgressData,
        hhEfficiency,
        sCurveData
    };
}
