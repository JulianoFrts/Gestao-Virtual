import { PhaseConfig } from "../types";

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
    spacerColor: [255, 80, 0],
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
  },
  {
    id: "PHASE_A",
    name: "Fase A (Superior)",
    enabled: true,
    color: [255, 50, 50],
    tension: 1000,
    verticalOffset: 28,
    horizontalOffset: 5,
    relativeHeight: 70,
    cableCount: 2,
    bundleSpacing: 0.45,
  },
  {
    id: "PHASE_B",
    name: "Fase B (Média)",
    enabled: true,
    color: [255, 255, 50],
    tension: 1000,
    verticalOffset: 16,
    horizontalOffset: 6,
    relativeHeight: 50,
    cableCount: 2,
    bundleSpacing: 0.45,
  },
  {
    id: "PHASE_C",
    name: "Fase C (Inferior)",
    enabled: true,
    color: [50, 150, 255],
    tension: 1000,
    verticalOffset: 4,
    horizontalOffset: 5,
    relativeHeight: 20,
    cableCount: 2,
    bundleSpacing: 0.45,
  },
];

/**
 * CONFIGURAÇÃO DE MODELOS 3D
 * Adicione novos modelos aqui. 
 * O modelUrl deve apontar para arquivos dentro de /public/models/
 */
export const TOWER_MODELS_CONFIG = [
  {
    id: "SUSPENSAO",
    name: "Torre de Suspensão",
    modelUrl: "/models/towers/scene.gltf", // Modelo Padrão
    description: "Estrutura para trechos retilíneos",
  },
  {
    id: "ANCORAGEM",
    name: "Torre de Ancoragem",
    modelUrl: "/models/towers/scene.gltf", // Atualmente igual ao padrão
    description: "Estrutura para ângulos e fins de linha",
  },
  {
    id: "PORTICO",
    name: "Pórtico / Estaiada",
    modelUrl: "/models/towers/scene.gltf", // Alterado para o padrão conforme pedido
    description: "Estrutura especial de entrada/saída",
  },
];
