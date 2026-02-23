export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
export type LandStatus = 'FREE' | 'EMBARGO' | 'IMPEDIMENT';
export type ImpedimentType = 'NONE' | 'OWNER' | 'CONTRACTOR' | 'PROJECT' | 'WORK';

export interface ProductionActivity {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    weight: number;
    order: number;
    productionActivityId?: string | null;
    stageId?: string;
    metadata?: any;
}

export interface ProductionCategory {
    id: string;
    name: string;
    description: string | null;
    order: number;
    activities: ProductionActivity[];
}

export interface ActivityAssignment {
    id: string;
    teamId: string | null;
    userId: string | null;
    team?: {
        name: string;
    };
}

export interface TowerActivityStatus {
    id: string;
    elementId: string;
    activityId: string;
    status: ActivityStatus;
    landStatus: LandStatus;
    impedimentType: ImpedimentType;
    startDate: string | null;
    endDate: string | null;
    progressPercent: number | null;
    requiresApproval?: boolean;
    approvalStatus?: string;
    notes: string | null;
    metadata: any | null;
    history?: any[];
    dailyProduction?: Record<string, number>;
    activity: ProductionActivity;
    assignments: ActivityAssignment[];
}

export interface ActivitySchedule {
    id: string;
    elementId: string;
    activityId: string;
    plannedStart: string;
    plannedEnd: string;
    plannedQuantity: number | null;
    plannedHours: number | null;
}

export interface DelayReason {
    id: string;
    code: string;
    description: string;
    category: ImpedimentType;
}

export interface HistoryLog {
    id: string;
    progressId: string;
    elementId: string;
    activityId: string;
    status: string;
    progress: number;
    notes: string;
    timestamp: string;
    userName: string;
    approvedBy?: string;
    requiresApproval?: boolean;
    isApproved?: boolean;
    approvedAt?: string;
    metadata?: any;
}

export interface TowerProductionData {
    id: string;
    elementId: string; // Unified mapping
    objectId: string;
    objectSeq: number;
    towerType: string | null;
    trecho: string | null;
    tipoFundacao: string | null;
    totalConcreto: number | null;
    pesoArmacao: number | null;
    pesoEstrutura: number | null;
    tramoLancamento: string | null;
    tipificacaoEstrutura: string | null;
    goForward: number | null;
    technicalKm: number | null;
    metadata?: any;
    activityStatuses: TowerActivityStatus[];
    activitySchedules: ActivitySchedule[];
    overallStatus?: ActivityStatus;
}
