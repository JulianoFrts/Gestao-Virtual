export interface GanttRepository {
    listWorkStagesByProject(projectId: string): Promise<any[]>;
    listSchedulesByProject(projectId: string): Promise<any[]>;
}
