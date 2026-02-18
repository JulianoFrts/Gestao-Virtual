import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, CircleCheck, FileText, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { useSignals } from "@preact/signals-react/runtime";
import { appProgressSignal, loadingModulesSignal } from '@/signals/appInitSignals';
import { logoUrlSignal } from '@/signals/settingsSignals';
import { Button } from "@/components/ui/button";

export function LoadingScreen() {
  useSignals();

  const progress = appProgressSignal.value;
  const modules = loadingModulesSignal.value;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#030712] overflow-hidden select-none">
      {/* Background Cinematic Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.02)_0%,transparent_70%)]" />
      </div>

      {/* Main Container - Responsive with viewport units */}
      <div className="relative w-[90vw] max-w-[420px] px-4 flex flex-col items-center gap-[3vh] z-10">

        {/* Core Layout - Logic and Progress */}
        <div className="w-full flex flex-col items-center gap-[2vh]">

          {/* Circular Progress & Info - Responsive sizing based on viewport */}
          <div className="relative group">
            <div
              className="relative flex items-center justify-center"
              style={{ width: 'clamp(100px, 15vh, 180px)', height: 'clamp(100px, 15vh, 180px)' }}
            >
              {/* Animated Glow Layers */}
              <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl animate-pulse" />

              {/* Unified Rotating Container for Perfect Sync */}
              <div className="absolute inset-0 animate-[spin_1.5s_linear_infinite]">

                {/* 1. Module Status Indicators (The Ring of Dots) */}
                {modules.map((m, i) => {
                  const total = modules.length || 1;
                  const angle = (i * (360 / total)) - 90;
                  const isCompleted = m.status === 'completed';
                  const isActive = m.status === 'loading';

                  return (
                    <div
                      key={m.id}
                      className="absolute inset-0"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <div
                        className={cn(
                          "absolute top-1/2 left-[96%] w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full transition-all duration-300",
                          isCompleted ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] border border-emerald-200/50 scale-110" :
                            isActive ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))] scale-125" :
                              "bg-primary/30"
                        )}
                        style={{
                          transform: `rotate(-${angle}deg)` // Counter-rotate to keep lighting/shadow consistent if needed, mostly style choice here
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Central Info - Responsive text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-baseline">

                  <span
                    className="font-black text-white tracking-tighter tabular-nums drop-shadow-glow"
                    style={{ fontSize: 'clamp(1.5rem, 4vh, 3rem)' }}
                  >
                    {Math.round(progress)}
                  </span>

                  <span
                    className="font-black text-primary/70 ml-0.5"
                    style={{ fontSize: 'clamp(0.75rem, 1.5vh, 1.25rem)' }}
                  >%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Identity - Responsive text sizes */}
          <div className="text-center space-y-1 pointer-events-none select-none">
            <div className="space-y-0 flex flex-col items-center">
                {logoUrlSignal.value ? (
                    <img 
                        src={logoUrlSignal.value} 
                        alt="Logo" 
                        className="animate-in zoom-in-50 duration-700 drop-shadow-glow object-contain"
                        style={{ 
                            maxHeight: 'clamp(60px, 12vh, 100px)',
                            maxWidth: '80%'
                        }}
                    />
                ) : (
                    <>
                      <h1
                        className="font-black tracking-[0.2em] text-white italic drop-shadow-glow flex items-center justify-center gap-1"
                        style={{ fontSize: 'clamp(1.5rem, 4vh, 3.5rem)' }}
                      >
                        {['G', 'E', 'S', 'T', 'Ã', 'O'].map((char, i) => (
                          <span key={i} className="animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${i * 40}ms` }}>{char}</span>
                        ))}
                      </h1>
                      <h2
                        className="font-black tracking-[0.3em] text-white/5 italic -mt-1"
                        style={{ fontSize: 'clamp(1rem, 3vh, 2.5rem)' }}
                      >VIRTUAL</h2>
                    </>
                )}
            </div>

            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-px w-8 bg-linear-to-r from-transparent via-primary/30 to-transparent" />
              <span
                className="font-black tracking-[0.4em] text-primary/50 uppercase"
                style={{ fontSize: 'clamp(0.5rem, 1vh, 0.75rem)' }}
              >Software Solutions</span>
              <div className="h-px w-8 bg-linear-to-l from-transparent via-primary/30 to-transparent" />
            </div>
          </div>
        </div>

        {/* Sync Status Card - Responsive */}
        <div
          className="w-full glass-card bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl relative overflow-hidden group"
          style={{ padding: 'clamp(10px, 2vh, 20px)', maxWidth: 'clamp(160px, 40vw, 400px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-center mb-[1.5vh] relative min-h-[32px]">
            <div className="space-y-0.5 text-center">
              <h3
                className="font-black tracking-[0.2em] text-white/30 uppercase"
                style={{ fontSize: 'clamp(0.5rem, 0.9vh, 0.625rem)' }}
              >Sincronização de Dados</h3>
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_hsl(var(--primary))]" />
                <span
                  className="font-bold text-primary tracking-wider uppercase"
                  style={{ fontSize: 'clamp(0.5rem, 0.9vh, 0.625rem)' }}
                >
                  {progress < 100 ? 'Active_Sync' : 'Ready_State'}
                </span>
              </div>
            </div>
            
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 text-white/30 hover:text-white hover:bg-white/10 absolute right-0 top-1/2 -translate-y-1/2"
            >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          <div className={cn(
              "space-y-[0.8vh] transition-all duration-500 ease-in-out overflow-hidden",
              isExpanded ? "max-h-[60vh] opacity-100" : "max-h-0 opacity-0"
          )}>
            {modules.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center justify-between rounded-lg transition-all duration-500",
                  step.status === 'completed' ? "bg-white/3 border border-white/10" : "bg-transparent"
                )}
                style={{
                  padding: 'clamp(6px, 1vh, 12px) clamp(10px, 1.5vh, 16px)',
                  transitionDelay: `${idx * 30}ms`
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    step.status === 'completed' ? "bg-emerald-500 shadow-[0_0_11px_rgba(16,185,129,0.5)]" :
                      step.status === 'loading' ? "bg-primary animate-pulse scale-190" : "bg-white/10"
                  )} />
                  <span
                    className={cn(
                      "font-bold uppercase tracking-[0.15em] transition-all duration-300",
                      step.status === 'completed' ? "text-white/60" :
                        step.status === 'loading' ? "text-primary brightness-110" : "text-white/10"
                    )}
                    style={{ fontSize: 'clamp(0.5rem, 1vh, 0.75rem )' }}
                  >
                    {step.label}
                  </span>
                </div>
                {step.status === 'loading' && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary/50" />
                )}
                {step.status === 'completed' && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500/40" />
                )}
                {step.status !== 'loading' && step.status !== 'completed' && (
                  <CircleCheck className="h-3 w-3 text-primary/60 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center opacity-20">
          <p
            className="font-bold text-white uppercase tracking-[0.5em]"
            style={{ fontSize: 'clamp(0.4rem, 0.8vh, 0.5rem)' }}
          >
            Digital Ecosystem • Enterprise v3.0
          </p>
        </div>
      </div>
    </div>
  );
}
