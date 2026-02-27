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
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Loader2,
  Maximize2,
  Minimize2,
  TowerControl as TowerIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tower } from "../types";

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
  towers: Tower[];
  hiddenTowerIds: Set<string>;
  setHiddenTowerIds: (ids: Set<string>) => void;
  onSelectTower?: (tower: Tower) => void;
  isAutoConnect: boolean;
  setIsAutoConnect: (val: boolean) => void;
  isAutoStructure: boolean;
  setIsAutoStructure: (val: boolean) => void;
  canEdit?: boolean;
  handleAutoConnectSequence?: () => void;
  handleAutoStructure?: () => void;
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
  towers,
  hiddenTowerIds,
  setHiddenTowerIds,
  onSelectTower,
  canEdit,
  isAutoConnect,
  setIsAutoConnect,
  isAutoStructure,
  setIsAutoStructure,
  handleAutoConnectSequence,
  handleAutoStructure
}) => {
  const filteredTowers = towers.filter((t) => {
    const searchLow = (towerSearch || "").toLowerCase();
    const nameMatch = (t.name || "").toLowerCase().includes(searchLow);
    const idMatch = (t.id || "").toLowerCase().includes(searchLow);
    return nameMatch || idMatch;
  });

  const toggleVisibility = (towerId: string) => {
    const next = new Set(hiddenTowerIds);
    if (next.has(towerId)) next.delete(towerId);
    else next.add(towerId);
    setHiddenTowerIds(next);
  };

  return (
    <div
      className={cn(
        "absolute top-20 left-6 z-10 transition-all duration-500 ease-in-out flex flex-col",
        isControlsCollapsed ? "w-12 h-12 overflow-hidden" : "w-80 h-[calc(100vh-120px)]"
      )}
    >
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 text-white flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-6 shrink-0">
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
            className={cn(
               "h-10 w-10 p-0 hover:bg-white/10 shrink-0",
               isControlsCollapsed ? "rounded-2xl absolute inset-1 bg-black/60 shadow-xl" : "rounded-lg"
            )}
          >
            {isControlsCollapsed ? (
              <div className="w-full h-full flex flex-col items-center justify-center pt-1.5 pr-0.5">
                  <Zap className="w-5 h-5 text-primary mb-1 animate-pulse" />
              </div>
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
        </div>

        {!isControlsCollapsed && (
          <div className="flex-1 flex flex-col min-h-0 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Busca */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar torre..."
                value={towerSearch}
                onChange={(e) => setTowerSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl h-10 text-xs"
              />
            </div>

            {/* Ajustes Gerais */}
            <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/5 shrink-0">
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

            {/* Listagem de Torres */}
            <div className="flex-1 flex flex-col min-h-0 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                  Lista de Torres ({filteredTowers.length})
                </h3>
              </div>
              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-1">
                  {filteredTowers.map((tower) => {
                    const isHidden = hiddenTowerIds.has(tower.id);
                    return (
                      <div
                        key={tower.id}
                        className={cn(
                          "group flex items-center justify-between p-2 rounded-xl transition-all hover:bg-white/5",
                          isHidden && "opacity-40"
                        )}
                      >
                        <button
                          onClick={() => onSelectTower?.(tower)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                            isHidden ? "bg-white/5" : "bg-primary/10 group-hover:bg-primary/20"
                          )}>
                            <TowerIcon className={cn("w-3.5 h-3.5", isHidden ? "text-white/40" : "text-primary")} />
                          </div>
                          <span className="text-[11px] font-bold text-white/80 group-hover:text-white transition-colors">
                            {tower.name}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(tower.id)}
                          className="h-7 w-7 rounded-lg hover:bg-white/10"
                        >
                          {isHidden ? (
                            <EyeOff className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-white/40" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                  {filteredTowers.length === 0 && (
                    <div className="text-center py-8 text-[10px] text-white/20 uppercase font-black">
                      Nenhuma torre encontrada
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Ferramentas de Edição e Ações de Sistema */}
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2 shrink-0">
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
                <Button
                  variant={isAutoConnect ? "default" : "secondary"}
                  disabled={!canEdit}
                  onClick={() => setIsAutoConnect(!isAutoConnect)}
                  className={cn(
                    "h-10 rounded-xl text-[10px] font-black uppercase tracking-wider gap-2",
                    isAutoConnect && "bg-orange-500 hover:bg-orange-400 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                  )}
                >
                  <Workflow className="w-3.5 h-3.5" />
                  Auto-Seq
                </Button>
                <Button
                  variant={isAutoStructure ? "default" : "secondary"}
                  disabled={!canEdit}
                  onClick={() => setIsAutoStructure(!isAutoStructure)}
                  className={cn(
                    "h-10 rounded-xl text-[10px] font-black uppercase tracking-wider gap-2",
                    isAutoStructure && "bg-orange-500 hover:bg-orange-400 text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                  )}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Auto-Str
                </Button>
              </div>

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
                disabled={towers.length === 0}
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
