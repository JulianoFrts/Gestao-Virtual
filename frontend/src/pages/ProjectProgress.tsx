import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Map as ReactMap,
  useControl,
  useMap,
  MapRef,
} from "react-map-gl/mapbox";
import {
  ScatterplotLayer,
  TextLayer,
  PathLayer,
  PolygonLayer,
} from "@deck.gl/layers";
import { ScenegraphLayer, SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { SphereGeometry } from "@luma.gl/engine";
import { AmbientLight, DirectionalLight, LightingEffect } from "@deck.gl/core";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Info,
  Layers,
  List,
  Loader2,
  Maximize2,
  Save,
  Trash2,
  Navigation,
  Zap,
  EyeOff,
  X,
  RefreshCw,
  Link2,
  ChevronDown,
  FileText,
  Minimize2,
  Search,
  ChevronUp,
} from "lucide-react";
import { TowerExecutionHistoryModal } from "@/components/map/TowerExecutionHistoryModal";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "mapbox-gl/dist/mapbox-gl.css";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ExcelDataUploader } from "@/components/map/ExcelDataUploader";
import { CatenaryCalculator } from "@/services/catenary-calculator";

import { orionApi } from "@/integrations/orion/client";
import { ORION_SEQUENCE } from "@/data/orion-sequence";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CableConfigModal,
  PhaseConfig,
} from "@/components/map/CableConfigModal";
import { TowerDetailsModals } from "@/components/map/TowerDetailsModals";
import { cn } from "@/lib/utils";
import { CompletedWorkModal } from "@/modules/geo-viewer/components/CompletedWorkModal";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkStages } from "@/hooks/useWorkStages";
import { useTowerProduction } from "@/modules/production/hooks/useTowerProduction";
import { GLTFLoader } from "@loaders.gl/gltf";
import { load } from "@loaders.gl/core";

// Types & Interfaces
export interface Tower {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
    altitude: number;
  };
  type?: string;
  elementType?: string;
  metadata?: Record<string, unknown>;
  properties?: Record<string, any>;
  displaySettings?: {
    groundElevation?: number;
  };
  rotation?: number;
  isLocal?: boolean;
  activityStatuses?: any[];
}

export interface Cable {
  from: Tower;
  to: Tower;
  path: number[][];
  color: number[];
  phase: string;
  width: number;
}

export interface Spacer {
  path: number[][];
  color: number[];
  thickness: number;
  phaseId: string;
}

export interface AnchorPlate {
  polygon: number[][];
}

interface ImportTower {
  id?: string;
  name?: string;
  objectId?: string;
  coordinates?: Tower["coordinates"];
  lat?: number;
  lng?: number;
  longitude?: number;
  altitude?: number;
  isHidden?: boolean;
}

// Default Phase Configuration
// Default Phase Configuration - Aligned with Standard Double-Circuit Lattice Towers
export const DEFAULT_PHASES: PhaseConfig[] = [
  {
    id: "OPGW_L",
    name: "OPGW (Esquerda)",
    enabled: true,
    color: [203, 213, 225],
    tension: 1200,
    verticalOffset: 40,
    horizontalOffset: -4,
    relativeHeight: 100,
    cableCount: 1,
    bundleSpacing: 0.4,
    width: 0.1,
    spacerInterval: 40,
    spacerSize: 0.6,
    spacerThickness: 0.15,
    spacerColor: [255, 80, 0], // Orange
    cableType: "",
    signalSpheresEnabled: true,
    signalSphereInterval: 40,
    signalSphereSize: 0.6,
    signalSphereColor: [255, 200, 200],
  },
  {
    id: "OPGW_R",
    name: "OPGW (Direita)",
    enabled: true,
    color: [203, 213, 225],
    tension: 1200,
    verticalOffset: 40,
    horizontalOffset: 4,
    relativeHeight: 100,
    cableCount: 1,
    bundleSpacing: 0.4,
    width: 0.1,
    spacerInterval: 40,
    spacerSize: 0.6,
    spacerThickness: 0.15,
    spacerColor: [255, 80, 0], // Orange
    cableType: "",
    signalSpheresEnabled: true,
    signalSphereInterval: 40,
    signalSphereSize: 0.6,
    signalSphereColor: [255, 200, 200],
  },

  // Left Circuit
  {
    id: "A_L",
    name: "Fase A (Esq Superior)",
    enabled: true,
    color: [148, 163, 184],
    tension: 1800,
    verticalOffset: 33,
    horizontalOffset: -6,
    relativeHeight: 100,
    cableCount: 4,
    bundleSpacing: 0.4,
    width: 0.15,
    spacerInterval: 30,
    spacerSize: 1.1,
    spacerThickness: 0.2,
    spacerColor: [20, 20, 20],
    cableType: "",
  },
  {
    id: "B_L",
    name: "Fase B (Esq Média)",
    enabled: true,
    color: [203, 213, 225],
    tension: 1800,
    verticalOffset: 25,
    horizontalOffset: -6,
    relativeHeight: 100,
    cableCount: 4,
    bundleSpacing: 0.4,
    width: 0.15,
    spacerInterval: 30,
    spacerSize: 1.1,
    spacerThickness: 0.2,
    spacerColor: [20, 20, 20],
    cableType: "",
  },
  {
    id: "C_L",
    name: "Fase C (Esq Inferior)",
    enabled: true,
    color: [71, 85, 105],
    tension: 1800,
    verticalOffset: 17,
    horizontalOffset: -6,
    relativeHeight: 100,
    cableCount: 4,
    bundleSpacing: 0.4,
    width: 0.15,
    spacerInterval: 30,
    spacerSize: 1.1,
    spacerThickness: 0.2,
    spacerColor: [20, 20, 20],
    cableType: "",
  },

  // Right Circuit
  {
    id: "A_R",
    name: "Fase A (Dir Superior)",
    enabled: true,
    color: [148, 163, 184],
    tension: 1800,
    verticalOffset: 33,
    horizontalOffset: 6,
    relativeHeight: 100,
    cableCount: 4,
    bundleSpacing: 0.4,
    width: 0.15,
    spacerInterval: 30,
    spacerSize: 1.1,
    spacerThickness: 0.2,
    spacerColor: [20, 20, 20],
    cableType: "",
  },
  {
    id: "B_R",
    name: "Fase B (Dir Média)",
    enabled: true,
    color: [203, 213, 225],
    tension: 1800,
    verticalOffset: 25,
    horizontalOffset: 6,
    relativeHeight: 100,
    cableCount: 4,
    bundleSpacing: 0.4,
    width: 0.15,
    spacerInterval: 30,
    spacerSize: 1.1,
    spacerThickness: 0.2,
    spacerColor: [20, 20, 20],
    cableType: "",
  },
  {
    id: "C_R",
    name: "Fase C (Dir Inferior)",
    enabled: true,
    color: [71, 85, 105],
    tension: 1800,
    verticalOffset: 17,
    horizontalOffset: 6,
    relativeHeight: 100,
    cableCount: 4,
    bundleSpacing: 0.4,
    width: 0.15,
    spacerInterval: 30,
    spacerSize: 1.1,
    spacerThickness: 0.2,
    spacerColor: [20, 20, 20],
    cableType: "",
  },

  {
    id: "N",
    name: "Neutro / Aux",
    enabled: false,
    color: [203, 213, 225],
    tension: 1000,
    verticalOffset: 12,
    horizontalOffset: 0,
    relativeHeight: 100,
    cableCount: 1,
    bundleSpacing: 0.4,
    width: 0.1,
    spacerInterval: 0,
    spacerSize: 1.1,
    spacerThickness: 0.2,
    spacerColor: [20, 20, 20],
    cableType: "",
  },
];

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY;

// Model URL
const TOWER_MODEL_URL = `${window.location.origin}/models/towers/scene.gltf`;

const INITIAL_VIEW_STATE = {
  longitude: -51.9253, // Brazil Center-ish
  latitude: -14.235,
  zoom: 4,
  pitch: 45,
  bearing: 0,
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 2.2, // Increased for better overall visibility
});

const dirLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 2.5, // Brighter sun
  direction: [-1, -2, -3],
});

const rimLight = new DirectionalLight({
  color: [200, 220, 255], // Slightly cool light
  intensity: 1.5,
  direction: [1, 2, 1], // Opposite direction for highlights
});

const lightingEffect = new LightingEffect({ ambientLight, dirLight, rimLight });

function DeckGLOverlay(props: Record<string, unknown>) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay({
    ...props,
    effects: [lightingEffect]
  }), {
    // @ts-expect-error: DeckGL typings for overlay are sometimes inconsistent with MapboxRef
    interleaved: true,
  });

  useEffect(() => {
    if (overlay) overlay.setProps({
      ...props,
      effects: [lightingEffect]
    });
  }, [props, overlay]);

  return null;
}

function TerrainManager() {
  const { current: map } = useMap();

  useEffect(() => {
    if (!map) return;
    const m =
      (map as Record<string, MapRef | any>)?.default?.getMap() ||
      (map as MapRef).getMap?.() ||
      null;
    if (!m) return;

    const applyTerrain = () => {
      if (!m.getSource("mapbox-dem")) {
        try {
          m.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
        } catch (e) {
          console.warn("Failed to add mapbox-dem source:", e);
        }
      }

      try {
        m.setTerrain({ source: "mapbox-dem", exaggeration: 1.0 });
        // Force a snap after terrain is applied
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("terrain-ready"));
        }, 1000);
        return true;
      } catch (e) {
        console.warn("Mapbox terrain application failed:", e);
        return false;
      }
    };

    // Attempt initial apply
    const onStyleLoad = () => applyTerrain();

    if (m.isStyleLoaded()) {
      applyTerrain();
    }

    m.on("style.load", onStyleLoad);

    return () => {
      m.off("style.load", onStyleLoad);

      try {
        if (m.getTerrain()) {
          m.setTerrain(null);
        }
        if (m.getSource("mapbox-dem")) {
          m.removeSource("mapbox-dem");
        }
      } catch (e) {
        console.warn("Mapbox terrain cleanup failed:", e);
      }
    };
  }, [map]);

  return null;
}

