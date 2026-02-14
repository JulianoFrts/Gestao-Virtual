import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BackgroundMonitor } from '../shared/BackgroundMonitor';
import { PermissionsModal } from '../shared/PermissionsModal';
import { ConnectionBanner } from '../shared/ConnectionBanner';
import { isSidebarOpenSignal } from '@/signals/uiSignals';
import { useSignals } from '@preact/signals-react/runtime';

export function AppLayout() {
  useSignals();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const desktopSidebarOpen = isSidebarOpenSignal.value;

  // Sync mobile state if needed, but usually they are separate
  
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <BackgroundMonitor />
      <PermissionsModal />
      <Sidebar 
        isOpen={mobileSidebarOpen} 
        onClose={() => setMobileSidebarOpen(false)} 
        desktopOpen={desktopSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <ConnectionBanner />
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
