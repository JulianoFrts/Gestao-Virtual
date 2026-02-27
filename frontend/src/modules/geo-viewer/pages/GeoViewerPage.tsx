import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Map as ReactMap, useControl, Source } from "react-map-gl/mapbox";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { AmbientLight, DirectionalLight, LightingEffect } from "@deck.gl/core";
import "mapbox-gl/dist/mapbox-gl.css";

import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { useMapControl } from "../hooks/useMapControl";
import { useSceneData } from "../hooks/useSceneData";
import { useProjectData } from "../hooks/useProjectData";
import { GeoViewerSidebar } from "../components/GeoViewerSidebar";
import { GeoViewerHeader } from "../components/GeoViewerHeader";
import { GeoViewerToolbar } from "../components/GeoViewerToolbar";
import { TowerDetailsModals } from "@/components/map/TowerDetailsModals";
import { TowerExecutionHistoryModal } from "@/components/map/TowerExecutionHistoryModal";
import { CableConfigModal } from "@/components/map/CableConfigModal";
import { DEFAULT_PHASES } from "../constants/map-config";
import { Tower, Cable, PhaseConfig } from "../types";
import { CompletedWorkModal } from "../components/CompletedWorkModal";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY;

// Lighting Setup
const ambientLight = new AmbientLight({ color: [255, 255, 255], intensity: 2.2 });
const dirLight = new DirectionalLight({ color: [255, 255, 255], intensity: 2.5, direction: [-1, -2, -3] });
const rimLight = new DirectionalLight({ color: [200, 220, 255], intensity: 1.5, direction: [1, 2, 1] });
const lightingEffect = new LightingEffect({ ambientLight, dirLight, rimLight });

function DeckGLOverlay(props: any) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({ ...props, effects: [lightingEffect] }), { interleaved: true });
  useEffect(() => { if (overlay) overlay.setProps({ ...props, effects: [lightingEffect] }); }, [props, overlay]);
  return null;
}

