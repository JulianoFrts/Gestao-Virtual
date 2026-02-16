import React from 'react';
import { cn } from '@/lib/utils'; // Assuming this exists, based on previous files

interface SqlEditorProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function SqlEditor({ value, onChange, className }: SqlEditorProps) {
    return (
        <div className={cn("relative w-full h-full bg-zinc-950 rounded-xl border border-white/10 overflow-hidden flex flex-col group", className)}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 w-full p-4 bg-transparent text-cyan-50 font-mono text-sm resize-none focus:outline-none placeholder:text-white/20"
                spellCheck={false}
                placeholder="-- Digite sua query SQL aqui..."
            />
        </div>
    );
}
