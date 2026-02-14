import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, FileText } from 'lucide-react';
import { useSignals } from "@preact/signals-react/runtime";
import { appProgressSignal, loadingModulesSignal } from '@/signals/appInitSignals';

export function LoadingScreen() {
  useSignals();

  const progress = appProgressSignal.value;
  const modules = loadingModulesSignal.value;

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

              <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  className="stroke-white/5 fill-none"
                  strokeWidth="2"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  className="stroke-primary fill-none transition-all duration-1000 ease-out"
                  strokeWidth="3"
                  strokeDasharray="289.03"
                  strokeDashoffset={289.03 * (1 - progress / 100)}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }}
                />
              </svg>

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
            <div className="space-y-0">
              <h1
                className="font-black tracking-[0.2em] text-white italic drop-shadow-glow flex items-center justify-center gap-1"
                style={{ fontSize: 'clamp(1.5rem, 4vh, 3.5rem)' }}
              >
                {['G','E','S','T','Ã','O'].map((char, i) => (
                  <span key={i} className="animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${i * 40}ms` }}>{char}</span>
                ))}
              </h1>
              <h2
                className="font-black tracking-[0.3em] text-white/5 italic -mt-1"
                style={{ fontSize: 'clamp(1rem, 3vh, 2.5rem)' }}
              >VIRTUAL</h2>
            </div>

            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-px w-8 bg-linear-to-r from-transparent via-primary/30 to-transparent" />
              <span
                className="font-black tracking-[0.4em] text-primary/50 uppercase"
                style={{ fontSize: 'clamp(0.5rem, 1vh, 0.75rem)' }}
              >Protocolo Orion v3</span>
              <div className="h-px w-8 bg-linear-to-l from-transparent via-primary/30 to-transparent" />
            </div>
          </div>
        </div>

        {/* Sync Status Card - Responsive */}
        <div
          className="w-full glass-card bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-xl relative overflow-hidden group"
          style={{ padding: 'clamp(12px, 2vh, 24px)', maxWidth: 'clamp(280px, 40vw, 380px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-[1.5vh]">
            <div className="space-y-0.5">
              <h3
                className="font-black tracking-[0.2em] text-white/30 uppercase"
                style={{ fontSize: 'clamp(0.5rem, 0.9vh, 0.625rem)' }}
              >Sincronização de Dados</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_hsl(var(--primary))]" />
                <span
                  className="font-bold text-primary tracking-wider uppercase"
                  style={{ fontSize: 'clamp(0.5rem, 0.9vh, 0.625rem)' }}
                >
                  {progress < 100 ? 'Active_Sync' : 'Ready_State'}
                </span>
              </div>
            </div>
            <FileText className="w-4 h-4 text-white/10" />
          </div>

          <div className="space-y-[0.8vh]">
            {modules.map((step, idx) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center justify-between rounded-lg transition-all duration-500",
                  step.status === 'completed' ? "bg-white/3 border border-white/5" : "bg-transparent"
                )}
                style={{
                  padding: 'clamp(6px, 1vh, 12px) clamp(10px, 1.5vh, 16px)',
                  transitionDelay: `${idx * 60}ms`
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-all duration-500",
                    step.status === 'completed' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                    step.status === 'loading' ? "bg-primary animate-pulse scale-110" : "bg-white/10"
                  )} />
                  <span
                    className={cn(
                      "font-bold uppercase tracking-[0.15em] transition-all duration-500",
                      step.status === 'completed' ? "text-white/60" :
                      step.status === 'loading' ? "text-primary brightness-110" : "text-white/10"
                    )}
                    style={{ fontSize: 'clamp(0.5rem, 1vh, 0.75rem)' }}
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
