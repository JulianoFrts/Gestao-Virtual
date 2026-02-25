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
import logger from "@/lib/logger";
import { localApi } from "@/integrations/orion/client";

interface Profile {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  avatarUrl: string | null;
  image?: string | null;
  role: string;
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
  permissions: Record<string, boolean>;
  uiFlags: Record<string, boolean>;
  selectedContext: { companyId?: string; projectId?: string; siteId?: string } | null;
  isSystemAdmin: boolean;
  isProtected: boolean;
  isCorporate: boolean;
  canAccessAdmin: boolean;
  simulationRole: string | null;
  startSimulation: (role: string) => Promise<void>;
  stopSimulation: () => void;
  isMapperActive: boolean;
  
  setIsMapperActive: (active: boolean) => void;
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
  selectContext: (context: { companyId?: string; projectId?: string; siteId?: string }) => Promise<void>;
  bypassAuth: () => Promise<{ success: boolean; error?: string }>;
  switchRole: (role: string | null) => Promise<void>;
  can: (permission: string, targetLevel?: number) => boolean;
  show: (flag: string) => boolean;
  canManage: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<
    ({ id: string; email?: string } & Record<string, unknown>) | null
  >(null);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [uiFlags, setUiFlags] = useState<Record<string, boolean>>({});
  const [selectedContext, setSelectedContext] = useState<{ companyId?: string; projectId?: string; siteId?: string } | null>(null);
  const [isMfaVerified, setIsMfaVerifiedState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
        return sessionStorage.getItem("mfa_verified") === "true";
    }
    return false;
  });

  const [simulationRole, setSimulationRole] = useState<string | null>(() => {
    if (typeof window !== "undefined" && import.meta.env.DEV && window.location.hostname === 'localhost') {
        return localStorage.getItem("dev_sim_role");
    }
    return null;
  });

  const [realPermissions, setRealPermissions] = useState<Record<string, boolean> | null>(null);
  const [realUi, setRealUi] = useState<Record<string, boolean> | null>(null);
  const [isMapperActive, setIsMapperActiveState] = useState<boolean>(() => {
    if (typeof window !== "undefined" && import.meta.env.DEV && window.location.hostname === 'localhost') {
        return localStorage.getItem("dev_mapper_active") === "true";
    }
    return false;
  });

  const setIsMapperActive = (active: boolean) => {
    setIsMapperActiveState(active);
    if (import.meta.env.DEV && window.location.hostname === 'localhost') {
        localStorage.setItem("dev_mapper_active", String(active));
    }
  };

  const setMfaVerified = (verified: boolean) => {
    setIsMfaVerifiedState(verified);
    sessionStorage.setItem("mfa_verified", verified ? "true" : "false");
  };

  // 1. fetchProfile (Must be first as others depend on it)
  const fetchProfile = React.useCallback(
    async (userId: string): Promise<Profile | undefined> => {
      if (!userId || userId === "undefined") {
        logger.warn("fetchProfile called with invalid userId", "AuthContext");
        return undefined;
      }
      try {
        let userData: Record<string, any> = {};
        let permissions: Record<string, boolean> = {};
        let ui: Record<string, boolean> = {};

        try {
          const response = await localApi.get("/users/profile");
          if (response.data) {
            userData = response.data;
          } else {
            logger.warn("/users/me returned empty. Trying fallback DB fetch.", "AuthContext");
            const { data: localProfile } = await localApi
              .from("users")
              .eq("id", userId)
              .single();
            if (localProfile) userData = localProfile;
          }
        } catch (err) {
          logger.error("Failed to fetch profile from API", "AuthContext", err);
          const { data: localProfile } = await localApi
            .from("users")
            .eq("id", userId)
            .single();
          userData = localProfile;
        }

        if (!userData) {
          logger.warn(`No profile data found for userId: ${userId}`, "AuthContext");
          return undefined;
        }

        if (userData.permissions) permissions = userData.permissions;
        if (userData.ui) ui = userData.ui;

        const newProfile: Profile = {
          id: userData.id || userId,
          username: userData.username || userData.email?.split("@")[0],
          fullName: userData.name || userData.fullName || "Usuário",
          email: userData.email,
          avatarUrl: userData.image || userData.avatarUrl || userData.avatar_url,
          image: userData.image || userData.avatarUrl || userData.avatar_url,
          role: (userData.role?.toUpperCase() as any) || "WORKER",
          registrationNumber: userData.registrationNumber || userData.registration_number,
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
        
        if (simulationRole) {
            setRealPermissions(permissions);
            setRealUi(ui);
            setProfile({
                ...newProfile,
                role: simulationRole as any,
                isSystemAdmin: false,
                permissionsMap: permissions,
                ui: ui,
            });
        } else {
            setPermissions(permissions);
            setUiFlags(ui);
        }

        const cacheKey = `profile_cache_${newProfile.id}`;
        await storageService.setItem(cacheKey, newProfile);

        if (!selectedContext && newProfile.companyId) {
            const initialContext = {
                companyId: newProfile.companyId,
                projectId: newProfile.projectId,
                siteId: newProfile.siteId || undefined
            };
            setSelectedContext(initialContext);
            await storageService.setItem("selected_context", initialContext);
        }

        return newProfile;
      } catch (error) {
        console.error("Error fetching profile:", error);
        return undefined;
      }
    },
    [selectedContext, simulationRole],
  );

  // 2. Auth Actions
  const login = React.useCallback(
    async (usernameOrEmail: string, password: string) => {
      try {
        const { data, error } = await localApi.auth.signInWithPassword({
          email: usernameOrEmail,
          password: password,
        });

        if (error) return { success: false, error: error.message || "Erro ao realizar login" };

        if (data?.user && data?.session) {
          const fetchedProfile = await fetchProfile(data.user.id);
          setIsMfaVerifiedState(false);
          sessionStorage.removeItem("mfa_verified");

          if (fetchedProfile?.mfaEnabled) {
            return { success: true, mfaRequired: true, profile: fetchedProfile };
          }
          return { success: true, profile: fetchedProfile };
        }
        return { success: false, error: "Erro inesperado durante o login" };
      } catch (error: any) {
        logError("Login", error);
        return { success: false, error: error.message || "Erro ao realizar login" };
      }
    },
    [fetchProfile],
  );

  const logout = React.useCallback(async () => {
    try {
      if (profile) {
        await storageService.setItem("last_offline_account", {
          identifier: profile.email || profile.registrationNumber || profile.username,
          profile: profile,
          passwordHash: "",
          cachedAt: Date.now(),
        });
      }

      await localApi.auth.signOut();
      await storageService.clearAll();
      sessionStorage.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("orion_token");

      setUser(null);
      setSession(null);
      setProfile(null);
      setIsMfaVerifiedState(false);
      setPermissions({});
      setUiFlags({});
      setSelectedContext(null);
      setSimulationRole(null);
      setRealPermissions(null);
      setRealUi(null);
      
      window.location.href = '/auth';
    } catch (err) {
      logger.error("Erro durante logout", "AuthContext", err);
    }
  }, [profile]);

  // 3. Simulation & Dev Actions
  const switchRole = React.useCallback(async (role: string | null) => {
    if (window.location.hostname !== 'localhost') return;

    try {
      if (!role) {
        if (realPermissions && profile) {
          setPermissions(realPermissions);
          setUiFlags(realUi || {});
          setProfile({
            ...profile,
            role: profile.role,
            isSystemAdmin: profile.isSystemAdmin,
            permissionsMap: realPermissions,
            ui: realUi || {}
          });
          setRealPermissions(null);
          setRealUi(null);
        }
        setSimulationRole(null);
        localStorage.removeItem("dev_sim_role");
        toast({ title: "Modo Real Ativado", description: "Simulação encerrada." });
      } else {
        if (!realPermissions && profile) {
          setRealPermissions(permissions);
          setRealUi(uiFlags);
        }

        setSimulationRole(role);
        localStorage.setItem("dev_sim_role", role);

        const response = await localApi.get(`/auth/permissions-map?role=${role}`);
        const data = response.data as any;

        if (data?.permissions && profile) {
          setPermissions(data.permissions);
          setUiFlags(data.ui || {});
          setProfile({
            ...profile,
            role: role as any,
            isSystemAdmin: false,
            permissionsMap: data.permissions,
            ui: data.ui || {}
          });
          toast({ title: `Simulação: ${role}`, description: "Permissões atualizadas dinamicamente." });
        }
      }
    } catch (err: any) {
      toast({ title: "Erro na Simulação", description: "Falha ao carregar permissões", variant: "destructive" });
    }
  }, [profile, permissions, uiFlags, realPermissions, realUi, toast]);

  const startSimulation = React.useCallback(async (role: string) => {
    await switchRole(role);
  }, [switchRole]);

  const stopSimulation = React.useCallback(() => {
    switchRole(null);
  }, [switchRole]);

  const bypassAuth = React.useCallback(async () => {
      if (window.location.hostname !== 'localhost') return { success: false, error: "Not localhost" };
      try {
          setIsLoading(true);
          const response = await localApi.get("/auth/session?bypass=true");
          const data = response.data as any;
          if (data?.user) {
              const session = { access_token: "dev-bypass-token", token_type: "bearer", expires_in: 3600, user: data.user };
              localApi.setToken("dev-bypass-token", session);
              await fetchProfile(data.user.id);
              toast({ title: "🔥 MODO DESENVOLVEDOR", description: "God Mode Ativado" });
              return { success: true };
          }
          return { success: false, error: "Falha no bypass" };
      } catch (err: any) {
          return { success: false, error: err.message };
      } finally {
          setIsLoading(false);
      }
  }, [fetchProfile, toast]);

  // 4. Other Actions
  const register = React.useCallback(async (email: string, password: string, name: string, phone?: string) => {
    try {
      const { error } = await localApi.auth.signUp({ email, password, options: { data: { name, phone } } });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erro ao criar conta" };
    }
  }, []);

  const loginOffline = React.useCallback(async () => {
    try {
      const lastAccount = await storageService.getItem<{ identifier: string; profile: Profile; cachedAt: number }>("last_offline_account");
      if (!lastAccount) return { success: false, error: "Sem conta offline" };
      
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastAccount.cachedAt > thirtyDays) return { success: false, error: "Credenciais offline expiradas" };

      const workerProfile = lastAccount.profile;
      await storageService.setItem("manual_worker_session", { id: workerProfile.id, profile: workerProfile });
      setProfile(workerProfile);
      setUser({ id: workerProfile.id, ...workerProfile } as any);
      setPermissions(workerProfile.permissionsMap || {});
      setUiFlags(workerProfile.ui || {});
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erro no login offline" };
    }
  }, []);

  const getLastOfflineAccount = React.useCallback(async () => {
    const lastAccount = await storageService.getItem<{ identifier: string; profile: Profile; cachedAt: number }>("last_offline_account");
    if (!lastAccount) return null;
    return { ...lastAccount, fullName: lastAccount.profile.fullName, avatarUrl: lastAccount.profile.avatarUrl, role: lastAccount.profile.role };
  }, []);

  const resetPassword = React.useCallback(async (email: string) => {
    try {
      const { error } = await localApi.auth.resetPasswordForEmail(email);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erro ao recuperar senha" };
    }
  }, []);

  const changePassword = React.useCallback(async (newPassword: string) => {
    try {
      const { error } = await localApi.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Erro ao alterar" };
    }
  }, []);

  const disableMfa = React.useCallback(async () => {
    try {
      if (!user) throw new Error("Não autenticado");
      const { error } = await localApi.from("users").update({ mfaEnabled: false, mfaSecret: null }).eq("id", user.id);
      if (error) throw error;
      setMfaVerified(false);
      await fetchProfile(user.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Erro ao desativar" };
    }
  }, [user, fetchProfile]);

  const enableMfa = React.useCallback(async (secret: string) => {
    try {
      if (!user) throw new Error("Não autenticado");
      const { error } = await localApi.from("users").update({ mfaEnabled: true, mfaSecret: secret }).eq("id", user.id);
      if (error) throw error;
      setMfaVerified(true);
      await fetchProfile(user.id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Erro ao ativar" };
    }
  }, [user, fetchProfile]);

  const refreshProfile = React.useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const selectContext = React.useCallback(
    async (context: {
      companyId?: string;
      projectId?: string;
      siteId?: string;
    }) => {
      try {
        const response = await localApi.post("/auth/context/validate", context);
        if (response.data) {
          // Sincroniza o contexto com o JWT no backend para garantir isolamento real
          await localApi.post("/auth/session/update", context);

          setSelectedContext(context);
          await storageService.setItem("selected_context", context);

          // Recarrega o perfil para atualizar permissões específicas do projeto
          if (user?.id) await fetchProfile(user.id);

          toast({
            title: "Canteiro Selecionado",
            description: "Contexto de segurança atualizado com sucesso.",
          });
        } else throw new Error("Contexto inválido");
      } catch (err: any) {
        toast({
          title: "Erro de Contexto",
          description: err.message || "Não foi possível trocar de canteiro.",
          variant: "destructive",
        });
        throw err;
      }
    },
    [user?.id, fetchProfile],
  );

  // 5. Derived States
  const isSystemAdmin = React.useMemo(() => !!profile?.isSystemAdmin, [profile]);
  const isProtected = React.useMemo(() => !!(permissions['*'] || permissions['system.full_access'] || permissions['system.is_protected']), [permissions]);
  const isCorporate = React.useMemo(() => !!(uiFlags['showAdminMenu'] || permissions['system.is_corporate']), [uiFlags, permissions]);
  const canAccessAdmin = React.useMemo(() => !!(uiFlags['showAdminMenu'] || permissions['ui.admin_access']), [uiFlags, permissions]);

  const can = React.useCallback((permission: string, targetLevel?: number) => {
    if (permissions['*'] || permissions['system.full_access']) return true;
    if (!permissions[permission]) return false;
    if (targetLevel !== undefined && profile) return (profile.hierarchyLevel || 0) > targetLevel;
    return true;
  }, [permissions, profile]);

  const show = React.useCallback((flag: string) => !!uiFlags[flag], [uiFlags]);
  const canManage = React.useCallback((module: string) => !!(permissions[`${module}.manage`] || permissions[`${module}.create`] || permissions[`${module}.update`] || permissions[`${module}.delete`] || permissions[module]), [permissions]);


  const initialized = React.useRef(false);

  // 6. Initialization Effect
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const {
      data: { subscription },
    } = localApi.auth.onAuthStateChange(async (event, session) => {
      logger.info(`Auth State Change: ${event}`, "AuthContext");

      setSession(session);
      setUser((prev) => {
        const next = (session?.user as any) ?? null;
        if (prev?.id === next?.id && prev !== null) return prev;
        return next;
      });

      if (!session?.user) {
        setProfile(null);
        setPermissions({});
        setUiFlags({});
      }
    });

    const initAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session: currentSession } } = await localApi.auth.getSession();

        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user as any);
          
          const cachedProfile = await storageService.getItem<Profile>(`profile_cache_${currentSession.user.id}`);
          if (cachedProfile && cachedProfile.id === currentSession.user.id) {
            setProfile(cachedProfile);
            setPermissions(cachedProfile.permissionsMap || {});
            setUiFlags(cachedProfile.ui || {});
          }

          const savedContext = await storageService.getItem<any>("selected_context");
          if (savedContext) setSelectedContext(savedContext);

          await fetchProfile(currentSession.user.id);
          
          if (simulationRole && window.location.hostname === 'localhost') {
              // Use switchRole from scope
              setTimeout(() => switchRole(simulationRole), 100);
          }
        } else {
          await storageService.clearAll();
          setUser(null); setProfile(null); setPermissions({}); setUiFlags({}); setSelectedContext(null);
        }
      } catch (err) {
        logger.error("Failed to initialize auth", "AuthContext", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    return () => subscription.unsubscribe();
  }, []); // Run exactly once

  const value = React.useMemo(() => ({
    user, session, profile, isLoading, permissions, uiFlags, selectedContext,
    isSystemAdmin, isProtected, isCorporate, canAccessAdmin, simulationRole,
    startSimulation, stopSimulation, isMapperActive, setIsMapperActive,
    login, loginOffline, getLastOfflineAccount, logout, register, resetPassword,
    changePassword, disableMfa, enableMfa, isMfaVerified, setMfaVerified,
    refreshProfile, selectContext, bypassAuth, switchRole, can, show, canManage,
  }), [
    user, session, profile, isLoading, permissions, uiFlags, selectedContext,
    isSystemAdmin, isProtected, isCorporate, canAccessAdmin, simulationRole,
    startSimulation, stopSimulation, isMapperActive, login, loginOffline,
    getLastOfflineAccount, logout, register, resetPassword, changePassword,
    disableMfa, enableMfa, isMfaVerified, refreshProfile, selectContext,
    bypassAuth, switchRole, can, show, canManage,
  ]);


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
