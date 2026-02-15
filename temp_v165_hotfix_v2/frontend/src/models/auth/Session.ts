// NextAuth Session Model
export interface Session {
    id: string;
    sessionToken: string;
    userId: string;
    expires: Date;
}
