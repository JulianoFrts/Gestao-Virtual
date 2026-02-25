import { ActivityStatus } from "../../domain/production.repository";

export interface UpdateProductionProgressDTO {
  elementId: string;
  activityId: string;
  projectId?: string | null;
  status: ActivityStatus;
  progress: number;
  metadata?: Record<string, unknown>;
  userId: string;
  dates?: { start?: string | null; end?: string | null };
  skipSync?: boolean;
}

export interface ActivityStatusDTO {
  activityId: string;
  status: ActivityStatus;
  progressPercent: number;
  startDate?: Date | null;
  endDate?: Date | null;
  plannedStartDate?: Date | null;
  plannedEndDate?: Date | null;
  plannedQuantity?: number | null;
  plannedHhh?: number | null;
  [key: string]: unknown;
}

export interface ElementProgressResponse {
  id: string;
  elementId: string;
  objectId: string | null;
  objectSeq: number | null;
  elementType: string;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  activityStatuses: ActivityStatusDTO[];
  [key: string]: unknown;
}

export interface ProductionLogDTO {
  id?: string;
  progressId: string;
  elementId: string;
  activityId: string;
  timestamp: string | Date;
  status: ActivityStatus;
  progress: number;
  userId: string;
  comment?: string;
  [key: string]: unknown;
}