export default function GeoViewerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can } = usePermissions();
  const { profile } = useAuth();

  // Custom Hooks
  const { viewState, setViewState, mapRef, handleFitToTowers, flyToTower } = useMapControl();
  const { towers, setTowers, cables, setCables, signalSpheres, connections } = useSceneData();
  const { projects, selectedProjectId, handleProjectSelect, isLoading } = useProjectData();

  // UI States (to be extracted further)
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(true);
  const [showTowerMenu, setShowTowerMenu] = useState(false);
  const [showCableMenu, setShowCableMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [towerSearch, setTowerSearch] = useState("");
  const [towerElevation, setTowerElevation] = useState(4.0);
  const [scale, setScale] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [hiddenTowerIds, setHiddenTowerIds] = useState<Set<string>>(new Set());
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [isSwapMode, setIsSwapMode] = useState(false);

  // Modals
  const [selectedTowerForDetails, setSelectedTowerForDetails] = useState<Tower | null>(null);
  const [isTowerModalOpen, setIsTowerModalOpen] = useState(false);
  const [selectedTowerForHistory, setSelectedTowerForHistory] = useState<Tower | null>(null);
  const [isExecutionHistoryModalOpen, setIsExecutionHistoryModalOpen] = useState(false);

  const [phases, setPhases] = useState<PhaseConfig[]>(() => {
    const saved = localStorage.getItem("orion-cable-config");
    return saved ? JSON.parse(saved) : DEFAULT_PHASES;
  });

  const canEdit = can("map.edit");
  const canManage = can("map.manage");
  const canSeeExecutivePanel = profile?.isSystemAdmin || (profile?.permissionsMap as any)?.["system.All_Access"] || ["SUPER_ADMIN_GOD", "HELPER_SYSTEM"].includes(profile?.role || "");

  // Placeholder Handlers (logic still in migration)
  const handleSaveConfig = () => { toast({ title: "Salvando...", description: "Implementando persistência modular." }); };
  const handleClearTowers = () => { setIsClearing(true); setTimeout(() => { setTowers([]); setIsClearing(false); setIsClearConfirmOpen(false); }, 1000); };
  const handleTowerClick = useCallback((info: any) => { if (info.object) { setSelectedTowerForDetails(info.object); setIsTowerModalOpen(true); } }, []);

  // Deck.GL Layers (This will be a huge separate hook later)
  const layers = useMemo(() => [], []);

  if (!MAPBOX_TOKEN) return <div className="flex items-center justify-center h-screen text-red-500 font-black">MAPBOX TOKEN MISSING</div>;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white font-sans fixed inset-0" onContextMenu={(e) => e.preventDefault()}>
      <GeoViewerHeader
        isFullScreen={isFullScreen}
        setIsFullScreen={setIsFullScreen}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={handleProjectSelect}
        projects={projects}
        isSaving={isSaving}
        handleSaveConfig={handleSaveConfig}
        canEdit={canEdit}
        canManage={canManage}
        isClearing={isClearing}
        towersCount={towers.length}
        setIsClearConfirmOpen={setIsClearConfirmOpen}
        navigate={navigate}
        viewState={viewState}
      />

      <GeoViewerSidebar
        isControlsCollapsed={isControlsCollapsed}
        setIsControlsCollapsed={setIsControlsCollapsed}
        towerSearch={towerSearch}
        setTowerSearch={setTowerSearch}
        towerElevation={towerElevation}
        setTowerElevation={setTowerElevation}
        scale={scale}
        setScale={setScale}
        isConnectMode={isConnectMode}
        setIsConnectMode={setIsConnectMode}
        isSwapMode={isSwapMode}
        setIsSwapMode={setIsSwapMode}
        isSaving={isSaving}
        handleSave={handleSaveConfig}
        isFullScreen={isFullScreen}
        setIsFullScreen={setIsFullScreen}
        handleClearTowers={() => setIsClearConfirmOpen(true)}
        handleFitToTowers={() => handleFitToTowers(towers)}
        towersCount={towers.length}
      />

      <main className={cn("fixed inset-0 transition-all duration-700 ease-in-out bg-neutral-950 overflow-hidden flex flex-col", isFullScreen ? "z-1" : "z-0")}>
        <div className="relative flex-1 group overflow-hidden">
          <ReactMap
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/satellite-v9"
            style={{ width: "100%", height: "100%" }}
            terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
          >
            <Source id="mapbox-dem" type="raster-dem" url="mapbox://mapbox.mapbox-terrain-dem-v1" tileSize={512} maxzoom={14} />
            <DeckGLOverlay layers={layers} />
          </ReactMap>
        </div>
      </main>

      <GeoViewerToolbar
        showTowerMenu={showTowerMenu}
        toggleTowerMenu={() => setShowTowerMenu(!showTowerMenu)}
        showCableMenu={showCableMenu}
        toggleCableMenu={() => setShowCableMenu(!showCableMenu)}
        canSeeExecutivePanel={canSeeExecutivePanel}
        selectedProjectId={selectedProjectId}
        handleSelectTowerFromModal={(id) => flyToTower({ id } as any)}
        hiddenTowerIds={hiddenTowerIds}
        setHiddenTowerIds={setHiddenTowerIds}
        handleSnapToTerrain={() => {}}
        handleAutoRotateTowers={() => {}}
        handleFitToTowers={() => handleFitToTowers(towers)}
        isConnectMode={isConnectMode}
        setIsConnectMode={setIsConnectMode}
        isSwapMode={isSwapMode}
        setIsSwapMode={setIsSwapMode}
        canEdit={canEdit}
        handleAutoConnectSequence={() => {}}
        isFullScreen={isFullScreen}
      />

      <TowerDetailsModals isOpen={isTowerModalOpen} onClose={() => setIsTowerModalOpen(false)} tower={selectedTowerForDetails} />
      <TowerExecutionHistoryModal isOpen={isExecutionHistoryModalOpen} onClose={() => setIsExecutionHistoryModalOpen(false)} tower={selectedTowerForHistory} projectId={selectedProjectId} />
      <CableConfigModal isOpen={showCableMenu} onClose={() => setShowCableMenu(false)} phases={phases} onUpdate={setPhases} onSave={handleSaveConfig} onRestoreDefaults={() => setPhases(DEFAULT_PHASES)} readOnly={!canEdit} onScanTower={() => {}} />

      {canSeeExecutivePanel && (
        <CompletedWorkModal
          open={showTowerMenu}
          onOpenChange={setShowTowerMenu}
          projectId={selectedProjectId}
          onSelectTower={(id) => flyToTower({ id } as any)}
          hiddenTowerIds={hiddenTowerIds}
          onHiddenTowerIdsChange={setHiddenTowerIds}
        />
      )}

      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent className="bg-neutral-950 border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 font-black text-lg">Confirmar Limpeza</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">Deseja remover {towers.length} torres?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-neutral-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearTowers} disabled={isClearing} className="bg-red-600">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
