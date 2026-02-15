import { orionApi } from "@/integrations/orion/client";
// import { ProjectMonthlyTarget } from "@/types"; // Type definition handled locally

export interface KPIProjectTargets {
    id: string;
    projectId: string;
    targetMonth: string;
    plannedHours: number;
    plannedProgressPercentage: number;
}

export const kpiService = {
    getMonthlyTargets: async (projectId: string) => {
        const response = await orionApi.get(`/project_monthly_targets?project_id=${projectId}`);
        return response.data as KPIProjectTargets[];
    },

    saveMonthlyTarget: async (target: Omit<KPIProjectTargets, 'id'>) => {
        const response = await orionApi.post('/project_monthly_targets', target);
        return response.data;
    },

    getUnitCosts: async (projectId: string) => {
        const response = await orionApi.get(`/production/costs/config?projectId=${projectId}`);
        return response.data as any[]; // ActivityUnitCost[]
    },

    saveUnitCosts: async (projectId: string, costs: { activityId: string, unitPrice: number, measureUnit: string }[]) => {
        const response = await orionApi.post('/production/costs/config', { projectId, costs });
        return response.data;
    }
};
