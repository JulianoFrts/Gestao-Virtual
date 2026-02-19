export interface ProductionSyncRepository {
  syncWorkStages(
    towerId: string,
    activityId: string,
    projectId: string,
    updatedBy: string,
  ): Promise<void>;
}
