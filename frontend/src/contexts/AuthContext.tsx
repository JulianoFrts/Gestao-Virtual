import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "@/hooks/use-toast";
import { storageService } from "@/services/storageService";
import { logError } from "@/lib/errorHandler";
import { localApi } from "@/integrations/orion/client";
import {
  permissionsSignal,
  uiSignal,
  currentUserSignal,
  isAuthLoadingSignal,
  simulationRoleSignal,
  realPermissionsSignal,
  realUiSignal,
  selectedContextSignal
} from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";

interface Profile {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  avatarUrl: string | null;
  image?: string | null;
  role:
  | "SUPER_ADMIN"
  | "SUPER_ADMIN_GOD"
  | "ADMIN"
  | "TI_SOFTWARE"
  | "GESTOR_PROJECT"
  | "GESTOR_CANTEIRO"
  | "SUPERVISOR"
  | "WORKER"
  | "VIEWER"
  | "HELPER_SYSTEM";
  registrationNumber?: string;
  employeeId?: string;
  companyId?: string;
  projectId?: string;
  siteId?: string | null;
  isSystemAdmin?: boolean;
  hierarchyLevel?: number;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  permissionsMap?: Record<string, boolean>;
  ui?: Record<string, boolean>;
}

interface OfflineAccount {
  identifier: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
  cachedAt: number;
}

