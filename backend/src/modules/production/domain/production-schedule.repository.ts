export interface ProductionSchedule {
  id?: string;
  elementId: string;
  activityId: string;
  plannedStart: Date;
  plannedEnd: Date;
  plannedQuantity?: number;
  plannedHhh?: number;
  createdById?: string;
  updatedAt?: Date;
  createdAt?: Date;
}

export interface ProductionScheduleRepository {
  findSchedule(
    elementId: string,
    activityId: string,
  ): Promise<ProductionSchedule | null>;
  findSchedulesBatch(
    elementIds: string[],
    activityIds: string[],
  ): Promise<ProductionSchedule[]>;
  findScheduleByElement(
    elementId: string,
    activityId: string,
  ): Promise<ProductionSchedule | null>;
  findScheduleById(id: string): Promise<ProductionSchedule | null>;
  saveSchedule(data: Partial<ProductionSchedule>): Promise<ProductionSchedule>;
  deleteSchedule(id: string): Promise<void>;
  deleteSchedulesBatch(ids: string[]): Promise<number>;
  findSchedulesByScope(params: {
    projectId?: string;
    companyId?: string;
    elementId?: string;
    activityId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<ProductionSchedule[]>;
  splitSchedule(
    id: string,
    updateData: Partial<ProductionSchedule>,
    createData: Partial<ProductionSchedule>,
  ): Promise<void>;
}
