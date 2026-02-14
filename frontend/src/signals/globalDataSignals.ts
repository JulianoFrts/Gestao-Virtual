import { signal, computed } from "@preact/signals-react";
import { db } from "@/integrations/database";
import { orionApi } from "@/integrations/orion/client";
import { storageService } from "@/services/storageService";

export interface Company {
  id: string;
  name: string;
}
export interface Project {
  id: string;
  companyId: string;
  name: string;
  address?: string | null;
  status: string;
  plannedHours?: number;
  estimatedCost?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  xLat?: number | null;
  yLa?: number | null;
  createdAt?: string | Date;
}
export interface Site {
  id: string;
  name: string;
  projectId: string;
  locationDetails?: string | null;
  plannedHours?: number;
  xLat?: number | null;
  yLa?: number | null;
  createdAt?: string | Date;
}

export const companies = signal<Company[]>([]);
export const projects = signal<Project[]>([]);
export const sites = signal<Site[]>([]);
export const selectedProjectSignal = signal<Project | null>(null);
import { isLoadingDataSignal, hasGlobalDataFetchedSignal } from "./syncSignals";

let lastFetchTime = 0;
const FETCH_COOLDOWN = 10000; // 10s cooldown for auto-fetches

const performFetch = async () => {
  // Verificar se há token antes de fazer requisição para evitar loop de 401
  if (!orionApi.token) {
    console.log("[GlobalDataSignals] No auth token, skipping API fetch.");
    return;
  }

  isLoadingDataSignal.value = true;
  try {
    if (!navigator.onLine) {
      const [c, p, s] = await Promise.all([
        storageService.getItem<Company[]>("companies"),
        storageService.getItem<Project[]>("projects"),
        storageService.getItem<Site[]>("sites"),
      ]);
      if (c) companies.value = c;
      if (p) projects.value = p;
      if (s) sites.value = s;
      return;
    }

    const [compRes, projRes, siteRes] = await Promise.all([
      db.from("companies").select("*"),
      db.from("projects").select("*"),
      db.from("sites").select("*"),
    ]);

    if (compRes.data) {
        companies.value = compRes.data as Company[];
        storageService.setItem("companies", compRes.data);
    }
    if (projRes.data) {
        projects.value = projRes.data as Project[];
        storageService.setItem("projects", projRes.data);
    }
    if (siteRes.data) {
        sites.value = siteRes.data as Site[];
        storageService.setItem("sites", siteRes.data);
    }
  } catch (err) {
    console.warn("[GlobalDataSignals] Network error, falling back to cache.");
    const [c, p, s] = await Promise.all([
        storageService.getItem<Company[]>("companies"),
        storageService.getItem<Project[]>("projects"),
        storageService.getItem<Site[]>("sites"),
    ]);
    if (c) companies.value = c;
    if (p) projects.value = p;
    if (s) sites.value = s;
  } finally {
    isLoadingDataSignal.value = false;
    hasGlobalDataFetchedSignal.value = true;
  }
};

export const fetchGlobalData = async (force = false) => {
  const now = Date.now();
  if (isLoadingDataSignal.value || (!force && now - lastFetchTime < FETCH_COOLDOWN))
    return;
  lastFetchTime = now;
  await performFetch();
};