export default function ProjectProgress() {
  // OrioN 3D Map Component
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const viewStateRef = useRef(viewState);
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const { can } = usePermissions();
  const { profile } = useAuth();

  // Keep ref updated for event handlers without triggering re-effects
  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  const [towers, setTowers] = useState<Tower[]>([]);
  const towersRef = useRef(towers);
  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);

  const [cables, setCables] = useState<Cable[]>([]);
  const [spacers, setSpacers] = useState<Spacer[]>([]);
  const [signalSpheres, setSignalSpheres] = useState<{ position: [number, number, number]; color: [number, number, number]; radius: number }[]>([]);
  const [anchorPlates, setAnchorPlates] = useState<AnchorPlate[]>([]);
  const [scale, setScale] = useState<number>(50);
  const mapRef = useRef<MapRef | null>(null);

  // Split Menu States
  const [showTowerMenu, setShowTowerMenu] = useState<boolean>(false);
  const [showCableMenu, setShowCableMenu] = useState<boolean>(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(true);

  const [hiddenTowers, setHiddenTowers] = useState<Set<number>>(new Set());
  const [hiddenTowerIds, setHiddenTowerIds] = useState<Set<string>>(new Set());
  const [towerSearch, setTowerSearch] = useState("");
  const [isExecutivePanelOpen, setIsExecutivePanelOpen] = useState(false);
  const [isCompletedWorkModalOpen, setCompletedWorkModalOpen] = useState(false);
  const [connections, setConnections] = useState<
    { from: string; to: string }[]
  >([]);
  const connectionsRef = useRef(connections);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  // Persistence State
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem('gapo_project_id'),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load stages using alias 'activatedStages' to match usage
  const { stages: _activatedStages = [] } = useWorkStages(
    undefined,
    selectedProjectId || undefined,
  );
  const { reset: resetProduction } = useTowerProduction();

  // Manual Connection State
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [selectedStartTower, setSelectedStartTower] = useState<number | null>(
    null,
  );

  // Debug Mode State
  const [isDebugMode] = useState(false);
  const [debugPoints, setDebugPoints] = useState<Record<string, unknown>[]>([]);

  // Tower Selection for Details
  const [isTowerModalOpen, setIsTowerModalOpen] = useState(false);
  const [selectedTowerForDetails, setSelectedTowerForDetails] =
    useState<Tower | null>(null);
  const [isExecutionHistoryModalOpen, setIsExecutionHistoryModalOpen] =
    useState(false);
  const [selectedTowerForHistory, setSelectedTowerForHistory] =
    useState<Tower | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tower: Tower;
  } | null>(null);

  // Global Offsets
  const [towerElevation, setTowerElevation] = useState<number>(4.0);
  const [individualAltitudes, setIndividualAltitudes] = useState<
    Record<string, number>
  >({});

  const canEdit = can("map.edit");
  const canManage = can("map.manage");

  const handleSelectTowerFromModal = useCallback(
    (towerId: string) => {
      const foundTower = towers.find(
        (t) => t.id === towerId || t.name === towerId,
      );
      if (!foundTower) {
        console.warn("[Map] Tower not found for fly-to:", towerId);
        return;
      }

      const mapInstance = mapRef.current?.getMap();
      if (mapInstance) {
        mapInstance.flyTo({
          center: [foundTower.coordinates.lng, foundTower.coordinates.lat],
          zoom: 18,
          pitch: 60,
          duration: 2000,
          essential: true,
        });
      }

      setSelectedTowerForDetails(foundTower);
      // Só abre o modal de detalhes se o painel executivo não estiver aberto
      if (!isExecutivePanelOpen) {
        setIsTowerModalOpen(true);
      }
    },
    [towers, isExecutivePanelOpen],
  );

  // Visibility for Executive Panel
  const canSeeExecutivePanel =
    profile?.isSystemAdmin ||
    (profile?.permissionsMap as Record<string, boolean>)?.[
    "system.All_Access"
    ] ||
    ["SUPER_ADMIN_GOD", "HELPER_SYSTEM"].includes(profile?.role || "");

  // Clear Towers Confirmation
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Phase Configuration State
  const [phases, setPhases] = useState<PhaseConfig[]>(() => {
    const saved = localStorage.getItem("orion-cable-config");
    return saved ? JSON.parse(saved) : DEFAULT_PHASES;
  });

  // Close context menu on any click or move
  useEffect(() => {
    const handleCloseMenu = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener("click", handleCloseMenu);
    window.addEventListener("wheel", handleCloseMenu);
    return () => {
      window.removeEventListener("click", handleCloseMenu);
      window.removeEventListener("wheel", handleCloseMenu);
    };
  }, [contextMenu]);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await orionApi
        .from("projects")
        .select("id, name")
        .order("name");
      if (!error && data) {
        setProjects(data as { id: string; name: string }[]);
      }
    };
    fetchProjects();
  }, []);

  // Announced on mount
  useEffect(() => {
    showToast({
      title: "OrioN 3D Executive Panel",
      description:
        "Painel de acompanhamento de obras 3D carregado com sucesso.",
      duration: 5000,
    });
  }, [showToast]);

  const handleFitToTowers = useCallback((towersData?: Tower[]) => {
    const dataToFit = towersData || towersRef.current;
    if (dataToFit.length === 0) return;

    console.log("Fitting to towers:", dataToFit.length);
    const lngs = dataToFit.map((t) => t.coordinates.lng);
    const lats = dataToFit.map((t) => t.coordinates.lat);

    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const mapInstance = mapRef.current?.getMap();
    if (mapInstance) {
      mapInstance.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 80, duration: 2500, essential: true },
      );
    }
  }, []);

  // Load project data when selected
  const loadProjectData = useCallback(
    async (projectId: string) => {
      setIsLoading(true);
      setTowers([]);
      setCables([]);
      setConnections([]);
      setIndividualAltitudes({});
      setHiddenTowers(new Set());
      setPhases(DEFAULT_PHASES);
      setScale(50);
      setTowerElevation(4.0);

      try {
        // 1. Load Towers from Production API (enriched with status)
        const { data: towerData, error: towerError } = await orionApi.get<
          Record<string, unknown>[]
        >("/production/tower-status", {
          projectId,
        });

        let mappedTowers: Tower[] = [];

        if (!towerError && towerData) {
          mappedTowers = towerData.map(
            (t: Record<string, unknown>) =>
              ({
                ...t,
                id: String(t.id),
                name: String(t.name || t.objectId || t.externalId || ""),
                coordinates: {
                  lat: Number(t.latitude),
                  lng: Number(t.longitude),
                  altitude: Number(t.elevation || 0),
                },
                type: String(t.towerType || t.type || "ESTAIADA"), // Use towerType from root
                elementType: String(t.elementType || "TOWER"),
                metadata: t as Record<string, unknown>, // All fields are in the root
                activityStatuses: (t.activityStatuses as any) || [],
              }) as Tower,
          );
          setTowers(mappedTowers);

          // Restore individual altitudes from metadata if present
          const restoredAlts: Record<string, number> = {};
          towerData.forEach((t: Record<string, unknown>) => {
            const displaySettings =
              (t.displaySettings as Record<string, unknown>) || {};
            if (displaySettings?.groundElevation) {
              restoredAlts[String(t.name || t.externalId)] =
                displaySettings.groundElevation as number;
            }
          });
          setIndividualAltitudes(restoredAlts);

          // Trigger Auto-Zoom after data is ready
          if (mappedTowers.length > 0) {
            setTimeout(() => {
              handleFitToTowers(mappedTowers);
            }, 800);
          }
        }

        // 2. Load Global Settings
        const { data: settingsData } = await orionApi
          .from("project_3d_cable_settings")
          .select("settings")
          .eq("projectId", projectId)
          .maybeSingle();

        if (settingsData?.settings) {
          const s = settingsData.settings as Record<string, unknown>;
          if (s.scale) setScale(s.scale as number);
          if (s.towerElevation) setTowerElevation(s.towerElevation as number);

          if (s.phases) {
            const loadedPhases = s.phases as PhaseConfig[];
            // Merge with defaults to ensure new fields (offsets) exist
            const mergedPhases = DEFAULT_PHASES.map(def => {
              const loaded = loadedPhases.find(p => p.id === def.id);
              return loaded ? { ...def, ...loaded } : def;
            });
            setPhases(mergedPhases);
          }

          if (s.connections)
            setConnections(s.connections as { from: string; to: string }[]);
        }
      } catch (error) {
        console.error("Error loading project data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [handleFitToTowers],
  );

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectData(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectData]);

  useEffect(() => {
    if (towers.length > 0) {
      handleFitToTowers();
    }
  }, [towers.length, handleFitToTowers]);

  const handleSaveConfig = useCallback(
    async (isAuto = false) => {
      if (!selectedProjectId) return;
      setIsSaving(true);
      try {
        // 1. Save Global Settings & Connections
        await orionApi.from("project_3d_cable_settings").upsert({
          projectId: selectedProjectId,
          settings: {
            scale,
            towerElevation,
            phases,
            connections,
            updatedAt: new Date().toISOString(),
          },
        });

        // 2. Save Tower Data - Batch POST (Upsert)
        // Ensure no duplicates by externalId (tower name) inside the same batch
        const towersMap = new Map();

        towers.forEach((t, index) => {
          if (!t.name) return; // Skip invalid towers

          const groundElevation = individualAltitudes[t.name];
          const entry = {
            projectId: selectedProjectId,
            externalId: String(t.name),
            name: t.name,
            elementType: t.elementType || "TOWER",
            type: t.type,
            latitude: t.coordinates.lat,
            longitude: t.coordinates.lng,
            elevation: t.coordinates.altitude,
            sequence: index,
            displaySettings: {
              ...(((t.metadata as Record<string, unknown>)
                ?.displaySettings as Record<string, unknown>) ||
                t.displaySettings ||
                {}),
              groundElevation,
            } as Record<string, unknown>,
            metadata: {
              ...(t.properties || {}),
              ...(t.metadata || {}),
            },
          };

          // If we have duplicates in the frontend list, the last one wins
          towersMap.set(entry.externalId, entry);
        });

        const towersToUpdate = Array.from(towersMap.values());

        if (towersToUpdate.length > 0) {
          console.log(`[ProjectProgress] Sending batch update for ${towersToUpdate.length} towers/elements...`);
          const { error: towerError } = await orionApi
            .from("map_elements")
            .insert(towersToUpdate);
          if (towerError) {
            console.error("[ProjectProgress] Tower save error details:", towerError);
            throw new Error(towerError.message);
          }
        }

        if (!isAuto) {
          showToast({
            title: "Sucesso! 💾",
            description: "Configurações da obra foram salvas.",
          });
        }
      } catch (error) {
        console.error("Save error:", error);
        if (!isAuto) {
          showToast({
            title: "Erro ao salvar",
            description: "Não foi possível persistir os dados.",
            variant: "destructive",
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    [
      scale,
      towerElevation,
      phases,
      connections,
      individualAltitudes,
      selectedProjectId,
      towers,
      showToast,
    ],
  );

  // Auto-Save Effect
  useEffect(() => {
    if (!selectedProjectId || towers.length === 0) return;

    const timer = setTimeout(() => {
      handleSaveConfig(true);
    }, 3000); // 3 seconds debounce

    return () => clearTimeout(timer);
  }, [
    scale,
    towerElevation,
    phases,
    connections,
    individualAltitudes,
    selectedProjectId,
    towers,
    handleSaveConfig,
  ]);

  // Persist phases
  useEffect(() => {
    localStorage.setItem("orion-cable-config", JSON.stringify(phases));
  }, [phases]);

  // Toggle Handlers
  const toggleTowerMenu = () => {
    setShowTowerMenu(!showTowerMenu);
    if (!showTowerMenu) setShowCableMenu(false); // Close other menu
  };
  const toggleCableMenu = () => {
    setShowCableMenu(!showCableMenu);
    if (!showCableMenu) setShowTowerMenu(false); // Close other menu
  };

  const handleTowerClick = useCallback(
    (info: { object?: Tower; coordinate?: number[] }, index: number) => {
      if (isDebugMode) {
        console.log("Picking Coord Raw:", info.coordinate);

        // Try to extract 3D coordinates.
        // If z is missing or exactly 0 (ground level), try to fallback to the tower's base altitude.
        const [lng, lat, rawZ] = info.coordinate || [0, 0, 0];
        const towerBaseAlt = info.object?.coordinates?.altitude || 0;

        // Heuristic: If we clicked the tower but Z is 0 or very close to it,
        // and the tower itself is higher than 0, we're likely missing the Z-picking data.
        const finalZ = rawZ > 0.01 ? rawZ : towerBaseAlt + towerElevation;

        const point = {
          position: [lng, lat, finalZ + 0.2] as [number, number, number], // Tiny offset to prevent clipping
          id: Date.now(),
        };
        console.log("Debug Point Added:", point);
        setDebugPoints((prev) => [...prev, point]);
        showToast({
          title: "Ponto de Debug Adicionado",
          description: "Posição capturada no topo da estrutura.",
          className:
            "bg-red-950/80 border-red-500/50 text-red-200 backdrop-blur-md",
        });
        return;
      }

      if (!isConnectMode) {
        setSelectedTowerForDetails(towers[index]);
        setIsTowerModalOpen(true);
        return;
      }

      if (selectedStartTower === null) {
        setSelectedStartTower(index);
        if (info.object) {
          showToast({
            title: "Início Selecionado",
            description: `Selecione a próxima torre para conectar com ${info.object.name}.`,
            className: "bg-blue-950/50 border-blue-900 text-blue-200",
          });
        }
      } else {
        if (selectedStartTower === index) {
          setSelectedStartTower(null);
          return;
        }

        const startTower = towers[selectedStartTower];
        const endTower = towers[index];
        const newConn = { from: startTower.name, to: endTower.name };

        setConnections((prev) => {
          const filtered = prev.filter((c) => c.from !== startTower.name);
          return [...filtered, newConn];
        });

        showToast({
          title: "Conexão Atualizada! 🔗",
          description: `${startTower.name} ➡️ ${endTower.name}`,
          className: "bg-emerald-950/50 border-emerald-900 text-emerald-200",
        });

        setSelectedStartTower(null);
      }
    },
    [
      isDebugMode,
      towerElevation,
      showToast,
      isConnectMode,
      towers,
      selectedStartTower,
    ],
  );

  const toggleTowerVisibility = (index: number) => {
    const newHidden = new Set(hiddenTowers);
    if (newHidden.has(index)) {
      newHidden.delete(index);
    } else {
      newHidden.add(index);
    }
    setHiddenTowers(newHidden);
  };

  const lastSnapTime = useRef<number>(0);
  const handleSnapToTerrain = useCallback(
    (_silent = false) => {
      const mapInstance = mapRef.current?.getMap();
      if (!mapInstance) return;

      // Debounce: Don't snap more than once every 3 seconds
      const now = Date.now();
      if (now - lastSnapTime.current < 3000) return;
      lastSnapTime.current = now;

      const newAlts: Record<string, number> = { ...individualAltitudes };
      const bounds = mapInstance.getBounds();
      let successCount = 0;
      let changed = false;

      towersRef.current.forEach((tower) => {
        // Process only towers within the current viewport bounds
        if (!bounds.contains([tower.coordinates.lng, tower.coordinates.lat]))
          return;

        const elevation = mapInstance.queryTerrainElevation([
          tower.coordinates.lng,
          tower.coordinates.lat,
        ]);
        if (elevation !== null && elevation !== undefined) {
          if (newAlts[tower.name] !== elevation) {
            newAlts[tower.name] = elevation;
            successCount++;
            changed = true;
          }
        }
      });

      if (changed) {
        setIndividualAltitudes(newAlts);
        if (!_silent) {
          showToast({
            title: "Auto-Alinhamento Concluído 🛰️",
            description: `${successCount} torres ajustadas ao relevo do terreno.`,
            className:
              "bg-emerald-950/80 border-emerald-500/50 text-emerald-100 backdrop-blur-md",
          });
        }
      }
    },
    [individualAltitudes, showToast],
  );

  const handleAutoRotateTowers = useCallback(
    (
      silent = false,
      customTowers?: Tower[],
      customConnections?: { from: string; to: string }[],
    ) => {
      const activeTowers = customTowers || towersRef.current;
      const activeConnections = customConnections || connectionsRef.current;

      if (activeTowers.length === 0) return;

      const newTowers = [...activeTowers];
      let changed = false;

      newTowers.forEach((tower, index) => {
        // Find connected neighbors
        const connectedNeighbors = activeConnections
          .filter(
            (c) =>
              c.from.trim().toUpperCase() === tower.name.trim().toUpperCase() ||
              c.to.trim().toUpperCase() === tower.name.trim().toUpperCase(),
          )
          .map((c) => {
            const otherName =
              c.from.trim().toUpperCase() === tower.name.trim().toUpperCase()
                ? c.to
                : c.from;
            return activeTowers.find(
              (t) =>
                t.name.trim().toUpperCase() === otherName.trim().toUpperCase(),
            );
          })
          .filter(Boolean);

        if (connectedNeighbors.length > 0) {
          let finalRotation = 0;

          if (connectedNeighbors.length === 1) {
            const n = connectedNeighbors[0] as Tower;
            const dLon = n.coordinates.lng - tower.coordinates.lng;
            const y =
              Math.sin((dLon * Math.PI) / 180) *
              Math.cos((n.coordinates.lat * Math.PI) / 180);
            const x =
              Math.cos((tower.coordinates.lat * Math.PI) / 180) *
              Math.sin((n.coordinates.lat * Math.PI) / 180) -
              Math.sin((tower.coordinates.lat * Math.PI) / 180) *
              Math.cos((n.coordinates.lat * Math.PI) / 180) *
              Math.cos((dLon * Math.PI) / 180);

            const bearing = Math.atan2(y, x) * (180 / Math.PI);
            // Pointing arms perpendicular to the line.
            // If model arms are at 90 degrees, setting rotation to bearing aligns them.
            finalRotation = bearing;
          } else {
            // Bisector logic for towers with 2+ connections
            const bearings = connectedNeighbors.slice(0, 2).map((n) => {
              const towerN = n as Tower;
              const dLon = towerN.coordinates.lng - tower.coordinates.lng;
              const y =
                Math.sin((dLon * Math.PI) / 180) *
                Math.cos((towerN.coordinates.lat * Math.PI) / 180);
              const x =
                Math.cos((tower.coordinates.lat * Math.PI) / 180) *
                Math.sin((towerN.coordinates.lat * Math.PI) / 180) -
                Math.sin((tower.coordinates.lat * Math.PI) / 180) *
                Math.cos((towerN.coordinates.lat * Math.PI) / 180) *
                Math.cos((dLon * Math.PI) / 180);
              return Math.atan2(y, x) * (180 / Math.PI);
            });

            let diff = bearings[1] - bearings[0];
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;

            // Simple angle bisector
            finalRotation = bearings[0] + diff / 2;
          }

          // Apply rotation to state - rounding to avoid jitter
          if (
            Math.abs(((tower as Tower).rotation || 0) - finalRotation) > 0.1
          ) {
            newTowers[index] = { ...tower, rotation: finalRotation } as Tower;
            changed = true;
          }
        }
      });

      if (changed) {
        setTowers(newTowers);
        if (!silent) {
          showToast({
            title: "Ângulos Ajustados! 📐",
            description:
              "Torres rotacionadas para alinhar as mísulas com os cabos.",
            className:
              "bg-blue-950/80 border-blue-500/50 text-blue-100 backdrop-blur-md",
          });
        }
      }
    },
    [showToast],
  );

  // Auto-snap triggers
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const onSnap = () => {
      // Use Ref to get the freshest data during the idle event
      if (towersRef.current.length > 0 && viewStateRef.current.zoom >= 14) {
        handleSnapToTerrain(true);
        handleAutoRotateTowers(true);
      }
    };

    map.on("idle", onSnap);
    window.addEventListener("terrain-ready", onSnap);

    // Initial check after a short delay
    const timer = setTimeout(onSnap, 2000);

    return () => {
      map.off("idle", onSnap);
      window.removeEventListener("terrain-ready", onSnap);
      clearTimeout(timer);
    };
  }, [
    towers.length,
    handleSnapToTerrain,
    handleAutoRotateTowers,
    viewState.zoom,
  ]); // Re-run when tower count changes

  useEffect(() => {
    if (towers.length < 2 && connections.length === 0) {
      setCables([]);
      return;
    }

    const newCables: Cable[] = [];
    const newSpacers: Array<{
      path: number[][];
      color: [number, number, number];
      thickness: number;
      phaseId: string;
    }> = [];
    const newSignalSpheres: Array<{
      position: [number, number, number];
      color: [number, number, number];
      radius: number;
    }> = [];
    const newPlates: Array<{ polygon: number[][] }> = [];

    // Accumulators for cross-span distance persistence
    const spacerAccumulatedDists: Record<string, number> = {};
    const sphereAccumulatedDists: Record<string, number> = {};

    // Seed accumulators with a deterministic stagger based on phase index
    // This avoids all phases placing elements at the same distance, creating "vertical columns"
    phases.forEach((p, idx) => {
      const staggerFactor = (idx % 3) / 3; // 0, 0.33, 0.66
      if (p.spacerInterval) {
        spacerAccumulatedDists[p.id] = p.spacerInterval * staggerFactor;
      }
      if (p.signalSphereInterval) {
        sphereAccumulatedDists[`${p.id}-spheres`] = p.signalSphereInterval * ((idx + 1) % 3 / 3);
      }
    });
    if (connections.length > 0) {
      const towerMap = new Map(
        towers.map((t) => [t.name.trim().toUpperCase(), t]),
      );

      connections.forEach((conn) => {
        const startName = conn.from.trim().toUpperCase();
        const endName = conn.to.trim().toUpperCase();
        const start = towerMap.get(startName);
        const end = towerMap.get(endName);

        if (start && end) {
          const startIndex = towers.indexOf(start);
          const endIndex = towers.indexOf(end);

          if (
            !hiddenTowers.has(startIndex) &&
            !hiddenTowers.has(endIndex) &&
            !hiddenTowerIds.has(start.name) &&
            !hiddenTowerIds.has(start.id) &&
            !hiddenTowerIds.has(end.name) &&
            !hiddenTowerIds.has(end.id)
          ) {
            const dLon = end.coordinates.lng - start.coordinates.lng;
            const y =
              Math.sin((dLon * Math.PI) / 180) *
              Math.cos((end.coordinates.lat * Math.PI) / 180);
            const x =
              Math.cos((start.coordinates.lat * Math.PI) / 180) *
              Math.sin((end.coordinates.lat * Math.PI) / 180) -
              Math.sin((start.coordinates.lat * Math.PI) / 180) *
              Math.cos((end.coordinates.lat * Math.PI) / 180) *
              Math.cos((dLon * Math.PI) / 180);
            const bearing = Math.atan2(y, x);
            const perpAngle = bearing + Math.PI / 2;
            const metersToLat = 1 / 111111;
            const metersToLng =
              1 / (111111 * Math.cos((start.coordinates.lat * Math.PI) / 180));

            phases.forEach((phase) => {
              if (!phase.enabled) return;

              const count = phase.cableCount || 1;
              const spacing = (phase.bundleSpacing || 0.4) * (scale / 50);

              // Calculate central path for spacer placement
              const recedeOffset = 0.3 * (scale / 50); // Move outward by 30cm
              const hBase = phase.horizontalOffset * (scale / 50);
              const hAdjusted =
                hBase + (hBase > 0 ? recedeOffset : -recedeOffset);

              const hLatOffset = Math.cos(perpAngle) * hAdjusted * metersToLat;
              const hLngOffset = Math.sin(perpAngle) * hAdjusted * metersToLng;
              const startAlt =
                individualAltitudes[start.name] !== undefined
                  ? individualAltitudes[start.name]
                  : start.coordinates.altitude || 0;
              const endAlt =
                individualAltitudes[end.name] !== undefined
                  ? individualAltitudes[end.name]
                  : end.coordinates.altitude || 0;

              const cp1 = {
                x: start.coordinates.lng + hLngOffset,
                y: start.coordinates.lat + hLatOffset,
                z:
                  startAlt +
                  phase.verticalOffset * (scale / 50) +
                  towerElevation,
              };
              const cp2 = {
                x: end.coordinates.lng + hLngOffset,
                y: end.coordinates.lat + hLatOffset,
                z:
                  endAlt + phase.verticalOffset * (scale / 50) + towerElevation,
              };

              // Generate Anchor Plate (Black Square) at connection points
              // User requested "LARGE" box - set to 1.5m x 1.5m
              const plateSize = 2.5 * (scale / 50);

              // Generate Anchor Structure (X-Shape + Orange Arrow) at connection points
              const generateAnchorStructure = (center: { x: number; y: number; z: number }) => {
                const sSize = (phase.spacerSize || 1.1) * 1.2; // Slightly larger at anchor
                const anchorSpacing = spacing || 0.4;

                if (count === 4) {
                  // Calculate 4 corners relative to center
                  const corners = [0, 1, 2, 3].map((k) => {
                    const bH = k === 0 || k === 2 ? -anchorSpacing / 2 : anchorSpacing / 2;
                    const bV = k === 0 || k === 1 ? anchorSpacing / 2 : -anchorSpacing / 2;
                    const kLat = Math.cos(perpAngle) * (bH * sSize) * metersToLat;
                    const kLng = Math.sin(perpAngle) * (bH * sSize) * metersToLng;
                    return [center.x + kLng, center.y + kLat, center.z + bV * sSize];
                  });

                  // Diagonal 1 (Black)
                  newSpacers.push({
                    path: [corners[0], corners[3]],
                    color: [0, 0, 0],
                    thickness: 0.25,
                    phaseId: phase.id,
                  });

                  // Diagonal 2 (Black)
                  newSpacers.push({
                    path: [corners[1], corners[2]],
                    color: [0, 0, 0],
                    thickness: 0.25,
                    phaseId: phase.id,
                  });

                  // Box Outline (Closing the square)
                  newSpacers.push({
                    path: [corners[0], corners[1]], // Top
                    color: [0, 0, 0], thickness: 0.25, phaseId: phase.id,
                  });
                  newSpacers.push({
                    path: [corners[1], corners[2]], // Right
                    color: [0, 0, 0], thickness: 0.25, phaseId: phase.id,
                  });
                  newSpacers.push({
                    path: [corners[2], corners[3]], // Bottom
                    color: [0, 0, 0], thickness: 0.25, phaseId: phase.id,
                  });
                  newSpacers.push({
                    path: [corners[3], corners[0]], // Left
                    color: [0, 0, 0], thickness: 0.25, phaseId: phase.id,
                  });

                  // Central Rod (Orange Arrow) pointing UP to the tower arm
                  // It needs to go from the lowered center back up to the original center
                  newSpacers.push({
                    path: [
                      [center.x, center.y, center.z],
                      [center.x, center.y, center.z + 2.0], // Long rod up to tower
                    ],
                    color: [255, 140, 0], // Orange
                    thickness: 0.6,
                    phaseId: phase.id,
                  });

                  // Red Tips (Rings)
                  corners.forEach((corner) => {
                    newSpacers.push({
                      path: [corner, [corner[0], corner[1], corner[2] + 0.05]],
                      color: [200, 0, 0], // Red
                      thickness: 0.4,
                      phaseId: phase.id,
                    });
                  });

                } else {
                  // Standard small plate for non-4 bundles
                  // Just a small vertical bar to mark the spot
                  newSpacers.push({
                    path: [
                      [center.x, center.y, center.z - 0.5],
                      [center.x, center.y, center.z + 0.5],
                    ],
                    color: [0, 0, 0],
                    thickness: 0.3,
                    phaseId: phase.id,
                  });
                }
              };

              // Apply a LARGE downward shift for the anchor structure (-1.5m)
              // This simulates the insulator string hanging down
              const anchorZOffset = count === 4 ? -1.5 : 0;
              generateAnchorStructure({ ...cp1, z: cp1.z + anchorZOffset });
              generateAnchorStructure({ ...cp2, z: cp2.z + anchorZOffset });

              // Direction and unit vector for cable shortening
              const dx = end.coordinates.lng - start.coordinates.lng;
              const dy = end.coordinates.lat - start.coordinates.lat;
              const groundDist = Math.sqrt(
                Math.pow(
                  dx *
                  111111 *
                  Math.cos((start.coordinates.lat * Math.PI) / 180),
                  2,
                ) + Math.pow(dy * 111111, 2),
              );

              const uLng = dx / Math.max(0.1, groundDist);
              const uLat = dy / Math.max(0.1, groundDist);

              // Reduced gap to make cables touch the rings
              const termOffset = 0.6;

              const cp1_short = {
                x: cp1.x + uLng * termOffset,
                y: cp1.y + uLat * termOffset,
                z: cp1.z + anchorZOffset, // Drop cable start point too!
              };
              const cp2_short = {
                x: cp2.x - uLng * termOffset,
                y: cp2.y - uLat * termOffset,
                z: cp2.z + anchorZOffset, // Drop cable end point too!
              };
              const centerPath = CatenaryCalculator.generateCatenaryPoints(
                cp1_short,
                cp2_short,
                phase.tension,
                30,
              );

              // 💎 Premium Polymeric Insulator / Spacer Logic (Enhanced Geometry)
              // PRE-CALCULATE SPAN DISTANCE & SEGMENTS (Critical for Spacers & Spheres)
              let totalSpanDist = 0;
              const segmentDists: number[] = [0];
              for (let j = 1; j < centerPath.length; j++) {
                const pPrev = centerPath[j - 1];
                const pCurr = centerPath[j];
                const dx = (pCurr.x - pPrev.x) * 111111 * Math.cos((pCurr.y * Math.PI) / 180);
                const dy = (pCurr.y - pPrev.y) * 111111;
                const dz = pCurr.z - pPrev.z;
                const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
                totalSpanDist += d;
                segmentDists.push(totalSpanDist);
              }

              if (
                phase.spacerInterval &&
                phase.spacerInterval > 0 &&
                count > 1
              ) {
                const phaseKey = `${phase.id}`;
                if (spacerAccumulatedDists[phaseKey] === undefined) {
                  spacerAccumulatedDists[phaseKey] = 0;
                }

                const safetyBuffer = 25; // meters
                let placedInThisSpan = false;

                for (let j = 1; j < centerPath.length - 1; j++) {
                  const segDist = segmentDists[j] - segmentDists[j - 1];
                  spacerAccumulatedDists[phaseKey] += segDist;

                  const currentDistInSpan = segmentDists[j];

                  if (spacerAccumulatedDists[phaseKey] >= phase.spacerInterval) {
                    if (currentDistInSpan >= safetyBuffer && currentDistInSpan <= (totalSpanDist - safetyBuffer)) {
                      const pCurr = centerPath[j];
                      placedInThisSpan = true;

                      const sSize = phase.spacerSize || 1.1;
                      const polymericColor = phase.spacerColor || [180, 180, 185]; // Sync with config or default to professional grey
                      const clampThickness = (phase.spacerThickness || 0.2) * 1.5;

                      // Generate Conductors/Clamps points for this spacer
                      const conductorPoints: number[][] = [];
                      for (let k = 0; k < count; k++) {
                        let bH = 0;
                        let bV = 0;
                        if (count === 4) {
                          bH = k === 0 || k === 2 ? -spacing / 2 : spacing / 2;
                          bV = k === 0 || k === 1 ? spacing / 2 : -spacing / 2;
                        } else if (count === 3) {
                          if (k === 0) { bH = 0; bV = spacing * 0.577; }
                          else if (k === 1) { bH = -spacing / 2; bV = -spacing * 0.288; }
                          else { bH = spacing / 2; bV = -spacing * 0.288; }
                        } else if (count === 2) {
                          bH = k === 0 ? -spacing / 2 : spacing / 2;
                        }
                        const kLat = Math.cos(perpAngle) * (bH * sSize) * metersToLat;
                        const kLng = Math.sin(perpAngle) * (bH * sSize) * metersToLng;
                        conductorPoints.push([pCurr.x + kLng, pCurr.y + kLat, pCurr.z + bV * sSize]);
                      }

                      // Create Diamond Frame (Arms)
                      if (count > 2) {
                        for (let k = 0; k < count; k++) {
                          const p1 = conductorPoints[k];
                          const p2 = conductorPoints[(k + 1) % count];

                          // THE ARM (Structural)
                          newSpacers.push({
                            path: [p1, p2],
                            color: polymericColor,
                            thickness: phase.spacerThickness || 0.2,
                            phaseId: phase.id,
                          });

                          // ADD "SHEDS" (Ribs) - Mimicking polymeric insulators
                          const armVec = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
                          const shedCount = 3;
                          for (let s = 1; s <= shedCount; s++) {
                            const t = s / (shedCount + 1);
                            const shedPos = [p1[0] + armVec[0] * t, p1[1] + armVec[1] * t, p1[2] + armVec[2] * t];
                            const shedSize = (phase.spacerThickness || 0.2) * 2.5;
                            // Visual "ring" shed
                            newSpacers.push({
                              path: [
                                [shedPos[0], shedPos[1], shedPos[2] - 0.05],
                                [shedPos[0], shedPos[1], shedPos[2] + 0.05]
                              ],
                              color: polymericColor.map(c => Math.max(0, c - 40)) as [number, number, number], // Slightly darker version for sheds
                              thickness: shedSize,
                              phaseId: phase.id
                            });
                          }
                        }
                      } else if (count === 2) {
                        // Single Cross Arm for 2 conductors
                        newSpacers.push({
                          path: [conductorPoints[0], conductorPoints[1]],
                          color: polymericColor,
                          thickness: phase.spacerThickness || 0.2,
                          phaseId: phase.id,
                        });
                      }

                      // ADD CLAMPS (Connection points)
                      conductorPoints.forEach(cp => {
                        newSpacers.push({
                          path: [cp, [cp[0], cp[1], cp[2] + 0.05]],
                          color: [40, 40, 40], // Darker clamp
                          thickness: clampThickness * 2,
                          phaseId: phase.id
                        });
                      });

                      spacerAccumulatedDists[phaseKey] = 0;
                    }
                  }
                }

                // Fallback: Min 1 per span
                if (!placedInThisSpan) {
                  const phaseIndex = phases.findIndex(p => p.id === phase.id);
                  const staggerShift = (phaseIndex % 5 - 2) * 2;
                  const midIdx = Math.floor(centerPath.length / 2) + staggerShift;
                  const safeIdx = Math.max(1, Math.min(centerPath.length - 2, midIdx));
                  const pCurr = centerPath[safeIdx];
                  newSpacers.push({
                    path: [[pCurr.x, pCurr.y, pCurr.z - 0.3], [pCurr.x, pCurr.y, pCurr.z + 0.3]],
                    color: phase.spacerColor || [180, 180, 185],
                    thickness: (phase.spacerThickness || 0.2) * 2,
                    phaseId: phase.id,
                  });
                }
              }

              // Dedicated Signal Spheres Logic: FIXED 2 OR 3 UNITS PER SPAN
              if (phase.signalSpheresEnabled) {
                const phaseIndex = phases.findIndex(p => p.id === phase.id);
                // Rule: if span > 400m use 3 spheres, else 2.
                const sphereCount = totalSpanDist > 400 ? 3 : 2;

                // Proportional placement factors
                const basePositions = sphereCount === 3
                  ? [0.25, 0.50, 0.75]
                  : [0.33, 0.66];

                const positions = basePositions.map(p => {
                  const jitter = ((phaseIndex % 3) - 1) * 0.05; // -0.05, 0, +0.05 per phase
                  return p + jitter;
                });

                positions.forEach(ratio => {
                  const targetDist = totalSpanDist * ratio;
                  let found = false;
                  for (let j = 1; j < centerPath.length; j++) {
                    if (segmentDists[j] >= targetDist && !found) {
                      const pPrev = centerPath[j - 1];
                      const pCurr = centerPath[j];

                      // Interpolate within segment for precise placement
                      const segLen = segmentDists[j] - segmentDists[j - 1];
                      const t = segLen > 0 ? (targetDist - segmentDists[j - 1]) / segLen : 0;

                      const interpNode = {
                        x: pPrev.x + (pCurr.x - pPrev.x) * t,
                        y: pPrev.y + (pCurr.y - pPrev.y) * t,
                        z: pPrev.z + (pCurr.z - pPrev.z) * t
                      };

                      newSignalSpheres.push({
                        position: [interpNode.x, interpNode.y, interpNode.z + 0.22],
                        color: phase.signalSphereColor || [255, 140, 0],
                        radius: phase.signalSphereSize || 0.6
                      });
                      found = true;
                    }
                  }
                });
              }

              for (let i = 0; i < count; i++) {
                let bundleHOffset = 0;
                let bundleVOffset = 0;

                if (count === 4) {
                  bundleHOffset =
                    i === 0 || i === 2 ? -spacing / 2 : spacing / 2;
                  bundleVOffset =
                    i === 0 || i === 1 ? spacing / 2 : -spacing / 2;
                } else if (count === 3) {
                  if (i === 0) {
                    bundleHOffset = 0;
                    bundleVOffset = spacing * 0.577;
                  } else if (i === 1) {
                    bundleHOffset = -spacing / 2;
                    bundleVOffset = -spacing * 0.288;
                  } else {
                    bundleHOffset = spacing / 2;
                    bundleVOffset = -spacing * 0.288;
                  }
                } else if (count === 2) {
                  bundleHOffset = i === 0 ? -spacing / 2 : spacing / 2;
                }

                const bhLat = Math.cos(perpAngle) * bundleHOffset * metersToLat;
                const bhLng = Math.sin(perpAngle) * bundleHOffset * metersToLng;

                const p1 = {
                  x: cp1.x + bhLng + uLng * termOffset,
                  y: cp1.y + bhLat + uLat * termOffset,
                  z: cp1.z + bundleVOffset,
                };
                const p2 = {
                  x: cp2.x + bhLng - uLng * termOffset,
                  y: cp2.y + bhLat - uLat * termOffset,
                  z: cp2.z + bundleVOffset,
                };

                const pathPoints = CatenaryCalculator.generateCatenaryPoints(
                  p1,
                  p2,
                  phase.tension,
                  20,
                );
                newCables.push({
                  from: start,
                  to: end,
                  path: pathPoints.map((p) => [p.x, p.y, p.z]),
                  color: phase.color,
                  phase: `${phase.id}-${i}`,
                  width: phase.width || 0.15,
                });
              }
            });
          }
        }
      });
    }
    setSignalSpheres(newSignalSpheres);
    setCables(newCables);
    setSpacers(newSpacers);
    setAnchorPlates(newPlates);
  }, [
    towers,
    phases,
    hiddenTowers,
    hiddenTowerIds,
    connections,
    towerElevation,
    scale,
    individualAltitudes,
  ]);

  const handleExcelImport = (
    towersData: ImportTower[],
    rawConnections: Array<{ from: string; to: string }>,
  ) => {
    console.log(towersData);
    console.log(rawConnections);
    const newTowers: Tower[] = (towersData as ImportTower[]).map(
      (t, idx) =>
        ({
          ...t,
          id: t.id || `import-${idx}-${Date.now()}`,
          name: t.name || t.objectId || `T-${idx + 1}`,
          coordinates: t.coordinates || {
            lat: t.lat || 0,
            lng: t.lng || t.longitude || 0,
            altitude: t.altitude || 0,
          },
        }) as Tower,
    );

    setTowers(newTowers);
    const newConnections = rawConnections as { from: string; to: string }[];

    if (newConnections.length === 0) {
      setConnections(ORION_SEQUENCE);
      showToast({ title: "Sequência Padrão Aplicada" });
    } else {
      setConnections(newConnections);
    }

    const hiddenSet = new Set<number>();
    newTowers.forEach((t, i) => {
      if (t.metadata?.isHidden) hiddenSet.add(i);
    });
    setHiddenTowers(hiddenSet);

    if (newTowers.length > 0) {
      const first = newTowers[0];
      setViewState({
        ...viewState,
        longitude: first.coordinates.lng,
        latitude: first.coordinates.lat,
        zoom: 15,
      });
    }

    // Auto-align angles after import using the new data directly
    handleAutoRotateTowers(
      true,
      newTowers,
      newConnections.length === 0 ? ORION_SEQUENCE : newConnections,
    );
  };

  // 3D Tower Scanning Logic
  const scanTowerPoints = async () => {
    try {
      console.log("Iniciando scan da torre:", TOWER_MODEL_URL);
      const gltf = await load(TOWER_MODEL_URL, GLTFLoader);

      // Access raw nodes from the GLTF JSON structure
      const nodes = gltf.json?.nodes || [];

      if (!nodes || nodes.length === 0) {
        throw new Error("Nenhum nó encontrado no modelo GLTF.");
      }

      console.log("Nós encontrados:", nodes);

      const candidates: { x: number; y: number; z: number }[] = [];

      // Extract translation from nodes
      nodes.forEach((node: any) => {
        // Check for translation property [x, y, z]
        if (node.translation && Array.isArray(node.translation) && node.translation.length >= 2) {
          candidates.push({
            x: node.translation[0],
            y: node.translation[1], // GLTF standard is Y-UP usually
            z: node.translation[2] || 0
          });
        }
      });

      if (candidates.length === 0) {
        showToast({
          title: "Sem dados de posição",
          description: "Os nós do modelo não possuem propriedade 'translation'.",
          variant: "destructive"
        });
        return;
      }

      // Sort by Height.
      // We need to determine if UP is Y or Z.
      // Usually GLTF is Y-up. Let's check max variance.
      const yRange = Math.max(...candidates.map(c => c.y)) - Math.min(...candidates.map(c => c.y));
      const zRange = Math.max(...candidates.map(c => c.z)) - Math.min(...candidates.map(c => c.z));

      const isZUp = zRange > yRange * 2; // Simple heuristic

      // Sort descending by height (Top to Bottom)
      candidates.sort((a, b) => isZUp ? b.z - a.z : b.y - a.y);

      console.log("Candidatos ordenados (Topo -> Base):", candidates);

      // Update Phases
      const newPhases = [...phases];

      // Helper to apply offsets to a phase
      const applyToPhase = (index: number, point: { x: number, y: number, z: number }) => {
        if (newPhases[index]) {
          const height = isZUp ? point.z : point.y;
          const width = point.x;

          newPhases[index].verticalOffset = height;
          newPhases[index].horizontalOffset = Math.abs(width);
        }
      };

      // Assign points to phases (A, B, C)
      if (candidates.length > 0) applyToPhase(0, candidates[0]);
      if (candidates.length > 2) applyToPhase(1, candidates[2]);
      if (candidates.length > 4) applyToPhase(2, candidates[4]);

      setPhases(newPhases);

      // Update Scan Visualization Points (Red Dots)
      setDebugPoints(candidates.map(c => ({
        position: [c.x, c.y, c.z]
      })));

      showToast({
        title: "Scan Concluído",
        description: `${candidates.length} pontos detectados. Fases ajustadas automaticamente.`,
      });

    } catch (error) {
      console.error("Erro ao escanear torre:", error);
      showToast({
        title: "Erro no Scan",
        description: "Não foi possível ler a geometria da torre.",
        variant: "destructive"
      });
    }
  };

  // Function to clear all towers from the selected project
  const handleClearTowers = async () => {
    if (!selectedProjectId) {
      showToast({
        title: "Erro",
        description: "Selecione um projeto primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsClearing(true);
    try {
      // Delete all tower_technical_data for the selected project
      const { error } = await orionApi
        .from("tower_technical_data")
        .delete()
        .eq("project_id", selectedProjectId);

      if (error) throw error;

      // Clear local state
      setTowers([]);
      setCables([]);
      setSpacers([]);
      setAnchorPlates([]);
      setConnections([]);
      setHiddenTowers(new Set());
      setIndividualAltitudes({});

      showToast({
        title: "Torres Removidas",
        description:
          "Todas as torres da obra foram removidas com sucesso. Você pode importar novamente.",
      });
    } catch (error) {
      console.error("Erro ao limpar torres:", error);
      showToast({
        title: "Erro ao remover torres",
        description: "Não foi possível remover as torres. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
      setIsClearConfirmOpen(false);
    }
  };

  const layers = useMemo(() => {
    const currentZoom = viewState.zoom;
    const visibleTowers = towers.filter(
      (t, i) =>
        !hiddenTowers.has(i) &&
        !hiddenTowerIds.has(t.name) &&
        !hiddenTowerIds.has(t.id),
    );

    if (currentZoom < 14) {
      return [
        new ScatterplotLayer({
          id: "tower-dots-low-zoom",
          data: visibleTowers,
          getPosition: (d: Tower) => [d.coordinates.lng, d.coordinates.lat, 0],
          getFillColor: [0, 255, 170, 255],
          getRadius: 50,
          radiusUnits: "meters",
          radiusMinPixels: 4,
          pickable: true,
          onContextMenu: (info, event) => {
            if (event.srcEvent) event.srcEvent.preventDefault();
            if (info.object) {
              setContextMenu({
                x: info.x,
                y: info.y,
                tower: info.object,
              });
            }
          },
        }),
      ];
    }

    return [
      new ScenegraphLayer({
        id: "towers-layer",
        data: visibleTowers,
        scenegraph: TOWER_MODEL_URL,
        getPosition: (d: Tower) => [
          d.coordinates.lng,
          d.coordinates.lat,
          (individualAltitudes[d.name] !== undefined
            ? individualAltitudes[d.name]
            : d.coordinates.altitude || 0) + towerElevation,
        ],
        getOrientation: (d: Tower) => [0, -(d.rotation || 0), 90],
        sizeScale: scale,
        getScale: [1, 1, 1],
        _lighting: "pbr",
        pickable: true,
        onClick: (info) => {
          if (info.object) {
            const originalIndex = towers.findIndex(
              (t) => t.name === info.object.name,
            );
            if (originalIndex !== -1) handleTowerClick(info, originalIndex);
          }
        },
        onMouseDown: (_info, _event) => {
          // Optional: highlight on right click down
        },
        onContextMenu: (info, event) => {
          if (event.srcEvent) event.srcEvent.preventDefault();
          if (info.object) {
            setContextMenu({
              x: info.x,
              y: info.y,
              tower: info.object,
            });
          }
        },
        autoHighlight: true,
        highlightColor: [0, 255, 170, 150], // Emerald Glow
        getColor: (d: Tower) => {
          // 1. Selection Highlight - VIBRANT CYAN
          if (
            selectedStartTower !== null &&
            towers[selectedStartTower].name === d.name
          ) {
            return [0, 255, 255, 255];
          }

          // 2. Production Status Color
          const statuses = (d.activityStatuses || d.metadata?.activityStatuses || []) as any[];
          if (!statuses || statuses.length === 0) return [255, 255, 255];

          const allFinished = statuses.every((s: any) => s.status === "FINISHED");
          if (allFinished) return [50, 180, 50]; // Green

          const anyInProgress = statuses.some((s: any) => s.status === "IN_PROGRESS");
          if (anyInProgress) return [0, 120, 255]; // Blue

          // Check for delays
          const today = new Date();
          const isDelayed = statuses.some((s: any) => {
            if (s.status === "FINISHED") return false;
            if (!s.plannedEndDate) return false;
            return new Date(s.plannedEndDate) < today;
          });

          if (isDelayed) return [255, 80, 0]; // Orange/Red for delay

          const anyFinished = statuses.some((s: any) => s.status === "FINISHED");
          if (anyFinished) return [0, 200, 255]; // Light Blue for partial finish

          return [200, 200, 210]; // Metallic Silver (Galvanized Steel look) instead of flat white
        },
      }),
      new PathLayer({
        id: "cables-layer",
        data: cables,
        pickable: true,
        widthScale: 1,
        widthUnits: "meters", // Use meters for realistic thickness
        widthMinPixels: 1.5,
        getPath: (d) => d.path,
        getColor: (d) => d.color,
        getWidth: (d) => d.width || 0.15,
        onClick: (info) => {
          const currentTime = Date.now();
          const delay = currentTime - lastClickTime;

          if (delay < 350 && info.object) {
            // Double Click Detected on Cable
            setShowCableMenu(true);
            setLastClickTime(0); // Reset
          } else {
            // Single Click
            setLastClickTime(currentTime);
          }
        },
      }),
      new PathLayer({
        id: "spacers-layer",
        data: spacers,
        pickable: true,
        widthScale: 1,
        widthUnits: "meters",
        widthMinPixels: 2,
        getPath: (d) => d.path,
        getColor: (d) => d.color || [20, 20, 20],
        getWidth: (d) => d.thickness || 0.2,
        updateTriggers: {
          getColor: [spacers],
          getPath: [spacers]
        }
      }),
      new PolygonLayer({
        id: "anchor-plates-layer",
        data: anchorPlates,
        pickable: false,
        stroked: false,
        filled: true,
        extruded: false,
        wireframe: true,
        getPolygon: (d) => d.polygon,
        getFillColor: [0, 0, 0, 255], // Black Solid
        getLineColor: [6, 182, 212, 255], // Cyan outline
        getLineWidth: 0.2, // Slightly thicker
        lineWidthUnits: "meters",
      }),
      new ScatterplotLayer({
        id: "debug-points-layer",
        data: debugPoints || [],
        getPosition: (d: { position: [number, number, number] }) => (Array.isArray(d?.position) && d.position.length >= 3) ? d.position : [0, 0, 0],
        getFillColor: [255, 59, 48, 255], // More vibrant red
        getLineColor: [255, 255, 255, 120], // Brighter outline
        getRadius: 1.8,
        radiusUnits: "meters",
        radiusMinPixels: 4,
        pickable: true,
        billboard: true,
        stroked: true, // Enable outline
        lineWidthUnits: "meters",
        getLineWidth: 0.15,
        parameters: {
          depthTest: false, // FORCE ALWAYS ON TOP
        },
        updateTriggers: {
          getPosition: [debugPoints]
        }
      }),
      new ScatterplotLayer({
        id: "ground-collision-plane",
        data: visibleTowers.filter(
          (t) => individualAltitudes[t.name] !== undefined,
        ),
        getPosition: (d: {
          coordinates: { lng: number; lat: number };
          name: string;
        }) => [
            d.coordinates.lng,
            d.coordinates.lat,
            individualAltitudes[d.name] || 0,
          ],
        getFillColor: [255, 255, 255, 40], // Faint white
        getLineColor: [255, 255, 255, 120], // Better visibility for the ring
        getRadius: 16,
        radiusUnits: "meters",
        stroked: true,
        filled: true,
        lineWidthUnits: "meters",
        getLineWidth: 0.1,
      }),
      new ScatterplotLayer({
        id: "tower-base-collision",
        data: visibleTowers.filter(
          (t) => individualAltitudes[t.name] !== undefined,
        ),
        getPosition: (d: {
          coordinates: { lng: number; lat: number };
          name: string;
        }) => [
            d.coordinates.lng,
            d.coordinates.lat,
            individualAltitudes[d.name] || 0,
          ],
        getFillColor: (_d: { name: string }) =>
          towerElevation < -0.1 ? [255, 69, 58, 160] : [52, 199, 89, 160], // Apple Design Colors (System Red/Green)
        getLineColor: (_d: { name: string }) =>
          towerElevation < -0.1 ? [255, 69, 58, 255] : [52, 199, 89, 255],
        getRadius: 16,
        radiusUnits: "meters",
        stroked: true,
        filled: true,
        lineWidthMinPixels: 2,
        pickable: true,
        onContextMenu: (info, event) => {
          if (event.srcEvent) event.srcEvent.preventDefault();
          if (info.object) {
            setContextMenu({
              x: info.x,
              y: info.y,
              tower: info.object,
            });
          }
        },
        onClick: (info) => {
          if (info.object) {
            const originalIndex = towers.findIndex(
              (t) => t.name === info.object.name,
            );
            if (originalIndex !== -1) handleTowerClick(info, originalIndex);
          }
        },
        parameters: {
          depthTest: true,
        },
      }),
      new TextLayer({
        id: "tower-labels-top",
        data: visibleTowers,
        getPosition: (d: {
          coordinates: { lng: number; lat: number; altitude: number };
          name: string;
        }) => [
            d.coordinates.lng,
            d.coordinates.lat,
            (individualAltitudes[d.name] !== undefined
              ? individualAltitudes[d.name]
              : d.coordinates.altitude || 0) +
            towerElevation +
            2,
          ],
        getText: (d: { name: string }) => d.name,
        getSize: 16,
        getAngle: 0,
        getTextAnchor: "middle",
        getAlignmentBaseline: "bottom",
        getColor: [255, 255, 255],
        background: true,
        getBackgroundColor: [0, 0, 0, 180],
        billboard: true,
        fontFamily: "Inter, sans-serif",
        fontWeight: 900,
        outlineWidth: 1,
        outlineColor: [0, 255, 170],
        pickable: true,
        onContextMenu: (info, event) => {
          if (event.srcEvent) event.srcEvent.preventDefault();
          if (info.object) {
            setContextMenu({
              x: info.x,
              y: info.y,
              tower: info.object,
            });
          }
        },
        onClick: (info: { object?: Tower; coordinate?: number[] }) => {
          if (info.object) {
            const originalIndex = towers.findIndex(
              (t) => t.name === info.object.name,
            );
            if (originalIndex !== -1) handleTowerClick(info, originalIndex);
          }
        },
      }),
      new TextLayer({
        id: "tower-labels",
        data: visibleTowers,
        getPosition: (d: {
          coordinates: { lng: number; lat: number; altitude: number };
          name: string;
        }) => [
            d.coordinates.lng,
            d.coordinates.lat,
            (individualAltitudes[d.name] !== undefined
              ? individualAltitudes[d.name]
              : d.coordinates.altitude || 0) +
            towerElevation -
            48 * (scale / 50) +
            0.1,
          ],
        getText: (d: { name: string }) => d.name,
        getSize: 10,
        getAngle: 0,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        getColor: [0, 0, 0],
        background: false,
        billboard: false,
        fontFamily: "Inter, sans-serif",
        fontWeight: 900,
        outlineWidth: 0,
        pickable: true,
        onContextMenu: (info, event) => {
          if (event.srcEvent) event.srcEvent.preventDefault();
          if (info.object) {
            setContextMenu({
              x: info.x,
              y: info.y,
              tower: info.object,
            });
          }
        },

        onClick: (info: { object?: Tower; coordinate?: number[] }) => {
          if (info.object) {
            const originalIndex = towers.findIndex(
              (t) => t.name === info.object?.name,
            );
            if (originalIndex !== -1) handleTowerClick(info, originalIndex);
          }
        },
      }),
      new SimpleMeshLayer({
        id: "signal-spheres-layer",
        data: signalSpheres,
        mesh: new SphereGeometry({ radius: 1, nlat: 16, nlong: 16 }),
        getPosition: (d: { position: [number, number, number] }) => d.position,
        getColor: (d: { color: [number, number, number] }) => [...d.color, 255],
        getScale: (d: { radius: number }) => [d.radius, d.radius, d.radius],
        // radiusUnits: "meters", // SimpleMeshLayer handles scale directly
        pickable: true,
        material: {
          ambient: 0.6, // Increased for visibility
          diffuse: 0.4,
          shininess: 64,
          specularColor: [255, 255, 255]
        },
        parameters: {
          depthTest: true,
          blend: true
        },
        updateTriggers: {
          getColor: [signalSpheres],
          getPosition: [signalSpheres]
        },
      }),
      // GLOW LAYER for Spheres (Additive pulse effect)
      new SimpleMeshLayer({
        id: "signal-spheres-glow-layer",
        data: signalSpheres,
        mesh: new SphereGeometry({ radius: 1.15, nlat: 8, nlong: 8 }), // Slightly larger
        getPosition: (d: { position: [number, number, number] }) => d.position,
        getColor: (d: { color: [number, number, number] }) => [...d.color, 60], // Consistent tint
        getScale: (d: { radius: number }) => [d.radius, d.radius, d.radius],
        parameters: {
          blend: true,
          blendFunc: [0x0302, 1], // Additive Blending (SRC_ALPHA, ONE)
          depthTest: true,
          depthMask: false // Don't block other spheres
        },
        updateTriggers: {
          getColor: [signalSpheres],
          getPosition: [signalSpheres]
        }
      }),
      // GLOW LAYER for Debug Points
      new ScatterplotLayer({
        id: "debug-points-glow",
        data: debugPoints || [],
        getPosition: (d: { position: [number, number, number] }) => (Array.isArray(d?.position) && d.position.length >= 3) ? d.position : [0, 0, 0],
        getFillColor: [255, 50, 50, 60],
        getRadius: 2.5, // Larger for glow effect
        radiusUnits: "meters",
        parameters: {
          blend: true,
          blendFunc: [0x0302, 1],
          depthTest: false
        },
        updateTriggers: {
          getPosition: [debugPoints]
        }
      })
    ];
  }, [
    towers,
    cables,
    spacers,
    signalSpheres,
    anchorPlates,
    hiddenTowers,
    hiddenTowerIds,
    scale,
    selectedStartTower,
    debugPoints,
    towerElevation,
    individualAltitudes,
    viewState.zoom,
    lastClickTime,
    handleTowerClick,
  ]);

  if (!MAPBOX_TOKEN)
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Token Mapbox Faltando
      </div>
    );

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white selection:bg-cyan-500/30 font-sans fixed inset-0"
      onContextMenu={(e) => e.preventDefault()}
    >
      {isLoading && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center gap-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
            <div className="absolute inset-0 blur-2xl bg-emerald-500/20 animate-pulse"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xl font-black italic tracking-widest text-emerald-400 animate-pulse uppercase">
              Sincronizando Dados
            </p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.4em]">
              Arquitetura OrioN 3D Inspector
            </p>
          </div>
        </div>
      )}

      {/* 2. Floating Toolbar - Tool-only & Simplified */}
      <div
        className={cn(
          "fixed bottom-10 left-1/2 -translate-x-1/2 transition-all duration-500",
          isFullScreen ? "z-60" : "z-50",
        )}
      >
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-4xl shadow-2xl p-2.5 flex items-center gap-3">
          {/* Feature Action Toggles */}
          <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-3xl border border-white/5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all gap-3",
                showTowerMenu
                  ? "bg-emerald-500 text-black shadow-lg"
                  : "text-neutral-400 hover:text-emerald-400",
              )}
              onClick={toggleTowerMenu}
            >
              <List className="w-4 h-4" />
              <span>Torres</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-11 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all gap-3",
                showCableMenu
                  ? "bg-cyan-500 text-black shadow-lg"
                  : "text-neutral-400 hover:text-cyan-400",
              )}
              onClick={toggleCableMenu}
            >
              <Zap className="w-4 h-4" />
              <span>Cabos</span>
            </Button>

            <div className="w-px h-8 bg-white/10 mx-1" />

            {/* Completed Work Insights */}
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

          {/* Correction / Editing Tools */}
          <div className="flex items-center gap-1.5">
            {[
              {
                icon: RefreshCw,
                label: "Snap",
                onClick: () => handleSnapToTerrain(),
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
                onClick: () => canEdit && setIsConnectMode(!isConnectMode),
                color: "text-orange-500",
                disabled: !canEdit,
              },
            ].map((tool, idx) => (
              <Button
                key={idx}
                variant="ghost"
                size="sm"
                disabled={"disabled" in tool ? tool.disabled : false}
                className={cn(
                  "h-11 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2.5 transition-all border border-transparent",
                  "active" in tool && tool.active
                    ? "bg-white/10 border-white/10 shadow-inner"
                    : "text-neutral-500 hover:bg-white/5 hover:border-white/5",
                  "disabled" in tool &&
                  tool.disabled &&
                  "opacity-20 cursor-not-allowed grayscale",
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

      {/* 3. Floating Premium Header (Visible only when in FullScreen) */}
      {isFullScreen && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 animate-in fade-in slide-in-from-top-6 duration-700 w-[95%] max-w-6xl">
          <div className="bg-black/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_0_80px_rgba(16,185,129,0.3)] p-4 flex items-center justify-between gap-8 ring-1 ring-white/10 relative overflow-hidden group">
            {/* Animated Border Light */}
            <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-emerald-500/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <div className="flex items-center gap-6">
              {/* Project Selector - Large Cockpit View */}
              <div className="flex items-center gap-4 pr-8 border-r border-white/10 shrink-0">
                <Select
                  value={selectedProjectId || ""}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="w-[100px] h-12 bg-white/5 border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all text-white">
                    <SelectValue placeholder="SELECIONAR OPERAÇÃO" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-white/10 rounded-2xl shadow-2xl">
                    {projects.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className="text-xs font-bold font-mono"
                      >
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Import & Minimize Actions */}
              <div className="shrink-0 flex items-center gap-3">
                {/* Completed Work Executive Panel Trigger */}
                {canSeeExecutivePanel && (
                  <CompletedWorkModal
                    projectId={selectedProjectId || undefined}
                    onSelectTower={handleSelectTowerFromModal}
                    onOpenChange={setIsExecutivePanelOpen}
                    hiddenTowerIds={hiddenTowerIds}
                    onHiddenTowerIdsChange={setHiddenTowerIds}
                  />
                )}

                <div className="w-px h-8 bg-white/10" />

                {canManage ? (
                  <>
                    <ExcelDataUploader onLoad={handleExcelImport} />
                    <Button
                      variant="outline"
                      disabled={
                        isClearing || !selectedProjectId || towers.length === 0
                      }
                      className="gap-2 bg-red-950/30 border-red-900/50 hover:bg-red-900/50 text-red-400 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      onClick={() => setIsClearConfirmOpen(true)}
                    >
                      {isClearing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Limpar Torres
                    </Button>
                  </>
                ) : (
                  <div className="h-12 px-6 rounded-2xl border border-dashed border-white/5 text-neutral-700 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                    Controle Admin Restrito
                  </div>
                )}
                <div className="w-px h-8 bg-white/10" />
                <Button
                  onClick={() => setIsFullScreen(false)}
                  variant="ghost"
                  size="sm"
                  className="h-12 px-6 rounded-2xl border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest group shadow-xl"
                >
                  <Maximize2 className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span>FECHAR COCKPIT</span>
                </Button>
              </div>
            </div>

            {/* Large Action Hub */}
            <div className="shrink-0 relative group">
              <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Button
                size="lg"
                className={cn(
                  "h-14 px-10 rounded-4xl font-black text-[11px] uppercase tracking-[0.4em] transition-all gap-5 shadow-2xl relative border-2 border-emerald-400/20 active:scale-95",
                  isSaving
                    ? "bg-emerald-500/50 cursor-wait"
                    : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/30",
                  !canEdit && "opacity-20 grayscale cursor-not-allowed",
                )}
                onClick={() => canEdit && handleSaveConfig(false)}
                disabled={!selectedProjectId || isSaving || !canEdit}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>{isSaving ? "PROCESSANDO" : "PUBLICAR PROJETO"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Area: Map Container with dynamic sizing */}
      <main
        className={cn(
          "fixed inset-0 transition-all duration-700 ease-in-out bg-neutral-950 overflow-hidden flex flex-col",
          isFullScreen ? "z-1 rounded-none border-none" : "z-0",
        )}
      >
        {/* 1. Floating Navigation Pills (Normal Mode) */}
        {!isFullScreen && (
          <div className="absolute top-6 left-0 right-0 z-50 px-6 flex items-center justify-center pointer-events-none">
            <div className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-full p-2 flex items-center gap-4 shadow-2xl ring-1 ring-white/10 pointer-events-auto max-w-full overflow-x-auto no-scrollbar">
              {/* Branding Project */}

              {/* Project Selector */}
              <div className="flex items-center gap-2 px-2 shrink-0">
                <Layers className="w-3.5 h-3.5 text-emerald-500/50" />
                <Select
                  value={selectedProjectId || ""}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="w-[180px] md:w-[240px] h-8 bg-transparent border-none focus:ring-0 rounded-full font-black text-[10px] uppercase tracking-widest hover:text-emerald-400 text-left px-0 shadow-none">
                    <SelectValue placeholder="SELECIONE O PROJETO" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 rounded-2xl shadow-2xl min-w-[240px]">
                    {projects.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className="text-[10px] font-bold font-mono py-2"
                      >
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Actions Divider */}
              <div className="w-px h-8 bg-white/10 shrink-0" />

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <ExcelDataUploader onLoad={handleExcelImport} />

                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full px-4 h-9 font-black text-[9px] uppercase tracking-widest border border-transparent hover:border-destructive/20"
                  onClick={resetProduction}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Limpar Torres
                </Button>
              </div>

              {/* Right Actions */}
              <div className="w-px h-8 bg-white/10 shrink-0" />

              <div className="flex items-center gap-2 shrink-0 pr-2">
                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full px-4 h-9 font-black text-[9px] uppercase tracking-widest border border-transparent hover:border-white/10"
                  onClick={() => navigate("/dashboard")}
                >
                  <Minimize2 className="w-3.5 h-3.5 mr-2" />
                  FECHAR COCKPIT
                </Button>

                <Button
                  className={cn(
                    "h-9 px-6 rounded-full font-black text-[9px] uppercase tracking-widest transition-all gap-2 shadow-lg",
                    isSaving
                      ? "bg-emerald-500/50 cursor-wait"
                      : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 shadow-emerald-500/10",
                  )}
                  onClick={() => canEdit && handleSaveConfig(false)}
                  disabled={!selectedProjectId || isSaving || !canEdit}
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>PUBLICAR</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="relative flex-1 group overflow-hidden">
          <ReactMap
            ref={mapRef}
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/satellite-v9"
            reuseMaps
            style={{ width: "100%", height: "100%" }}
            doubleClickZoom={false}
          >
            <TerrainManager />
            <DeckGLOverlay
              layers={layers}
              getTooltip={({ object }: { object: Tower | Cable | { path?: any } }) => {
                if (!object) return null;
                if ("path" in object) {
                  return {
                    html: `<div class="p-4 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-3xl ring-1 ring-white/20">
                                            <div class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">Span Conectado</div>
                                            <div class="text-[11px] text-white font-black tracking-tighter uppercase italic">${(object as any).phase || 'Cabo de Transmissão'}</div>
                                            <div class="mt-2 text-[8px] text-neutral-500 uppercase font-black tracking-[0.2em]">Catenária Analítica OrioN</div>
                                        </div>`,
                  };
                }
                return null;
              }}
            />
          </ReactMap>

          {/* Custom Context Menu */}
          {contextMenu && (
            <div
              className="fixed z-100 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 min-w-[200px] shadow-3xl animate-in fade-in zoom-in-95 duration-200"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-1">
                <div className="px-3 py-2 border-b border-white/5 mb-1 bg-white/5 rounded-t-xl">
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-tight">
                    Estrutura
                  </p>
                  <h4 className="text-xs font-black text-white italic tracking-tighter">
                    {contextMenu.tower.name}
                  </h4>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10 px-3 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all border border-transparent hover:border-emerald-500/20"
                  onClick={() => {
                    setSelectedTowerForDetails(contextMenu.tower);
                    setIsTowerModalOpen(true);
                    setLastClickTime(0);
                    setContextMenu(null);
                  }}
                >
                  <Info className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Ver Detalhes
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10 px-3 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded-xl transition-all border border-transparent hover:border-cyan-500/20"
                  onClick={() => {
                    const map = mapRef.current?.getMap();
                    if (map) {
                      map.flyTo({
                        center: [
                          contextMenu.tower.coordinates.lng,
                          contextMenu.tower.coordinates.lat,
                        ],
                        zoom: 18,
                        pitch: 60,
                        duration: 2000,
                      });
                    }
                    setContextMenu(null);
                  }}
                >
                  <Navigation className="w-4 h-4" />{" "}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Focar Estrutura
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10 px-3 hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl transition-all"
                  onClick={() => {
                    setSelectedTowerForHistory(contextMenu.tower);
                    setIsExecutionHistoryModalOpen(true);
                    setContextMenu(null);
                  }}
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Relatório de Execução
                  </span>
                </Button>

                <div className="h-px bg-white/5 my-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10 px-3 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                  onClick={() => {
                    const towerIndex = towers.findIndex(
                      (t) => t.name === contextMenu.tower.name,
                    );
                    if (towerIndex !== -1) toggleTowerVisibility(towerIndex);
                    setContextMenu(null);
                  }}
                >
                  <EyeOff className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Ocultar Estrutura
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start gap-3 h-10 px-3 hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl transition-all"
                  onClick={() => setContextMenu(null)}
                >
                  <X className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Fechar
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Minimal Overlay Info (Shifted up to accommodate Bottom Toolbar) */}
        <div className="absolute bottom-16 left-10 flex gap-12 text-left pointer-events-none">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-1">
              Torres
            </p>
            <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none">
              {towers.length}
              <span className="text-emerald-500 text-lg not-italic ml-1">
                UNITS
              </span>
            </h3>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <p className="text-[10px] font-black uppercase text-neutral-500 tracking-widest mb-1">
              Caboos
            </p>
            <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none">
              {Number(cables.length).toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              <span className="text-cyan-500 text-lg not-italic ml-1">
                KM-LT
              </span>
            </h3>
          </div>
        </div>

        {/* Drawer Overlay for Mobile/Professional Side Menu */}
        {showTowerMenu && (
          <div className="fixed top-24 bottom-6 right-6 w-full max-w-[340px] z-40 animate-in slide-in-from-right-10 duration-500">
            <div className="h-full bg-neutral-950/80 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-4xl flex flex-col overflow-hidden ring-1 ring-white/20">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/2">
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                    Estruturas
                  </h2>
                  <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-[0.3em] mt-1">
                    Base de Dados Técnica
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTowerMenu(false)}
                  className="w-8 h-8 rounded-xl hover:bg-white/5 text-neutral-500 hover:text-white transition-colors"
                >
                  <Maximize2 className="w-4 h-4 rotate-45" />
                </Button>
              </div>

              <div className="border-b border-white/5 transition-all duration-300">
                <button
                  onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Controles
                  </span>
                  {isControlsCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-neutral-500" />
                  )}
                </button>

                {!isControlsCollapsed && (
                  <div className="p-6 space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[9px] text-neutral-400 uppercase font-black tracking-widest pl-1">
                        <span>Escala Global</span>
                        <span className="text-emerald-500 text-xs italic font-mono">
                          {(scale / 50).toFixed(1)}x
                        </span>
                      </div>
                      <Slider
                        value={[scale]}
                        min={10}
                        max={150}
                        step={1}
                        onValueChange={(val) => canEdit && setScale(val[0])}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[9px] text-neutral-400 uppercase font-black tracking-widest pl-1">
                        <span>Elevação</span>
                        <span className="text-cyan-500 text-xs italic font-mono">
                          {towerElevation.toFixed(1)}m
                        </span>
                      </div>
                      <Slider
                        value={[towerElevation]}
                        min={-20}
                        max={50}
                        step={0.5}
                        onValueChange={(val) =>
                          canEdit && setTowerElevation(val[0])
                        }
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                        onClick={() => setHiddenTowers(new Set())}
                      >
                        Exibir Tudo
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                        onClick={() =>
                          setHiddenTowers(new Set(towers.map((_, i) => i)))
                        }
                      >
                        Ocultar Tudo
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Filter */}
              <div className="py-5 px-5">
                <div className="relative ">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                  <Input
                    placeholder="BUSCAR ESTRUTURA..."
                    value={towerSearch}
                    onChange={(e) => setTowerSearch(e.target.value)}
                    className="h-9 bg-white/5 border-white/10 rounded-xl pl-9 text-[10px] font-black uppercase tracking-widest focus:ring-emerald-500/50 focus:placeholder:text-neutral-600"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
                {towers
                  .map((t, i) => ({ tower: t, index: i })) // Keep original index for handlers
                  .filter(({ tower }) =>
                    tower.name
                      .toLowerCase()
                      .includes(towerSearch.toLowerCase()),
                  )
                  .map(({ tower: t, index: i }) => (
                    <div
                      key={i}
                      className={cn(
                        "group p-3 rounded-2xl border transition-all duration-300 flex items-center gap-3 relative overflow-hidden",
                        hiddenTowers.has(i)
                          ? "bg-transparent border-transparent opacity-20 scale-95"
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 shadow-lg hover:scale-[1.02]",
                      )}
                    >
                      <div className="absolute inset-y-0 left-0 w-[2px] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-full group-hover:translate-x-0" />

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          if (hiddenTowers.has(i)) return;
                          mapRef.current?.getMap()?.flyTo({
                            center: [t.coordinates.lng, t.coordinates.lat],
                            zoom: 18,
                            pitch: 45,
                            duration: 2500,
                            essential: true,
                          });
                        }}
                      >
                        <h4
                          className={cn(
                            "font-black tracking-tighter text-base leading-none mb-1",
                            hiddenTowers.has(i)
                              ? "text-neutral-700"
                              : "text-emerald-400",
                          )}
                        >
                          {t.name}
                        </h4>
                        <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-tighter italic">
                          SEQ: {String(i).padStart(3, "0")} •{" "}
                          {Math.abs(t.coordinates.lat).toFixed(4)}°S
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-10 h-10 text-neutral-600 hover:text-white hover:bg-white/5 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTowerForDetails(t);
                          setIsTowerModalOpen(true);
                        }}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <CableConfigModal
        isOpen={showCableMenu}
        onClose={() => setShowCableMenu(false)}
        phases={phases}
        onUpdate={setPhases}
        onSave={() => handleSaveConfig(true)}
        onRestoreDefaults={() => {
          setPhases((prev) =>
            prev.map((p) => {
              const def = DEFAULT_PHASES.find((dp) => dp.id === p.id);
              if (def) {
                return {
                  ...p,
                  color: def.color,
                  cableType: def.cableType,
                  width: def.width,
                  spacerColor: def.spacerColor,
                };
              }
              return p;
            }),
          );
          showToast({
            title: "Configurações Restauradas",
            description:
              "Cores e materiais resetados, mantendo ajustes posicionais.",
          });
        }}
        readOnly={!canEdit}
        onScanTower={scanTowerPoints}
      />

      <TowerDetailsModals
        isOpen={isTowerModalOpen}
        onClose={() => setIsTowerModalOpen(false)}
        tower={selectedTowerForDetails}
      />

      <TowerExecutionHistoryModal
        isOpen={isExecutionHistoryModalOpen}
        onClose={() => setIsExecutionHistoryModalOpen(false)}
        tower={selectedTowerForHistory}
        projectId={selectedProjectId || null}
      />

      <CompletedWorkModal
        projectId={selectedProjectId || undefined}
        onSelectTower={handleSelectTowerFromModal}
        open={isCompletedWorkModalOpen}
        onOpenChange={setCompletedWorkModalOpen}
        hiddenTowerIds={hiddenTowerIds}
        onHiddenTowerIdsChange={setHiddenTowerIds}
      />

      {/* Clear Towers Confirmation Dialog */}
      <AlertDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
      >
        <AlertDialogContent className="bg-neutral-950 border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 font-black text-lg">
              Confirmar Limpeza de Torres
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              Você tem certeza que deseja remover{" "}
              <strong className="text-white">{towers.length} torres</strong> do
              projeto selecionado?
              <br />
              <br />
              Esta ação irá remover todos os dados técnicos das torres. Você
              poderá importar os dados novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-neutral-300 hover:bg-white/5">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearTowers}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              {isClearing ? "Removendo..." : "Sim, Remover Torres"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />

      {/* Global Floating Action removed by user request */}
    </div>
  );
}
