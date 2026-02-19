import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, Users, AlertCircle, HardHat, FileSpreadsheet, Building2, LucideIcon } from 'lucide-react';

interface ProjectEmptyStateProps {
    type?: 'workers' | 'projects' | 'costs' | 'analytics' | 'default' | string;
    title: string;
    description: string;
    onAction?: () => void;
    actionLabel?: string;
    hideAction?: boolean;
}

export function ProjectEmptyState({
    type = 'default',
    title,
    description,
    onAction,
    actionLabel,
    hideAction = false,
}: ProjectEmptyStateProps) {
    
    let Icon: LucideIcon = FolderOpen;
    
    switch(type) {
        case 'workers':
            Icon = Users;
            break;
        case 'projects':
            Icon = HardHat;
            break;
        case 'costs':
            Icon = FileSpreadsheet;
            break;
        case 'analytics':
            Icon = Building2;
            break;
        default:
            Icon = AlertCircle;
            break;
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-card/40 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl h-full w-full max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Icon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground mb-8 max-w-md">
                {description}
            </p>
            {!hideAction && onAction && actionLabel && (
                <Button onClick={onAction} className="gradient-primary text-white shadow-glow">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
