export interface TaskEntity {
  id: string;
  type: string;
  payload: Record<string, unknown> | unknown[];
  status: string;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
