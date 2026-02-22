import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BackgroundMonitor } from '../shared/BackgroundMonitor';
import { PermissionsModal } from '../shared/PermissionsModal';
import { ConnectionBanner } from '../shared/ConnectionBanner';
import { isSidebarOpenSignal, isFocusModeSignal } from '@/signals/uiSignals';
import { useSignals } from '@preact/signals-react/runtime';
import { cn } from '@/lib/utils';
import { DevTopBanner } from '../dev/DevTopBanner';


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
        <DevTopBanner />
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
