import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BackgroundMonitor } from '../shared/BackgroundMonitor';
import { PermissionsModal } from '../shared/PermissionsModal';
import { ConnectionBanner } from '../shared/ConnectionBanner';
import { isSidebarOpenSignal, isFocusModeSignal } from '@/signals/uiSignals';
import { simulationRoleSignal } from '@/signals/authSignals';
import { getRoleLabel } from '@/utils/roleUtils';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { ShieldAlert, LogOut } from 'lucide-react';

export function AppLayout() {
  useSignals();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const desktopSidebarOpen = isSidebarOpenSignal.value;
  const isFocusMode = isFocusModeSignal.value;

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <BackgroundMonitor />
      <PermissionsModal />

      {!isFocusMode && (
        <Sidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          desktopOpen={desktopSidebarOpen}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {simulationRoleSignal.value && (
          <div className="bg-linear-to-r from-indigo-700 to-indigo-600 text-white px-4 py-1.5 flex items-center justify-between text-[10px] sm:text-xs font-bold tracking-tight shadow-lg z-60 border-b border-indigo-500/30">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse text-indigo-200" />
              <span className="uppercase">Modo Simulação Ativo • {getRoleLabel(simulationRoleSignal.value)}</span>
            </div>
            <button 
              onClick={() => simulationRoleSignal.value = null}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all border border-white/10 active:scale-95"
            >
              <LogOut className="w-3 h-3" />
              Sair da Simulação
            </button>
          </div>
        )}
        <ConnectionBanner />
        {!isFocusMode && (
          <Header onMenuClick={() => setMobileSidebarOpen(true)} />
        )}

        <main className={cn(
          "flex-1 overflow-y-auto",
          !isFocusMode ? "p-4 md:p-6" : "p-0 bg-black/95"
        )}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
