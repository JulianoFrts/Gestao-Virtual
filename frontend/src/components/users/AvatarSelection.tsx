import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const AVATAR_PRESETS = [
    // --- Engenharia ---
    { id: 'engineer', label: 'Engenheiro (3D)', src: '/assets/avatars/engineer.png' },
    { id: 'engineer_toon', label: 'Engenheiro (Cartoon)', src: '/assets/avatars/engineer_toon.png' },
    { id: 'engineer_branded', label: 'Engenheiro (Logo)', src: '/assets/avatars/engineer_branded.png' },
    { id: 'engineer_alt', label: 'Engenheiro (Alt)', src: '/assets/avatars/engineer_alt.png' },

    // --- Gestão ---
    { id: 'manager', label: 'Gestão (3D)', src: '/assets/avatars/manager.png' },
    { id: 'manager_toon', label: 'Gestão (Cartoon)', src: '/assets/avatars/manager_toon.png' },
    { id: 'manager_alt', label: 'Gestão (Alt)', src: '/assets/avatars/manager_alt.png' },

    // --- Operacional ---
    { id: 'worker', label: 'Operacional (3D)', src: '/assets/avatars/worker.png' },
    { id: 'worker_toon', label: 'Operacional (Cartoon)', src: '/assets/avatars/worker_toon.png' },

    // --- Administrativo ---
    { id: 'admin', label: 'Admin (3D)', src: '/assets/avatars/admin.png' },

    // --- Técnico/Suporte ---
    { id: 'tech', label: 'Técnico (3D)', src: '/assets/avatars/tech.png' },
    { id: 'tech_toon', label: 'Técnico (Cartoon)', src: '/assets/avatars/tech_toon.png' },
    { id: 'support_branded', label: 'Suporte (Logo)', src: '/assets/avatars/support_branded.png' },
    { id: 'support_toon', label: 'Suporte (Cartoon)', src: '/assets/avatars/support_toon.png' },
    { id: 'support_alt', label: 'Suporte (Alt)', src: '/assets/avatars/support_alt.png' },
];

interface AvatarSelectionProps {
    onSelect: (base64: string) => void;
    currentImage?: string;
}

export function AvatarSelection({ onSelect, currentImage }: AvatarSelectionProps) {
    const [loadingId, setLoadingId] = React.useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = 150; // Adjust as needed
            if (direction === 'left') {
                container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    const handleSelect = async (preset: typeof AVATAR_PRESETS[0]) => {
        try {
            setLoadingId(preset.id);
            const response = await fetch(preset.src);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = () => {
                const base64 = reader.result as string;
                onSelect(base64);
                setLoadingId(null);
            };

            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Erro ao converter avatar:", error);
            setLoadingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
            <span className="text-[10px] uppercase text-muted-foreground font-black tracking-widest text-center mb-1">
                AVATARES 3D (GESTÃO VIRTUAL)
            </span>
            
            <div className="relative group/carousel flex items-center gap-2">
                {/* Left Arrow */}
                <button
                    type="button"
                    onClick={() => scroll('left')}
                    className="absolute left-0 z-10 w-8 h-full bg-linear-to-r from-black via-black/80 to-transparent flex items-center justify-start pl-1 text-primary/50 hover:text-primary transition-colors opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0"
                    aria-label="Scroll Left"
                >
                    <ChevronLeft className="w-8 h-8 drop-shadow-lg filter" strokeWidth={3} />
                </button>

                {/* Scroll Container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-4 py-4 px-8 scrollbar-hide snap-x snap-mandatory w-full bg-white/5 border-y border-white/5"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {AVATAR_PRESETS.map((avatar) => (
                        <div
                            key={avatar.id}
                            className={cn(
                                "group cursor-pointer relative flex flex-col items-center gap-2 shrink-0 snap-center transition-all duration-300",
                                "opacity-70 hover:opacity-100 hover:scale-110"
                            )}
                            onClick={() => handleSelect(avatar)}
                            title={avatar.label}
                        >
                            <div className={cn(
                                "w-14 h-14 rounded-full overflow-hidden border-2 transition-all shadow-lg relative",
                                currentImage?.includes(avatar.id)
                                    ? "border-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.6)] scale-110 z-10"
                                    : "border-white/10 group-hover:border-white/40 bg-black/40"
                            )}>
                                {loadingId === avatar.id ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black/50">
                                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                                    </div>
                                ) : (
                                    <img
                                        src={avatar.src}
                                        alt={avatar.label}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                )}
                            </div>
                            
                            {/* Label */}
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider absolute -bottom-5 whitespace-nowrap px-2 py-0.5 rounded transition-all duration-300",
                                currentImage?.includes(avatar.id)
                                    ? "bg-primary text-primary-foreground opacity-100 scale-100"
                                    : "bg-black/80 text-white/70 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
                            )}>
                                {avatar.label}
                            </span>
                            
                            {/* Selected Checkmark */}
                            {currentImage?.includes(avatar.id) && (
                                <div className="absolute -top-1 -right-1 bg-primary text-black rounded-full p-[2px] shadow-sm z-20 animate-in zoom-in spin-in-12 duration-300">
                                    <Check className="w-3 h-3" strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Placeholder for "More coming soon" or spacing */}
                    <div className="w-4 shrink-0" />
                </div>

                {/* Right Arrow */}
                <button
                    type="button"
                    onClick={() => scroll('right')}
                    className="absolute right-0 z-10 w-8 h-full bg-linear-to-l from-black via-black/80 to-transparent flex items-center justify-end pr-1 text-primary/50 hover:text-primary transition-colors opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0"
                    aria-label="Scroll Right"
                >
                    <ChevronRight className="w-8 h-8 drop-shadow-lg filter" strokeWidth={3} />
                </button>
                
                {/* Gold Accent Lines (Decorative based on screenshot) */}
                <div className="absolute bottom-0 left-10 right-10 h-0.5 bg-linear-to-r from-transparent via-primary/30 to-transparent pointer-events-none" />
                <div className="absolute top-0 left-10 right-10 h-px bg-linear-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            </div>
        </div>
    );
}
