export interface TimeRecord {
    id: string;
    userId: string;
    type: 'entry' | 'exit';
    timestamp: Date;
    latitude?: number | null;
    longitude?: number | null;
    createdById: string;
}
