import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orionApi } from "@/integrations/orion/client";

interface SettingsContextType {
  logoUrl: string | null;
  logoWidth: number;
  appName: string;
  appIconUrl: string | null;
  isLoading: boolean;
  saveSettings: (
    companyId: string,
    newLogoFile?: File | null,
    newWidth?: number,
    newAppName?: string,
    newIconFile?: File | null
  ) => Promise<{ success: boolean; error?: string }>;
  fetchSettings: (companyId: string) => Promise<void>;
}

const DEFAULT_LOGO_WIDTH = 150;
const DEFAULT_APP_NAME = "Gestão Virtual";
const STORAGE_KEY_LOGO_WIDTH = "app_logo_width";
const STORAGE_KEY_APP_NAME = "app_name";

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoWidth, setLogoWidth] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LOGO_WIDTH);
    return saved ? parseInt(saved, 10) : DEFAULT_LOGO_WIDTH;
  });
  const [appName, setAppName] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_APP_NAME);
    return saved || DEFAULT_APP_NAME;
  });
  const [appIconUrl, setAppIconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initial document title sync
  useEffect(() => {
    document.title = appName;
  }, [appName]);

  const fetchSettings = useCallback(async (companyId: string) => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await orionApi.from("companies").select("*").eq("id", companyId).single();
      
      if (data && !error) {
        if (data.logoUrl) setLogoUrl(data.logoUrl);

        if (data.metadata?.theme?.logoWidth) {
          const width = data.metadata.theme.logoWidth;
          setLogoWidth(width);
          localStorage.setItem(STORAGE_KEY_LOGO_WIDTH, String(width));
        }

        if (data.metadata?.system?.appName) {
          const name = data.metadata.system.appName;
          setAppName(name);
          localStorage.setItem(STORAGE_KEY_APP_NAME, name);
        }

        if (data.metadata?.system?.appIconUrl) {
          const iconUrl = data.metadata.system.appIconUrl;
          setAppIconUrl(iconUrl);
          const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (link) link.href = iconUrl;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch company settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (
    companyId: string, 
    newLogoFile?: File | null, 
    newWidth?: number,
    newAppName?: string,
    newIconFile?: File | null
  ) => {
    if (!companyId) return { success: false, error: "No company ID provided" };
    
    setIsLoading(true);
    try {
      const updates: any = {};
      const metadataUpdates: any = { theme: {}, system: {} };

      // 1. Handle Logo Upload
      if (newLogoFile) {
          const path = `logos/${companyId}/${Date.now()}_${newLogoFile.name}`;
          const { error: uploadError } = await orionApi.storage.from("public").upload(path, newLogoFile);
          
          if (uploadError) {
               const base64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(newLogoFile);
               });
               updates.logoUrl = base64;
          } else {
               const { data: urlData } = orionApi.storage.from("public").getPublicUrl(path);
               updates.logoUrl = urlData.publicUrl;
          }
      } 
      if (updates.logoUrl) setLogoUrl(updates.logoUrl);

      // 2. Handle Icon Upload
      if (newIconFile) {
        const path = `icons/${companyId}/${Date.now()}_${newIconFile.name}`;
        const { error: uploadError } = await orionApi.storage.from("public").upload(path, newIconFile);
        
        let iconUrl = "";
        if (uploadError) {
             iconUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(newIconFile);
             });
        } else {
             const { data: urlData } = orionApi.storage.from("public").getPublicUrl(path);
             iconUrl = urlData.publicUrl;
        }
        metadataUpdates.system.appIconUrl = iconUrl;
        setAppIconUrl(iconUrl);
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) link.href = iconUrl;
      }

      // 3. Handle Width
      if (newWidth !== undefined) {
          setLogoWidth(newWidth);
          localStorage.setItem(STORAGE_KEY_LOGO_WIDTH, String(newWidth));
          metadataUpdates.theme.logoWidth = newWidth;
      }

      // 4. Handle App Name
      if (newAppName !== undefined) {
        setAppName(newAppName);
        localStorage.setItem(STORAGE_KEY_APP_NAME, newAppName);
        metadataUpdates.system.appName = newAppName;
      }

      // 5. Persist to Database
      const { data: current } = await orionApi.from("companies").select("metadata").eq("id", companyId).single();
      
      const existingMetadata = current?.metadata || {};
      const finalMetadata = {
          ...existingMetadata,
          theme: {
              ...existingMetadata.theme,
              ...metadataUpdates.theme
          },
          system: {
              ...existingMetadata.system,
              ...metadataUpdates.system
          }
      };

      updates.metadata = finalMetadata;

      const { error: updateError } = await orionApi.from("companies").update(updates).eq("id", companyId);

      if (updateError) throw updateError;

      return { success: true };

    } catch (err: any) {
      console.error("Error saving settings:", err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        logoUrl,
        logoWidth,
        appName,
        appIconUrl,
        isLoading,
        saveSettings,
        fetchSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
