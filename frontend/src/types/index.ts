export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: 'admin' | 'supervisor' | 'worker';
  createdAt: Date;
}

export interface JobFunction {
  id: string;
  name: string;
  canLeadTeam: boolean;
  description?: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  functionId: string;
  functionName?: string;
  photoUrl?: string;
  canLeadTeam?: boolean;
  active: boolean;
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  supervisorId: string;
  supervisorName?: string;
  members: string[];
  active: boolean;
  createdAt: Date;
}

export interface TimeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  teamId: string;
  photoUrl: string;
  timestamp: Date;
  type: 'entry' | 'exit';
  latitude?: number;
  longitude?: number;
  syncedAt?: Date;
}

export interface DailyReport {
  id: string;
  teamId: string;
  date: Date;
  activities: string;
  comments?: string;
  supervisorId: string;
  createdAt: Date;
  syncedAt?: Date;
}

export interface SyncQueueItem {
  id: string;
  type: 'timeRecord' | 'dailyReport' | 'employee' | 'team';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  createdAt: Date;
  attempts: number;
}
