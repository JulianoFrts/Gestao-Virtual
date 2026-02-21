import { signal, effect } from "@preact/signals-react";
import { orionApi } from "@/integrations/orion/client";
import { companies } from "./globalDataSignals";
import { useAuth } from "@/contexts/AuthContext";

// Constants
const DEFAULT_LOGO_WIDTH = 150;
const DEFAULT_APP_NAME = "Gestão Virtual";
const STORAGE_KEY_LOGO_WIDTH = "app_logo_width";
const STORAGE_KEY_APP_NAME = "app_name";

// State
export const logoUrlSignal = signal<string | null>(null);
export const logoWidthSignal = signal<number>(DEFAULT_LOGO_WIDTH);
export const appNameSignal = signal<string>(DEFAULT_APP_NAME);
export const appIconUrlSignal = signal<string | null>(null);
export const isLoadingSettingsSignal = signal<boolean>(false);

// Actions
export const initSettings = async (companyId?: string) => {
  // 1. Load local preferences first (fast interaction)
  const savedWidth = localStorage.getItem(STORAGE_KEY_LOGO_WIDTH);
  if (savedWidth) {
    logoWidthSignal.value = parseInt(savedWidth, 10);
  }
  const savedAppName = localStorage.getItem(STORAGE_KEY_APP_NAME);
  if (savedAppName) {
    appNameSignal.value = savedAppName;
    document.title = savedAppName;
  }

  // 2. Fetch Company Data if we have an ID
  if (companyId) {
    isLoadingSettingsSignal.value = true;
    try {
      // Fetch fresh company data including metadata
      const { data, error } = await orionApi.from("companies").select("*").eq("id", companyId).single();
      
      if (data && !error) {
        // Sync Logo
        if (data.logoUrl) {
          logoUrlSignal.value = data.logoUrl;
        }

        // Sync Metadata Settings (if exists)
        if (data.metadata?.theme?.logoWidth) {
          logoWidthSignal.value = data.metadata.theme.logoWidth;
          localStorage.setItem(STORAGE_KEY_LOGO_WIDTH, String(data.metadata.theme.logoWidth));
        }

        if (data.metadata?.system?.appName) {
          appNameSignal.value = data.metadata.system.appName;
          localStorage.setItem(STORAGE_KEY_APP_NAME, data.metadata.system.appName);
          document.title = data.metadata.system.appName;
        }

        if (data.metadata?.system?.appIconUrl) {
          appIconUrlSignal.value = data.metadata.system.appIconUrl;
          // Update favicon
          const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
          if (link) link.href = data.metadata.system.appIconUrl;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch company settings:", err);
    } finally {
      isLoadingSettingsSignal.value = false;
    }
  }
};

export const saveSettings = async (
  companyId: string, 
  newLogoFile?: File | null, 
  newWidth?: number,
  newAppName?: string,
  newIconFile?: File | null
) => {
  if (!companyId) return { success: false, error: "No company ID provided" };
  
  isLoadingSettingsSignal.value = true;
  try {
    const updates: any = {};
    const metadataUpdates: any = { theme: {}, system: {} };

    // 1. Handle Logo Upload
    if (newLogoFile) {
        const path = `logos/${companyId}/${Date.now()}_${newLogoFile.name}`;
        const { data: uploadData, error: uploadError } = await orionApi.storage.from("public").upload(path, newLogoFile);
        
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
    if (updates.logoUrl) logoUrlSignal.value = updates.logoUrl;

    // 2. Handle Icon Upload
    if (newIconFile) {
      const path = `icons/${companyId}/${Date.now()}_${newIconFile.name}`;
      const { data: uploadData, error: uploadError } = await orionApi.storage.from("public").upload(path, newIconFile);
      
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
      appIconUrlSignal.value = iconUrl;
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (link) link.href = iconUrl;
  }

    // 3. Handle Width
    if (newWidth !== undefined) {
        logoWidthSignal.value = newWidth;
        localStorage.setItem(STORAGE_KEY_LOGO_WIDTH, String(newWidth));
        metadataUpdates.theme.logoWidth = newWidth;
    }

    // 4. Handle App Name
    if (newAppName !== undefined) {
      appNameSignal.value = newAppName;
      localStorage.setItem(STORAGE_KEY_APP_NAME, newAppName);
      document.title = newAppName;
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
    isLoadingSettingsSignal.value = false;
  }
};
