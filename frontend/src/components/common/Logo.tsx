import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, variant = 'full', size = 'md' }: LogoProps) {
  // Option 2 Refined: Construction & Energy Theme
  // Icon: Stylized Transmission Tower (Linha de Transmissão)
  // Colors: Cyan (Tech) + Amber/Orange (Energy/Construction)

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div className={cn(
        "relative flex items-center justify-center font-bold text-foreground shrink-0",
        variant === 'icon' 
          ? "w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg border border-amber-500/30" 
          : ""
      )}>
        {/* Custom SVG Icon: Transmission Tower */}
        <div className={cn("relative z-10", variant === 'icon' ? "scale-75" : "scale-100")}>
           <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
             {/* Tech Grid Background (Subtle) */}
             <path d="M20 2L20 38" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 2" />
             <path d="M2 20L38 20" stroke="#06b6d4" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2 2" />
             
             {/* Transmission Tower Structure */}
             <path d="M20 4L12 36H28L20 4Z" stroke="url(#paint0_linear)" strokeWidth="2" strokeLinejoin="round" />
             <path d="M14 28H26" stroke="url(#paint0_linear)" strokeWidth="1.5" strokeLinecap="round" />
             <path d="M16 20H24" stroke="url(#paint0_linear)" strokeWidth="1.5" strokeLinecap="round" />
             <path d="M18 12H22" stroke="url(#paint0_linear)" strokeWidth="1.5" strokeLinecap="round" />
             
             {/* Energy Lines / Cables */}
             <path d="M2 14C8 16 12 16 16 14" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.8" />
             <path d="M24 14C28 16 32 16 38 14" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.8" />
             
             {/* Energy Glow (Top) */}
             <circle cx="20" cy="4" r="2" fill="#ef4444" className="animate-pulse">
               <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
             </circle>

             <defs>
               <linearGradient id="paint0_linear" x1="20" y1="4" x2="20" y2="36" gradientUnits="userSpaceOnUse">
                 <stop stopColor="#e2e8f0" />
                 <stop offset="1" stopColor="#94a3b8" />
               </linearGradient>
             </defs>
           </svg>
        </div>
        
        {variant === 'full' && (
           <div className="flex flex-col border-l-2 border-amber-500/50 pl-3">
             <div className="flex items-baseline gap-1">
                <h1 className="text-lg md:text-xl font-black tracking-wide text-foreground uppercase leading-none drop-shadow-md whitespace-nowrap" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  GESTÃO
                </h1>
                <span className="text-lg md:text-xl font-black tracking-wide text-amber-500 uppercase leading-none whitespace-nowrap" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  VIRTUAL
                </span>
             </div>
             
             <div className="flex items-center justify-between w-full mt-0.5">
                <span className="text-[8px] md:text-[9px] font-bold tracking-[0.15em] text-cyan-400 uppercase whitespace-nowrap">
                  Software Solutions
                </span>
                {/* Micro decorative elements */}
                <div className="flex gap-0.5">
                   <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                   <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse delay-75" />
                   <div className="w-1 h-1 bg-white rounded-full animate-pulse delay-150" />
                </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
