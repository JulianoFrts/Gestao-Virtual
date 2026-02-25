import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  Workflow,
  ArrowLeftRight,
  Zap,
  EyeOff,
  RefreshCw,
  Save,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoViewerSidebarProps {
  isControlsCollapsed: boolean;
  setIsControlsCollapsed: (collapsed: boolean) => void;
  towerSearch: string;
  setTowerSearch: (search: string) => void;
  towerElevation: number;
  setTowerElevation: (elevation: number) => void;
  scale: number;
  setScale: (scale: number) => void;
  isConnectMode: boolean;
  setIsConnectMode: (mode: boolean) => void;
  isSwapMode: boolean;
  setIsSwapMode: (mode: boolean) => void;
  isSaving: boolean;
  handleSave: () => void;
  isFullScreen: boolean;
  setIsFullScreen: (full: boolean) => void;
  handleClearTowers: () => void;
  handleFitToTowers: () => void;
  towersCount: number;
}

export const GeoViewerSidebar: React.FC<GeoViewerSidebarProps> = ({
  isControlsCollapsed,
  setIsControlsCollapsed,
  towerSearch,
  setTowerSearch,
  towerElevation,
  setTowerElevation,
  scale,
  setScale,
  isConnectMode,
  setIsConnectMode,
  isSwapMode,
  setIsSwapMode,
  isSaving,
  handleSave,
  isFullScreen,
  setIsFullScreen,
  handleClearTowers,
  handleFitToTowers,
  towersCount,
}) => {
  return (
    <div
      className={cn(
        "absolute top-20 left-6 z-10 transition-all duration-500 ease-in-out",
        isControlsCollapsed ? "w-12 h-12 overflow-hidden" : "w-80"
      )}
    >
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            {!isControlsCollapsed && (
              <h2 className="font-black uppercase tracking-tighter text-sm">
                Controles 3D
              </h2>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="h-8 w-8 p-0 rounded-lg hover:bg-white/10"
          >
            {isControlsCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
        </div>

        {!isControlsCollapsed && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar torre..."
                value={towerSearch}
                onChange={(e) => setTowerSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl h-10 text-xs"
              />
            </div>

            {/* Ajustes Gerais */}
            <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase text-white/40 tracking-widest">
                  <span>Elevação Torres</span>
                  <span className="text-primary">{towerElevation}m</span>
                </div>
                <Slider
                  value={[towerElevation]}
                  min={0}
                  max={20}
                  step={0.5}
                  onValueChange={([val]) => setTowerElevation(val)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase text-white/40 tracking-widest">
                  <span>Escala Vertical</span>
                  <span className="text-primary">{scale}%</span>
                </div>
                <Slider
                  value={[scale]}
                  min={10}
                  max={200}
                  onValueChange={([val]) => setScale(val)}
                />
              </div>
            </div>

            {/* Ferramentas de Edição */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={isConnectMode ? "default" : "secondary"}
                onClick={() => {
                  setIsConnectMode(!isConnectMode);
                  setIsSwapMode(false);
                }}
                className="h-10 rounded-xl text-[10px] font-black uppercase tracking-wider gap-2"
              >
                <Workflow className="w-3.5 h-3.5" />
                Conectar
              </Button>
              <Button
                variant={isSwapMode ? "default" : "secondary"}
                onClick={() => {
                  setIsSwapMode(!isSwapMode);
                  setIsConnectMode(false);
                }}
                className="h-10 rounded-xl text-[10px] font-black uppercase tracking-wider gap-2"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Trocar
              </Button>
            </div>

            {/* Ações de Sistema */}
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full h-11 rounded-xl font-black uppercase tracking-widest gap-3 shadow-lg shadow-primary/20"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Layout
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={handleFitToTowers}
                  className="h-10 rounded-xl text-[10px] font-black uppercase tracking-wider gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Centralizar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-10 rounded-xl text-[10px] font-black uppercase tracking-wider gap-2"
                >
                  {isFullScreen ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                  {isFullScreen ? "Janela" : "Full"}
                </Button>
              </div>

              <Button
                variant="destructive"
                onClick={handleClearTowers}
                disabled={towersCount === 0}
                className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Tudo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
