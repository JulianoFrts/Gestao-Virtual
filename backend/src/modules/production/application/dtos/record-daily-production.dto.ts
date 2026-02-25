export interface RecordDailyProductionDTO {
  elementId: string;
  activityId: string;
  projectId: string;
  date: string;
  data: {
    teamId?: string | null;
    workersCount: number;
    hoursWorked: number;
    producedQuantity?: number | null;
    plannedQuantity?: number | null;
    [key: string]: unknown;
  };
  userId: string;
}
