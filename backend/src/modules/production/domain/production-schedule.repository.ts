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
  findSchedule(elementId: string, activityId: string): Promise<any | null>;
  findSchedulesBatch(
    elementIds: string[],
    activityIds: string[],
  ): Promise<any[]>;
  findScheduleByElement(
    elementId: string,
    activityId: string,
  ): Promise<any | null>;
  findScheduleById(id: string): Promise<any | null>;
  saveSchedule(data: any): Promise<any>;
  deleteSchedule(id: string): Promise<void>;
  deleteSchedulesBatch(ids: string[]): Promise<number>;
  findSchedulesByScope(params: {
    projectId?: string;
    companyId?: string;
    elementId?: string;
    activityId?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<any[]>;
  splitSchedule(id: string, updateData: any, createData: any): Promise<void>;
}
