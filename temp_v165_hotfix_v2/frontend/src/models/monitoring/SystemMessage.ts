export interface SystemMessage {
    id: string;
    recipientId: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    read: boolean;
    createdAt: Date;
}
