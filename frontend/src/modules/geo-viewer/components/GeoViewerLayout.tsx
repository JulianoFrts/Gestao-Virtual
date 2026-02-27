import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { Toaster } from '@/components/ui/toaster'

interface GeoViewerLayoutProps {
  children: ReactNode
  isLoading: boolean
  isFullScreen: boolean
  floatingToolbar: ReactNode
  premiumHeader?: ReactNode
  navigationPills?: ReactNode
  sideMenu?: ReactNode
  statsOverlay?: ReactNode
  contextMenu?: ReactNode
  modals?: ReactNode
}

export function GeoViewerLayout({
  children,
  isLoading,
  isFullScreen,
  floatingToolbar,
  premiumHeader,
  navigationPills,
  sideMenu,
  statsOverlay,
  contextMenu,
  modals,
}: GeoViewerLayoutProps) {
  return (
    <div
      className="fixed inset-0 flex h-screen w-screen flex-col overflow-hidden bg-black font-sans text-white selection:bg-cyan-500/30"
      onContextMenu={e => e.preventDefault()}
    >
      {isLoading && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-xl">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
            <div className="absolute inset-0 animate-pulse bg-emerald-500/20 blur-2xl"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="animate-pulse text-xl font-black tracking-widest text-emerald-400 uppercase italic">
              Sincronizando Dados
            </p>
            <p className="text-[10px] font-bold tracking-[0.4em] text-neutral-500 uppercase">
              Arquitetura OrioN 3D Inspector
            </p>
          </div>
        </div>
      )}

      {/* Floating Toolbar */}
      <div
        className={cn(
          'fixed bottom-10 left-1/2 -translate-x-1/2 transition-all duration-500',
          isFullScreen ? 'z-60' : 'z-50'
        )}
      >
        {floatingToolbar}
      </div>

      {/* Premium Header */}
      {isFullScreen && premiumHeader}

      {/* Main Area */}
      <main
        className={cn(
          'fixed inset-0 flex flex-col overflow-hidden bg-neutral-950 transition-all duration-700 ease-in-out',
          isFullScreen ? 'z-1 rounded-none border-none' : 'z-0'
        )}
      >
        {!isFullScreen && navigationPills}

        <div className="group relative flex-1 overflow-hidden">
          {children}
          {contextMenu}
        </div>

        {statsOverlay}
        {sideMenu}
      </main>

      {modals}
      <Toaster />
    </div>
  )
}