interface AuthContextType {
  user: ({ id: string; email?: string } & Record<string, unknown>) | null;
  session: Record<string, unknown> | null;
  profile: Profile | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    mfaRequired?: boolean;
    profile?: Profile;
  }>;
  loginOffline: () => Promise<{ success: boolean; error?: string }>;
  getLastOfflineAccount: () => Promise<OfflineAccount | null>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  disableMfa: () => Promise<{ success: boolean; error?: string }>;
  enableMfa: (secret: string) => Promise<{ success: boolean; error?: string }>;
  isMfaVerified: boolean;
  setMfaVerified: (verified: boolean) => void;
  refreshProfile: () => Promise<void>;
  selectedContext: { companyId?: string; projectId?: string; siteId?: string } | null;
  selectContext: (context: { companyId?: string; projectId?: string; siteId?: string }) => Promise<void>;
  bypassAuth: () => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  useSignals();
  const [user, setUser] = useState<
    ({ id: string; email?: string } & Record<string, unknown>) | null
  >(null);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMfaVerified, setIsMfaVerified] = useState<boolean>(() => {
    return sessionStorage.getItem("mfa_verified") === "true";
  });

  const setMfaVerified = (verified: boolean) => {
    setIsMfaVerified(verified);
    sessionStorage.setItem("mfa_verified", verified ? "true" : "false");
  };

  const selectContext = async (context: { companyId?: string; projectId?: string; siteId?: string }) => {
    try {
      const response = await localApi.post("/auth/context/validate", context);
      const data = response.data as any;
      if (data?.success) {
        selectedContextSignal.value = context;
        await storageService.setItem("selected_context", context);
      } else {
        throw new Error(data?.error || "Falha ao validar contexto");
      }
    } catch (err: any) {
        console.error("[AuthContext] Context validation failed:", err);
        throw err;
    }
  };

  const fetchProfile = React.useCallback(
    async (userId: string): Promise<Profile | undefined> => {
      if (!userId || userId === "undefined") {
        console.warn(
          "[AuthContext] fetchProfile called with invalid userId:",
          userId,
        );
        return undefined;
      }
      try {
        let userData: Record<string, any> = {};
        let permissions: Record<string, boolean> = {};
        let ui: Record<string, boolean> = {};

        // 1. Buscar Perfil do Backend Local (Endpoint dedicado que calcula permissões)
        try {
          // Tentativa via REST padrão do Backend ORION
          const response = await localApi.get("/users/profile");

          if (response.data) {
            userData = response.data;
          } else {
            // Fallback se falhar
            console.warn(
              "[AuthContext] /users/me returned empty. Trying fallback DB fetch.",
            );
            const { data: localProfile } = await localApi
              .from("users")
              .eq("id", userId)
              .single();
            if (localProfile) userData = localProfile;
          }
        } catch (err) {
          console.error("[AuthContext] Failed to fetch profile from API:", err);
          // Fallback final
          const { data: localProfile } = await localApi
            .from("users")
            .eq("id", userId)
            .single();
          userData = localProfile;
        }

        if (!userData) {
          console.warn(
            "[AuthContext] No profile data found for userId:",
            userId,
          );
          return undefined;
        }

        // Buscar Matriz de Permissões e UI Flags (Agora vem pronto do Backend no userData)
        if (userData.permissions) {
          permissions = userData.permissions;
        }
        if (userData.ui) {
          ui = userData.ui;
        }

        const newProfile: Profile = {
          id: userData.id || userId,
          username: userData.username || userData.email?.split("@")[0],
          fullName: userData.name || userData.fullName || "Usuário",
          email: userData.email,
          avatarUrl:
            userData.image || userData.avatarUrl || userData.avatar_url,
          image: userData.image || userData.avatarUrl || userData.avatar_url,
          role: (userData.role?.toUpperCase() as any) || "WORKER",
          registrationNumber:
            userData.registrationNumber || userData.registration_number,
          employeeId: userData.id,
          companyId: userData.companyId || userData.company_id,
          projectId: userData.projectId || userData.project_id,
          siteId: userData.siteId || userData.site_id,
          isSystemAdmin: !!userData.isSystemAdmin,
          mfaEnabled: !!userData.mfaEnabled,
          mfaSecret: userData?.mfaSecret,
          permissionsMap: permissions,
          ui,
        };

        setProfile(newProfile);
        
        if (simulationRoleSignal.value) {
            // Se estivermos simulando um papel, não destrua a simulação!
            // Atualize apenas os backups com as permissões reais frescas.
            realPermissionsSignal.value = permissions;
            realUiSignal.value = ui;
            
            // Mas atualize o currentUserSignal para refletir a simulação ativa e ocultar as permissões de God do usuário real
            currentUserSignal.value = {
                ...newProfile,
                role: simulationRoleSignal.value as any,
                isSystemAdmin: false, // Segredo do Sandbox: Corta flag verdadeira de Admin
                permissions: permissionsSignal.value,
                ui: uiSignal.value,
            };
        } else {
            permissionsSignal.value = permissions;
            uiSignal.value = ui;
            currentUserSignal.value = newProfile;
        }

        const cacheKey = `profile_cache_${newProfile.id}`;
        await storageService.setItem(cacheKey, newProfile);

        // [NOVO] Lógica de Auto-Seleção de Contexto
        // Se não houver contexto selecionado, populamos com o que veio do perfil
        if (!selectedContextSignal.value && newProfile.companyId) {
            const initialContext = {
                companyId: newProfile.companyId,
                projectId: newProfile.projectId,
                siteId: newProfile.siteId || undefined
            };
            
            console.log("[AuthContext] Aplicando auto-seleção de contexto:", initialContext);
            selectedContextSignal.value = initialContext;
            await storageService.setItem("selected_context", initialContext);
        }

        return newProfile;
      } catch (error) {
        console.error("Error fetching profile:", error);
        return undefined;
      }
    },
    [],
  );

  useEffect(() => {
    const {
      data: { subscription },
    } = localApi.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(prev => {
        const next = (session?.user as any) ?? null;
        if (prev?.id === next?.id && prev !== null) return prev; // Manter referência se o ID for igual
        return next;
      });
      currentUserSignal.value = (session?.user as any) ?? null; // Sincronizar Signal

      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        permissionsSignal.value = {}; // Limpar permissões
        uiSignal.value = {}; // Limpar UI flags
        currentUserSignal.value = null;
      }
    });

    const initAuth = async () => {
      isAuthLoadingSignal.value = true;
      // Carregar estado de verificação MFA do storage
      const savedMfa = sessionStorage.getItem("mfa_verified") === "true";
      if (savedMfa) setIsMfaVerified(true);

      const {
        data: { session: currentSession },
      } = await localApi.auth.getSession();

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(
          currentSession.user as { id: string; email?: string } & Record<
            string,
            unknown
          >,
        );
        currentUserSignal.value = currentSession.user;

        const cacheKey = `profile_cache_${currentSession.user.id}`;
        const cachedProfile = await storageService.getItem<Profile>(cacheKey);

        if (cachedProfile && cachedProfile.id === currentSession.user.id) {
          setProfile(cachedProfile);
          permissionsSignal.value = cachedProfile.permissionsMap || {};
          uiSignal.value = cachedProfile.ui || {};
        }

        // Recuperar contexto salvo
        const savedContext = await storageService.getItem<{ companyId?: string; projectId?: string; siteId?: string }>("selected_context");
        if (savedContext) {
            selectedContextSignal.value = savedContext;
        }

        await fetchProfile(currentSession.user.id);

        // [Dev Persistence] Restaurar simulação se houver papel salvo
        if (simulationRoleSignal.value && window.location.hostname === 'localhost') {
            console.log("[AuthContext] Restaurando simulação persistente:", simulationRoleSignal.value);
            // Pequeno delay para garantir que o perfil real e backups estejam prontos
            setTimeout(() => switchRole(simulationRoleSignal.value), 100);
        }
      } else {
        console.log("[AuthContext] No active session found. Performing full cleanup.");
        await storageService.clearAll(); // Limpa cache total se não houver token
        setUser(null);
        setProfile(null);
        permissionsSignal.value = {};
        uiSignal.value = {};
        currentUserSignal.value = null;
        selectedContextSignal.value = null;
      }
      setIsLoading(false);
      isAuthLoadingSignal.value = false;
    };

    initAuth();
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = React.useCallback(
    async (
      usernameOrEmail: string,
      password: string,
    ): Promise<{
      success: boolean;
      error?: string;
      mfaRequired?: boolean;
      profile?: Profile;
    }> => {
      try {
        const { data, error } = await localApi.auth.signInWithPassword({
          email: usernameOrEmail,
          password: password,
        });

        if (error) {
          return {
            success: false,
            error: error.message || "Erro ao realizar login",
          };
        }

        if (data?.user && data?.session) {
          const fetchedProfile = await fetchProfile(data.user.id);
          setIsMfaVerified(false);
          sessionStorage.removeItem("mfa_verified");

          if (fetchedProfile?.mfaEnabled) {
            return {
              success: true,
              mfaRequired: true,
              profile: fetchedProfile,
            };
          }
          return { success: true, profile: fetchedProfile };
        }

        return { success: false, error: "Erro inesperado durante o login" };
      } catch (error) {
        logError("Login", error);
        return {
          success: false,
          error: error.message || "Erro ao realizar login",
        };
      }
    },
    [fetchProfile],
  );

  const getLastOfflineAccount =
    React.useCallback(async (): Promise<OfflineAccount | null> => {
      try {
        const lastAccount = await storageService.getItem<{
          identifier: string;
          profile: Profile;
          cachedAt: number;
        }>("last_offline_account");

        if (!lastAccount) return null;

        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastAccount.cachedAt > thirtyDays) {
          await storageService.removeItem("last_offline_account");
          return null;
        }

        return {
          identifier: lastAccount.identifier,
          fullName: lastAccount.profile.fullName,
          avatarUrl: lastAccount.profile.avatarUrl,
          role: lastAccount.profile.role,
          cachedAt: lastAccount.cachedAt,
        };
      } catch {
        return null;
      }
    }, []);

  const loginOffline = React.useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const lastAccount = await storageService.getItem<{
        identifier: string;
        profile: Profile;
        passwordHash: string;
        cachedAt: number;
      }>("last_offline_account");

      if (!lastAccount)
        return {
          success: false,
          error: "Nenhuma conta disponível para login offline",
        };

      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastAccount.cachedAt > thirtyDays) {
        await storageService.removeItem("last_offline_account");
        return {
          success: false,
          error: "Credenciais offline expiradas. Conecte-se online.",
        };
      }

      const workerProfile = lastAccount.profile;
      await storageService.setItem("manual_worker_session", {
        id: workerProfile.id,
        profile: workerProfile,
      });

      setProfile(workerProfile);
      setUser({ id: workerProfile.id } as any);
      currentUserSignal.value = { id: workerProfile.id, ...workerProfile } as any; // Sync signal
      setIsLoading(false);

      return { success: true };
    } catch (error) {
      logError("LoginOffline", error);
      return { success: false, error: "Erro ao realizar login offline" };
    }
  }, []);

  const register = React.useCallback(
    async (
      email: string,
      password: string,
      name: string,
      phone?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await localApi.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              phone,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: "Erro ao criar conta" };
      }
    },
    [],
  );

  const logout = React.useCallback(async () => {
    try {
      if (profile) {
        // Opcional: Manter rastro da última conta para conveniência offline (mantenho por compatibilidade)
        await storageService.setItem("last_offline_account", {
          identifier: profile.email || profile.registrationNumber || profile.username,
          profile: profile,
          passwordHash: "",
          cachedAt: Date.now(),
        });
      }

      await localApi.auth.signOut();
      await storageService.clearAll(); // [STRICT] Limpa Cache Total (IndexedDB)
      
      sessionStorage.clear(); // Limpa SessionStorage (MFA, etc)
      localStorage.removeItem("token");
      localStorage.removeItem("orion_token");

      setUser(null);
      setSession(null);
      setProfile(null);
      setIsMfaVerified(false);
      selectedContextSignal.value = null;
      
      console.log("[AuthContext] Logout estrito finalizado.");
      
      // [STRICT] Force hard refresh to clear all JS memory & React Query cache
      window.location.href = '/auth';
    } catch (err) {
      console.error("[AuthContext] Erro durante logout:", err);
    }
  }, [profile]);

  /**
   * [DEV ONLY] Bypass de Autenticação para testes locais
   */
  const bypassAuth = React.useCallback(async () => {
      if (window.location.hostname !== 'localhost') {
          console.warn("[AuthContext] Bypass ignorado: Não estamos em localhost");
          return;
      }
      
      try {
          setIsLoading(true);
          // O backend agora aceita ?bypass=true em desenvolvimento
          const response = await localApi.get("/auth/session?bypass=true");
          const data = response.data as any;
          
          if (data?.user) {
              const session = {
                  access_token: "dev-bypass-token",
                  token_type: "bearer",
                  expires_in: 3600,
                  user: data.user
              };
              
              localApi.setToken("dev-bypass-token", session);
              await fetchProfile(data.user.id);
              
              toast({
                  title: "🔥 MODO DESENVOLVEDOR",
                  description: "Autenticação liberada (God Mode)",
              });
              
              return { success: true };
          }
          return { success: false, error: "Falha no bypass do backend" };
      } catch (err: any) {
          return { success: false, error: err.message };
      } finally {
          setIsLoading(false);
      }
  }, [fetchProfile, toast]);
  
  /**
   * [DEV ONLY] Troca dinâmica de Papel (Simulação)
   */
  const switchRole = React.useCallback(async (role: string | null) => {
    if (window.location.hostname !== 'localhost') return;

    try {
      if (!role) {
        // Restaurar estado real
        if (realPermissionsSignal.value) {
          permissionsSignal.value = realPermissionsSignal.value;
          uiSignal.value = realUiSignal.value || {};
          realPermissionsSignal.value = null;
          realUiSignal.value = null;
        }
        simulationRoleSignal.value = null;
        toast({ title: "Modo Real Ativado", description: "Simulação encerrada." });
      } else {
        // Iniciar simulação
        if (!realPermissionsSignal.value) {
          realPermissionsSignal.value = permissionsSignal.value;
          realUiSignal.value = uiSignal.value;
        }

        simulationRoleSignal.value = role;

        // Buscar permissões do papel simulado via endpoint dedicado
        const response = await localApi.get(`/auth/permissions-map?role=${role}`);
        const data = response.data as any;

        if (data?.permissions) {
          permissionsSignal.value = data.permissions;
          uiSignal.value = data.ui || {};
          toast({ 
            title: `Simulação: ${role}`, 
            description: "Permissões atualizadas dinamicamente." 
          });
        }
      }

      // Sincronizar currentUserSignal para refletir a nova realidade (Real ou Simulação)
      if (profile) {
        currentUserSignal.value = {
          ...profile,
          role: (simulationRoleSignal.value || profile.role) as any,
          permissions: permissionsSignal.value,
          ui: uiSignal.value,
          isSystemAdmin: !simulationRoleSignal.value && !!profile.isSystemAdmin
        };
      }
    } catch (err: any) {
      toast({ 
        title: "Erro na Simulação", 
        description: "Não foi possível carregar as permissões do papel.",
        variant: "destructive"
      });
    }
  }, [profile, toast]);

  const resetPassword = React.useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await localApi.auth.resetPasswordForEmail(email);

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: "Erro ao recuperar senha" };
      }
    },
    [],
  );

  const changePassword = React.useCallback(
    async (
      newPassword: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const { error } = await localApi.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error("Change Password Error:", error);
        return {
          success: false,
          error: error.message || "Erro ao alterar senha",
        };
      }
    },
    [],
  );

  const disableMfa = React.useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await localApi
        .from("users")
        .update({ mfaEnabled: false, mfaSecret: null })
        .eq("id", user.id);
      if (error) throw error;

      setMfaVerified(false);
      await fetchProfile(user.id);
      return { success: true };
    } catch (error) {
      console.error("Disable MFA Error:", error);
      return {
        success: false,
        error: error.message || "Erro ao desativar MFA",
      };
    }
  }, [user, fetchProfile]);

  const enableMfa = React.useCallback(
    async (secret: string): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!user) throw new Error("Usuário não autenticado");
        const { error } = await localApi
          .from("users")
          .update({ mfaEnabled: true, mfaSecret: secret })
          .eq("id", user.id);
        if (error) throw error;

        setMfaVerified(true);
        await fetchProfile(user.id);
        return { success: true };
      } catch (error) {
        console.error("Enable MFA Error:", error);
        return { success: false, error: error.message || "Erro ao ativar MFA" };
      }
    },
    [user, fetchProfile],
  );

  const value = React.useMemo(
    () => ({
      user,
      session,
      profile: profile ? {
        ...profile,
        role: (simulationRoleSignal.value || profile.role) as any
      } : null,
      isLoading,
      login,
      loginOffline,
      getLastOfflineAccount,
      logout,
      register,
      resetPassword,
      changePassword,
      disableMfa,
      enableMfa,
      isMfaVerified,
      setMfaVerified,
      refreshProfile: async () => {
        if (user?.id) await fetchProfile(user.id);
      },
      selectedContext: selectedContextSignal.value,
      selectContext,
      bypassAuth,
      switchRole,
    }),
    [
      user,
      session,
      profile,
      simulationRoleSignal.value,
      isLoading,
      login,
      loginOffline,
      getLastOfflineAccount,
      logout,
      register,
      resetPassword,
      changePassword,
      disableMfa,
      enableMfa,
      isMfaVerified,
      fetchProfile,
      selectedContextSignal.value,
      selectContext,
      switchRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
