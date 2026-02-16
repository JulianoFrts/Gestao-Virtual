import { signal, effect } from "@preact/signals-react";
import { orionApi } from "@/integrations/orion/client";
import { companies } from "./globalDataSignals";
import { useAuth } from "@/contexts/AuthContext";

// Constants
const DEFAULT_LOGO_WIDTH = 150;
const STORAGE_KEY_LOGO_WIDTH = "app_logo_width";

// State
export const logoUrlSignal = signal<string | null>(null);
export const logoWidthSignal = signal<number>(DEFAULT_LOGO_WIDTH);
export const isLoadingSettingsSignal = signal<boolean>(false);

// Actions
export const initSettings = async (companyId?: string) => {
  // 1. Load local preferences first (fast interaction)
  const savedWidth = localStorage.getItem(STORAGE_KEY_LOGO_WIDTH);
  if (savedWidth) {
    logoWidthSignal.value = parseInt(savedWidth, 10);
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
          // Update local cache
          localStorage.setItem(STORAGE_KEY_LOGO_WIDTH, String(data.metadata.theme.logoWidth));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch company settings:", err);
    } finally {
      isLoadingSettingsSignal.value = false;
    }
  }
};

export const saveSettings = async (companyId: string, newLogoFile?: File | null, newWidth?: number) => {
  if (!companyId) return { success: false, error: "No company ID provided" };
  
  isLoadingSettingsSignal.value = true;
  try {
    const updates: any = {};
    const metadataUpdates: any = { theme: {} };

    // 1. Handle Logo Upload if provided
    if (newLogoFile) {
        // Just upload generic "logo" path to reuse or timestamp it
        const path = `logos/${companyId}/${Date.now()}_${newLogoFile.name}`;
        const { data: uploadData, error: uploadError } = await orionApi.storage.from("public").upload(path, newLogoFile);
        
        if (uploadError) {
             // Fallback: Convert to Base64 if storage fails (or for simple implementations)
             // For now, let's try to assume we can set a URL. 
             // If upload fails, we might try to use a data URI or just fail.
             // Let's use a Data URI generator for redundancy if needed, but for now we throw.
             console.error("Upload failed", uploadError);
             
             // Fallback to Base64
             const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(newLogoFile);
             });
             updates.logoUrl = base64;
        } else {
             // Construct public URL
             const { data: urlData } = orionApi.storage.from("public").getPublicUrl(path);
             updates.logoUrl = urlData.publicUrl;
        }
    } 
    // If explicitly null passed? (Remove logo) - Not implemented yet in UI 

    // Update signal update immediately for UI responsiveness
    if (updates.logoUrl) logoUrlSignal.value = updates.logoUrl;

    // 2. Handle Width
    if (newWidth !== undefined) {
        logoWidthSignal.value = newWidth;
        localStorage.setItem(STORAGE_KEY_LOGO_WIDTH, String(newWidth));
        metadataUpdates.theme.logoWidth = newWidth;
    }

    // 3. Persist to Database
    // We need to merge metadata, not overwrite blindly, but for now we assume simple structure
    // First get current metadata
    const { data: current, error: fetchError } = await orionApi.from("companies").select("metadata").eq("id", companyId).single();
    
    const existingMetadata = current?.metadata || {};
    const finalMetadata = {
        ...existingMetadata,
        theme: {
            ...existingMetadata.theme,
            ...metadataUpdates.theme
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
