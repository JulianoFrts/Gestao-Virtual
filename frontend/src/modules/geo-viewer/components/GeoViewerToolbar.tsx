import React from "react";
import { Button } from "@/components/ui/button";
import {
  List,
  Zap,
  RefreshCw,
  Maximize2,
  Link2,
  Workflow,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompletedWorkModal } from "./CompletedWorkModal";

interface GeoViewerToolbarProps {
  showTowerMenu: boolean;
  toggleTowerMenu: () => void;
  showCableMenu: boolean;
  toggleCableMenu: () => void;
  canSeeExecutivePanel: boolean;
  selectedProjectId: string | null;
  handleSelectTowerFromModal: (id: string) => void;
  setIsExecutivePanelOpen: (open: boolean) => void;
  hiddenTowerIds: Set<string>;
  setHiddenTowerIds: (ids: Set<string>) => void;
  handleSnapToTerrain: (a: boolean, b: boolean) => void;
  handleAutoRotateTowers: () => void;
  handleFitToTowers: () => void;
  isConnectMode: boolean;
  setIsConnectMode: (mode: boolean) => void;
  isSwapMode: boolean;
  setIsSwapMode: (mode: boolean) => void;
  canEdit: boolean;
  handleAutoConnectSequence: () => void;
  isFullScreen: boolean;
}

export const GeoViewerToolbar: React.FC<GeoViewerToolbarProps> = ({
  showTowerMenu,
  toggleTowerMenu,
  showCableMenu,
  toggleCableMenu,
  canSeeExecutivePanel,
  selectedProjectId,
  handleSelectTowerFromModal,
  setIsExecutivePanelOpen,
  hiddenTowerIds,
  setHiddenTowerIds,
  handleSnapToTerrain,
  handleAutoRotateTowers,
  handleFitToTowers,
  isConnectMode,
  setIsConnectMode,
  isSwapMode,
  setIsSwapMode,
  canEdit,
  handleAutoConnectSequence,
  isFullScreen,
}) => {
  return (
    <div
      className={cn(
        "fixed bottom-10 left-1/2 -translate-x-1/2 transition-all duration-500",
        isFullScreen ? "z-60" : "z-50"
      )}
    >
      <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-4xl shadow-2xl p-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-3xl border border-white/5">
          <Button
            variant="ghost"
            className={cn(
              "h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all gap-3",
              showTowerMenu ? "bg-emerald-500 text-black shadow-lg" : "text-neutral-400 hover:text-emerald-400"
            )}
            onClick={toggleTowerMenu}
          >
            <List className="w-4 h-4" />
            <span>Torres</span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all gap-3",
              showCableMenu ? "bg-cyan-500 text-black shadow-lg" : "text-neutral-400 hover:text-cyan-400"
            )}
            onClick={toggleCableMenu}
          >
            <Zap className="w-4 h-4" />
            <span>Cabos</span>
          </Button>

          <div className="w-px h-8 bg-white/10 mx-1" />

          {canSeeExecutivePanel && (
            <CompletedWorkModal
              projectId={selectedProjectId || undefined}
              onSelectTower={handleSelectTowerFromModal}
              onOpenChange={setIsExecutivePanelOpen}
              hiddenTowerIds={hiddenTowerIds}
              onHiddenTowerIdsChange={setHiddenTowerIds}
            />
          )}
        </div>

        <div className="w-px h-8 bg-white/10 mx-1" />

        <div className="flex items-center gap-1.5">
          {[
            {
              icon: RefreshCw,
              label: "Snap",
              onClick: () => handleSnapToTerrain(false, true),
              color: "text-orange-400",
            },
            {
              icon: RefreshCw,
              label: "Rotate",
              onClick: () => handleAutoRotateTowers(),
              color: "text-blue-400",
            },
            {
              icon: Maximize2,
              label: "Fit",
              onClick: () => handleFitToTowers(),
              color: "text-emerald-400",
            },
            {
              icon: Link2,
              label: "Connect",
              active: isConnectMode,
              onClick: () => {
                if (!canEdit) return;
                setIsConnectMode(!isConnectMode);
                setIsSwapMode(false);
              },
              color: "text-orange-500",
              disabled: !canEdit,
            },
            {
              icon: Workflow,
              label: "Auto-Seq",
              onClick: () => canEdit && handleAutoConnectSequence(),
              color: "text-indigo-400",
              disabled: !canEdit,
            },
            {
              icon: ArrowLeftRight,
              label: "Pos Estructure",
              active: isSwapMode,
              onClick: () => {
                if (!canEdit) return;
                setIsSwapMode(!isSwapMode);
                setIsConnectMode(false);
              },
              color: "text-rose-400",
              disabled: !canEdit,
            },
          ].map((tool, idx) => (
            <Button
              key={idx}
              variant="ghost"
              disabled={tool.disabled}
              className={cn(
                "h-11 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2.5 transition-all border border-transparent",
                tool.active ? "bg-white/10 border-white/10 shadow-inner" : "text-neutral-500 hover:bg-white/5 hover:border-white/5",
                tool.disabled && "opacity-20 cursor-not-allowed grayscale"
              )}
              onClick={tool.onClick}
            >
              <tool.icon className={cn("w-4.5 h-4.5", tool.color)} />
              <span className="hidden md:inline-block">{tool.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
