export interface TeamMember {
    id: string;
    teamId: string;
    userId: string;
    role?: string;
    joinedAt: Date;
}
