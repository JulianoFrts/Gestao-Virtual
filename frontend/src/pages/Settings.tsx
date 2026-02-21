import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from '@/contexts/SyncContext';
import { useQueryClient } from '@tanstack/react-query';
import { cacheService } from '@/services/cacheService';
import { useUsers } from '@/hooks/useUsers';
import { useMessages } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { localApi } from '@/integrations/orion/client';
import { Input } from '@/components/ui/input';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { Slider } from "@/components/ui/slider";
import {
  User,
  Cloud,
  Database,
  LogOut,
  Trash2,
  RefreshCw,
  Smartphone,
  Pencil,
  Loader2,
  Key,
  Lock,
  CheckCircle2,
  ShieldCheck,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  Move,
  UploadCloud,
  Palette,
  LayoutTemplate,
  Settings2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    isProtectedSignal, 
    simulationRoleSignal,
    permissionsSignal, 
    uiSignal,
    realPermissionsSignal,
    realUiSignal,
} from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";

import { 
    logoUrlSignal, 
    logoWidthSignal, 
    initSettings, 
    saveSettings, 
    isLoadingSettingsSignal,
    appNameSignal,
    appIconUrlSignal
} from "@/signals/settingsSignals";
import { loaderConcurrencySignal } from "@/signals/loaderSignals";
import { getRoleStyle, getRoleLabel, STANDARD_ROLES } from "@/utils/roleUtils";
import { cn } from "@/lib/utils";
import { Users, Eye, LogOut as LogOutIcon } from 'lucide-react';
import { MfaSetup } from "@/components/auth/MfaSetup";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";
import { AlertTriangle } from "lucide-react";
import { verify } from "otplib";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function Settings() {
  useSignals();
  const { user, profile, logout, disableMfa, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const { isOnline, pendingChanges, syncNow } = useSync();
  const { updateUser } = useUsers();
  const { toast } = useToast();
  const [localConcurrency, setLocalConcurrency] = React.useState(loaderConcurrencySignal.value);
  const [localLogoWidth, setLocalLogoWidth] = React.useState(logoWidthSignal.value);
  const { sendMessage, checkPasswordPermission, consumePasswordPermission } =
    useMessages();

  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    fullName: "",
    email: "",
    image: "",
  });
  const [newPassword, setNewPassword] = React.useState("");
  const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);
  const [hasPasswordPermission, setHasPasswordPermission] =
    React.useState(false);
  const [isRequestingReset, setIsRequestingReset] = React.useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = React.useState(false);
  const [isDisableMfaDialogOpen, setIsDisableMfaDialogOpen] =
    React.useState(false);
  const [disableMfaCode, setDisableMfaCode] = React.useState("");
  const [isVerifyingDisableMfa, setIsVerifyingDisableMfa] =
    React.useState(false);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const [showCountdown, setShowCountdown] = React.useState(false);
  const [isRoleSimulationModalOpen, setIsRoleSimulationModalOpen] = React.useState(false);

  // States for Photo Crop/Adjustment
  const [imageToAdjust, setImageToAdjust] = React.useState<string | null>(null);
  const [isAdjustingPhoto, setIsAdjustingPhoto] = React.useState(false);
  const [photoConfig, setPhotoConfig] = React.useState({
    zoom: 1,
    x: 0,
    y: 0,
  });

  const [confirmModal, setConfirmModal] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void | Promise<void>;
    variant: "default" | "destructive";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
    variant: "default",
  });

  const { changePassword } = useAuth();

  const displayName =
    profile?.fullName || user?.email?.split("@")[0] || "Usuário";
  const isSuper = isProtectedSignal.value;
  console.log(isSuper);

  // Verificar permissão de alteração de senha ao abrir o dialog
  React.useEffect(() => {
    const checkPerm = async () => {
      if (isEditingProfile && !isSuper) {
        const hasPerm = await checkPasswordPermission();
        setHasPasswordPermission(!hasPerm);
      }
    };
    checkPerm();
  }, [isEditingProfile, isSuper, checkPasswordPermission]);

  // Efeito para o countdown de logout após desativar MFA
  React.useEffect(() => {
    let timer: any;
    if (showCountdown && countdown === null) {
      setCountdown(5);
    } else if (showCountdown && countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (showCountdown && countdown === 0) {
      logout();
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showCountdown, countdown, logout]);
  
  const handleStartSimulation = async (role: string) => {
      try {
          // Backup permissões reais se ainda não houver backup
          if (!realPermissionsSignal.value) {
              realPermissionsSignal.value = { ...permissionsSignal.value };
              realUiSignal.value = { ...uiSignal.value };
          }

          // Se for um God Role simulado, damos wildcard total
          const GodRoles = ['SUPER_ADMIN_GOD', 'HELPER_SYSTEM'];
          if (GodRoles.includes(role.toUpperCase())) {
              permissionsSignal.value = { '*': true, 'system.full_access': true, 'system.is_protected': true };
              uiSignal.value = { showAdminMenu: true, showSettings: true };
          } else {
              // Caso contrário, BUSCAMOS NO BACKEND (No Bypass!)
              toast({ title: 'Simulando...', description: `Carregando permissões do papel ${getRoleLabel(role)}...` });
              
              const [levelsRes, modulesRes, matrixRes] = await Promise.all([
                  localApi.from('permission_levels').select('*'),
                  localApi.from('permission_modules').select('*'),
                  localApi.from('permission_matrix').select('*').eq('is_granted', true)
              ]);

              if (levelsRes.data && modulesRes.data && matrixRes.data) {
                  const targetLevel = levelsRes.data.find((l: any) => l.name.toUpperCase() === role.toUpperCase());
                  
                  if (targetLevel) {
                      const simulatedPerms: Record<string, boolean> = {};
                      const simulatedUi: Record<string, boolean> = {};

                      const relevantMatrix = (matrixRes.data as any[]).filter(m => m.level_id === targetLevel.id && m.is_granted === true);
                      
                      relevantMatrix.forEach(item => {
                          const mod = (modulesRes.data as any[]).find(m => m.id === item.module_id);
                          if (mod) {
                              simulatedPerms[mod.code] = true;
                              // Se for permissão de UI, jogamos no UI signal também
                              if (mod.code.startsWith('ui.') || mod.code.endsWith('.view') || mod.code.includes('access')) {
                                  simulatedUi[mod.code] = true;
                                  if (mod.code === 'ui.admin_access') simulatedUi['showAdminMenu'] = true;
                              }
                          }
                      });


                      permissionsSignal.value = simulatedPerms;
                      uiSignal.value = simulatedUi;
                  } else {
                      // Se não achar o nível no banco, deixa sem permissão nenhuma (Backend decide!)
                      permissionsSignal.value = {};
                      uiSignal.value = {};
                  }
              }
          }

          simulationRoleSignal.value = role;
          setIsRoleSimulationModalOpen(false);
          
          toast({
              title: "Modo Simulação Ativo",
              description: `Você agora está visualizando o sistema como ${getRoleLabel(role)}.`,
          });
      } catch (error) {
          console.error('[Settings] Falha ao iniciar simulação:', error);
          toast({
              title: "Erro na Simulação",
              description: "Não foi possível carregar as permissões do papel selecionado.",
              variant: "destructive"
          });
      }
  };

  const handleStopSimulation = () => {
      // Restaurar permissões reais se houver backup
      if (realPermissionsSignal.value) {
          permissionsSignal.value = { ...realPermissionsSignal.value };
          uiSignal.value = { ...realUiSignal.value || {} };
          realPermissionsSignal.value = null;
          realUiSignal.value = null;
      }

      simulationRoleSignal.value = null;
      toast({
          title: "Simulação Encerrada",
          description: "Seu nível de acesso real foi restaurado.",
      });
  };


  const handleEditProfile = () => {
    setEditForm({
      fullName: profile?.fullName || "",
      email: user?.email || "",
      image: profile?.image || "",
    });
    setIsEditingProfile(true);
  };

  const handleRemovePhoto = () => {
    setEditForm((prev) => ({ ...prev, image: "" }));
    toast({
      title: "Foto removida",
      description:
        "A foto foi removida da sua prévia. Lembre-se de salvar as alterações.",
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    processImage(file);
  };

  const processImage = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setImageToAdjust(dataUrl);
      setPhotoConfig({ zoom: 1, x: 0, y: 0 });
      setIsAdjustingPhoto(true);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyAdjustment = async () => {
    if (!imageToAdjust) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const SIZE = 400;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Arredondar para círculo no canvas final
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.clip();

      // Calcular dimensões baseadas no Zoom e Offset
      const baseSize = Math.min(img.width, img.height);
      const drawWidth = (img.width / baseSize) * SIZE * photoConfig.zoom;
      const drawHeight = (img.height / baseSize) * SIZE * photoConfig.zoom;

      // Centralizar e aplicar offsets
      const centerX = (SIZE - drawWidth) / 2 + (photoConfig.x * SIZE) / 100;
      const centerY = (SIZE - drawHeight) / 2 + (photoConfig.y * SIZE) / 100;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(img, centerX, centerY, drawWidth, drawHeight);

      const base64 = canvas.toDataURL("image/jpeg", 0.9);
      setEditForm((prev) => ({ ...prev, image: base64 }));
      setIsAdjustingPhoto(false);
      setImageToAdjust(null);

      toast({
        title: "Foto aplicada",
        description: "Seu novo avatar foi configurado.",
      });
    };
    img.src = imageToAdjust;
  };

  React.useEffect(() => {
    const handleClipboardPaste = (e: ClipboardEvent) => {
      if (!isEditingProfile) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handleClipboardPaste);
    return () => window.removeEventListener("paste", handleClipboardPaste);
  }, [isEditingProfile]);

  const handleUpdateProfile = async () => {
    if (!profile?.id || !editForm.fullName || !editForm.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e email",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    // 1. Atualizar informações básicas
    const result = await updateUser(profile.id, {
      fullName: editForm.fullName,
      email: editForm.email !== user?.email ? editForm.email : undefined,
      image: editForm.image,
    });

    if (result.success) {
      await refreshProfile();
    }

    // 2. Se houver nova senha, atualizar também
    if (result.success && newPassword.length >= 6) {
      const pwdResult = await changePassword(newPassword);
      if (pwdResult.success && !isSuper) {
        await consumePasswordPermission();
      } else if (!pwdResult.success) {
        toast({
          title: "Senha não atualizada",
          description: pwdResult.error,
          variant: "destructive",
        });
      }
    }

    setIsUpdating(false);

    if (result.success) {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      setIsEditingProfile(false);
      setNewPassword(""); // Limpar campo de senha
      // Reload page to update auth context
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast({
        title: "Erro ao atualizar",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsPasswordLoading(true);
    const result = await changePassword(newPassword);
    setIsPasswordLoading(false);

    if (result.success) {
      if (!isSuper) await consumePasswordPermission();
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      });
      setNewPassword("");
    } else {
      toast({
        title: "Erro ao alterar senha",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleRequestPasswordReset = async () => {
    setIsRequestingReset(true);
    try {
      await sendMessage({
        type: "PASSWORD_RESET",
        subject: "Solicitação de Redefinição de Senha",
        content: `O usuário ${profile?.fullName} (${user?.email}) solicitou a redefinição de senha através do painel de configurações.`,
        recipientRole: "admin",
        companyId: profile?.companyId,
        projectId: profile?.projectId,
        siteId: profile?.siteId,
        metadata: {
          source: "settings_panel",
          userId: user?.id,
          userName: profile?.fullName,
        },
      });
      toast({
        title: "Solicitação enviada",
        description: "Os administradores foram notificados.",
      });
    } catch {
      toast({
        title: "Erro ao solicitar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingReset(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await cacheService.clearAll();
      queryClient.clear();
      toast({
        title: "Cache limpo",
        description: "Os dados temporários foram removidos com sucesso.",
      });
      // Opcional: recarregar após um pequeno delay para garantir novo fetch
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast({
        title: "Erro ao limpar cache",
        description: "Ocorreu um erro ao tentar limpar os dados.",
        variant: "destructive"
      });
    }
  };

  const clearAllData = () => {
    setConfirmModal({
      open: true,
      title: "Limpar Todos os Dados",
      description:
        "Tem certeza? Esta ação removerá todos os caches locais e desconectará sua conta. Todos os dados não sincronizados serão perdidos permanentemente!",
      variant: "destructive",
      onConfirm: () => {
        localStorage.clear();
        toast({
          title: "Dados limpos",
          description: "Todos os dados foram removidos",
        });
        logout();
      },
    });
  };

  const GeneralSettingsContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditProfile}
              className="h-8"
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="relative group cursor-pointer"
              onClick={handleEditProfile}
              title="Clique para alterar foto"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden border border-primary/20 transition-all group-hover:border-primary/50 group-hover:shadow-[0_0_15px_-3px_rgba(var(--primary),0.3)]">
                {profile?.image ? (
                  <img
                    src={profile.image}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-lg">{displayName}</p>
              <p className="text-muted-foreground">{user?.email}</p>
              <p
                className={cn(
                  "inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight transition-all",
                  getRoleStyle(profile?.role || "worker"),
                )}
              >
                {getRoleLabel(profile?.role || "worker")}
              </p>

              {/* Role Simulation Switcher (Visible only for God Roles) */}
              {(profile?.role === 'HELPER_SYSTEM' || profile?.role === 'SUPER_ADMIN_GOD') && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-indigo-400" />
                        Modo Simulação
                    </Label>
                    {!simulationRoleSignal.value ? (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-indigo-500/5 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 h-8 text-[11px] w-full justify-start px-3"
                            onClick={() => setIsRoleSimulationModalOpen(true)}
                        >
                            <Users className="w-3.5 h-3.5 mr-2" />
                            Alternar Nível de Acesso (Teste)
                        </Button>
                    ) : (
                        <div className="flex items-center justify-between gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-md p-2">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-tighter">Simulando como:</span>
                                <span className="text-[11px] text-indigo-200 font-mono font-bold leading-none">{getRoleLabel(simulationRoleSignal.value)}</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-2 text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 bg-rose-500/5 border border-rose-500/10"
                                onClick={handleStopSimulation}
                            >
                                <LogOutIcon className="w-3 h-3 mr-1" />
                                Parar
                            </Button>
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Aplicativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground mb-2">
              Instale o aplicativo no seu dispositivo para acesso rápido e
              offline.
            </p>
            <InstallPrompt />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Sincronização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Status</Label>
              <p
                className={`text-sm ${isOnline ? "text-green-500" : "text-red-500"}`}
              >
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"} animate-pulse`}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Pendentes</Label>
              <p className="text-sm text-muted-foreground">
                {pendingChanges} item(s)
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={syncNow}
              disabled={pendingChanges === 0}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleClearCache}
            className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Limpar Cache de Dados
          </Button>

          <Button
            variant="destructive"
            onClick={clearAllData}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo e Sair
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Segurança (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {profile?.mfaEnabled
              ? "A autenticação de dois fatores está ATIVADA na sua conta."
              : "Adicione uma camada extra de segurança usando o Microsoft Authenticator."}
          </p>
          <div className="space-y-2">
            <Button
              variant={profile?.mfaEnabled ? "outline" : "default"}
              className={`w-full ${!profile?.mfaEnabled && "gradient-primary"}`}
              onClick={() => setIsMfaModalOpen(true)}
            >
              {profile?.mfaEnabled ? "Ver QR Code" : "Ativar 2FA"}
            </Button>

            {profile?.mfaEnabled && (
              <Button
                variant="destructive"
                variant-ghost="true"
                className="w-full text-xs h-8 border border-destructive/20"
                onClick={() => {
                  setDisableMfaCode("");
                  setIsDisableMfaDialogOpen(true);
                }}
              >
                <Lock className="w-3 h-3 mr-2" /> Desativar 2FA
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={logout}
            className="w-full"
            disabled={!isOnline}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta {!isOnline && "(Offline)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-black/20 border border-white/10">
          <TabsTrigger value="general" className="gap-2">
            <User className="w-4 h-4" />
            Geral
          </TabsTrigger>
          {(profile?.role === 'HELPER_SYSTEM' || profile?.role === 'SUPER_ADMIN_GOD') && (
            <TabsTrigger value="system" className="gap-2 text-purple-400 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-300">
                <Settings2 className="w-4 h-4" />
                Sistema
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="space-y-4 focus-visible:outline-none">
             {GeneralSettingsContent}
        </TabsContent>

        <TabsContent value="system" className="space-y-4 focus-visible:outline-none">
            {/* ORGANIZATION SETTINGS */}
            <Card className="glass-card border-purple-500/20 bg-purple-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-400">
                        <Palette className="w-5 h-5" />
                        Personalização da Organização
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Nome do Sistema</Label>
                                <Input 
                                    value={appNameSignal.value}
                                    onChange={(e) => {
                                        appNameSignal.value = e.target.value;
                                    }}
                                    onBlur={async (e) => {
                                        if (profile?.companyId) {
                                            await saveSettings(profile.companyId, null, undefined, e.target.value);
                                            toast({ title: "Nome do sistema atualizado!" });
                                        }
                                    }}
                                    className="industrial-input"
                                    placeholder="Ex: Gestão Virtual"
                                />
                                <p className="text-[10px] text-muted-foreground">Este nome aparecerá na aba do navegador e no título do sistema.</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden relative group">
                                    {appIconUrlSignal.value ? (
                                        <img 
                                            src={appIconUrlSignal.value} 
                                            className="object-contain w-full h-full p-2" 
                                            alt="Favicon Atual"
                                        />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label>Ícone do App (Favicon)</Label>
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            className="h-9 text-xs"
                                            onClick={() => document.getElementById('app-icon-upload')?.click()}
                                            disabled={isLoadingSettingsSignal.value}
                                        >
                                            <UploadCloud className="w-3.5 h-3.5 mr-2" />
                                            {isLoadingSettingsSignal.value ? "Enviando..." : "Subir Ícone"}
                                        </Button>
                                        <input 
                                            type="file" 
                                            id="app-icon-upload" 
                                            className="hidden" 
                                            accept="image/x-icon,image/png,image/svg+xml"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file && profile?.companyId) {
                                                    const res = await saveSettings(profile.companyId, null, undefined, undefined, file);
                                                    if (res.success) {
                                                        toast({ title: "Ícone atualizado com sucesso!" });
                                                    } else {
                                                        toast({ title: "Erro ao atualizar ícone", description: res.error, variant: "destructive" });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">ICO, PNG ou SVG (quadrado).</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-white/5">
                            <Label>Logo do Sistema (NavBar)</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 bg-black/40 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden relative group">
                                    {logoUrlSignal.value ? (
                                        <img 
                                            src={logoUrlSignal.value} 
                                            className="object-contain w-full h-full p-2" 
                                            alt="Logo Atual"
                                        />
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold text-center p-2">Sem Logo</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            className="h-9 text-xs"
                                            onClick={() => document.getElementById('org-logo-upload')?.click()}
                                            disabled={isLoadingSettingsSignal.value}
                                        >
                                            <UploadCloud className="w-3.5 h-3.5 mr-2" />
                                            {isLoadingSettingsSignal.value ? "Enviando..." : "Subir Nova Logo"}
                                        </Button>
                                        <input 
                                            type="file" 
                                            id="org-logo-upload" 
                                            className="hidden" 
                                            accept="image/png,image/jpeg,image/svg+xml"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file && profile?.companyId) {
                                                    const res = await saveSettings(profile.companyId, file);
                                                    if (res.success) {
                                                        toast({ title: "Logo atualizada com sucesso!" });
                                                    } else {
                                                        toast({ title: "Erro ao atualizar logo", description: res.error, variant: "destructive" });
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Recomendado: PNG ou SVG com fundo transparente.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <LayoutTemplate className="w-4 h-4" />
                                    Tamanho da Logo ({localLogoWidth}px)
                                </Label>
                            </div>
                            <Slider 
                                value={[localLogoWidth]} 
                                min={100} 
                                max={260} 
                                step={5}
                                onValueChange={(val) => {
                                    setLocalLogoWidth(val[0]);
                                    logoWidthSignal.value = val[0]; // Realtime preview
                                }}
                                onValueCommit={async (val) => {
                                    if (profile?.companyId) {
                                        await saveSettings(profile.companyId, null, val[0]);
                                        toast({ title: "Preferência salva!" });
                                    }
                                }}
                                className="w-full"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* LOADER CONCURRENCY SETTINGS */}
            <Card className="glass-card border-purple-500/20 bg-purple-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-400">
                        <Loader2 className="w-5 h-5" />
                        Performance do Carregamento
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2">
                                <LayoutTemplate className="w-4 h-4" />
                                {localConcurrency === 0 ? "Ilimitado (Máxima Performance)" : `Workers Simultâneos (${localConcurrency})`}
                            </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            <strong>0 = Ilimitado:</strong> Inicia todos os módulos possíveis simultaneamente.
                            <br/>
                            <strong>1-16:</strong> Limita o número de downloads paralelos (bom para internet lenta).
                        </p>
                        <Slider 
                            value={[localConcurrency]} 
                            min={0} 
                            max={16} 
                            step={1}
                            onValueChange={(val) => {
                                setLocalConcurrency(val[0]);
                                loaderConcurrencySignal.value = val[0];
                            }}
                            className="w-full"
                        />
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>




      {/* Edit Profile Dialog */}

      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Editar Meu Perfil
            </DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais e foto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-4 py-2">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center transition-all group-hover:border-primary/50 shadow-lg">
                          {editForm.image ? (
                            <img
                              src={editForm.image}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                          <Camera className="w-6 h-6 text-white" />
                        </div>

                        {/* Mobile menu indicator badge */}
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-md md:hidden">
                          <MoreVertical className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      className="w-48 bg-black/90 backdrop-blur-xl border-primary/20"
                    >
                      <DropdownMenuItem
                        onClick={() =>
                          document
                            .getElementById("profile-image-upload")
                            ?.click()
                        }
                        className="cursor-pointer gap-2"
                      >
                        <ImageIcon className="w-4 h-4" /> Alterar Foto
                      </DropdownMenuItem>
                      {editForm.image && (
                        <DropdownMenuItem
                          onClick={handleRemovePhoto}
                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" /> Remover Foto
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48 bg-black/90 backdrop-blur-xl border-primary/20">
                  <ContextMenuItem
                    onClick={() =>
                      document.getElementById("profile-image-upload")?.click()
                    }
                    className="cursor-pointer gap-2"
                  >
                    <ImageIcon className="w-4 h-4" /> Alterar Foto
                  </ContextMenuItem>
                  {editForm.image && (
                    <ContextMenuItem
                      onClick={handleRemovePhoto}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" /> Remover Foto
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>

              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Clique ou botão direito para opções
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="profile-name">Nome Completo *</Label>
                {isSuper && (
                  <span className="text-[10px] font-bold text-red-500 animate-pulse border border-red-500 rounded px-1 cursor-help" title="Campo restrito: Apenas Super Admin pode editar">
                    CLICK ME (ADMIN)
                  </span>
                )}
              </div>
              <Input
                id="profile-name"
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm({ ...editForm, fullName: e.target.value })
                }
                className={cn(
                  "industrial-input",
                  !isSuper && "opacity-70 cursor-not-allowed bg-muted"
                )}
                placeholder="Seu nome completo"
                readOnly={!isSuper}
                disabled={!isSuper}
              />
               {!isSuper && (
                <p className="text-[10px] text-muted-foreground">
                  Para alterar seu nome, entre em contato com o suporte ou administrador.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="profile-email">Email</Label>
                 {isSuper && (
                  <span className="text-[10px] font-bold text-red-500 animate-pulse border border-red-500 rounded px-1 cursor-help" title="Campo restrito: Apenas Super Admin pode editar">
                    CLICK ME (ADMIN)
                  </span>
                )}
              </div>
              <Input
                id="profile-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className={cn(
                  "industrial-input",
                  !isSuper && "opacity-70 cursor-not-allowed bg-muted"
                )}
                placeholder="seu@email.com"
                readOnly={!isSuper}
                disabled={!isSuper}
              />
              {isSuper ? (
                <p className="text-xs text-muted-foreground">
                  ⚠️ Alterar o email pode exigir nova autenticação
                </p>
              ) : (
                 <p className="text-[10px] text-muted-foreground">
                  Email gerenciado pela organização. Entre em contato para alterações.
                </p>
              )}
            </div>

            {/* Password Section: Only for SuperAdmin OR Request Button for others */}
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Lock className="w-4 h-4" />
                Segurança da Conta
              </div>

              {isSuper ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="dialog-new-password">
                        Nova Senha (SuperAdmin){" "}
                        <span className="text-xs text-muted-foreground font-normal">
                        (Opcional)
                        </span>
                    </Label>
                    <span className="text-[10px] font-bold text-red-500 animate-pulse border border-red-500 rounded px-1 cursor-help" title="Campo restrito: Apenas Super Admin pode editar">
                        CLICK ME (ADMIN)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="dialog-new-password"
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="industrial-input flex-1"
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 border-primary/20 hover:bg-primary/10 text-primary"
                      onClick={handlePasswordChange}
                      disabled={isPasswordLoading || newPassword.length < 6}
                    >
                      {isPasswordLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Atualizar"
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Como SuperAdmin, você pode alterar sua senha diretamente.
                  </p>
                </div>
              ) : hasPasswordPermission ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium">
                      Autorização concedida para alterar senha
                    </span>
                  </div>
                  <Label htmlFor="dialog-new-password">
                    Nova Senha{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (Opcional)
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="dialog-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="industrial-input flex-1"
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 border-green-500/50 hover:bg-green-500/10 text-green-600"
                      onClick={async () => {
                        await handlePasswordChange();
                        await consumePasswordPermission();
                        setHasPasswordPermission(false);
                      }}
                      disabled={isPasswordLoading || newPassword.length < 6}
                    >
                      {isPasswordLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Atualizar Senha"
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Esta autorização expira em 12h após a aprovação do ticket.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Para garantir a segurança, a alteração de senha deve ser
                    solicitada à administração.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full border border-primary/20"
                    onClick={handleRequestPasswordReset}
                    disabled={isRequestingReset}
                  >
                    {isRequestingReset ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Solicitar Redefinição de Senha
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Um ticket será aberto para a equipe administrativa.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="ghost" onClick={() => setIsEditingProfile(false)}>
              Cancelar
            </Button>
            <Button
              className="gradient-primary"
              onClick={handleUpdateProfile}
              disabled={isUpdating || !editForm.fullName || !editForm.email}
            >
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* MFA Setup Dialog */}
      <Dialog open={isMfaModalOpen} onOpenChange={setIsMfaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Autenticação em Duas Etapas</DialogTitle>
          </DialogHeader>
          <MfaSetup
            onComplete={() => {
              setTimeout(() => window.location.reload(), 2000);
            }}
          />
        </DialogContent>
      </Dialog>
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        onConfirm={confirmModal.onConfirm}
        variant={confirmModal.variant}
      />

      {/* Dialog para desativar MFA com verificação de código */}
      <Dialog
        open={isDisableMfaDialogOpen}
        onOpenChange={setIsDisableMfaDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Desativar Autenticação 2FA
            </DialogTitle>
            <DialogDescription>
              Para confirmar a desativação, insira o código do seu aplicativo
              autenticador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Atenção: Desativar o 2FA deixará sua conta menos protegida.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-mfa-code">
                Código do Autenticador (6 dígitos)
              </Label>
              <Input
                id="disable-mfa-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableMfaCode}
                onChange={(e) =>
                  setDisableMfaCode(e.target.value.replace(/\D/g, ""))
                }
                className="industrial-input text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDisableMfaDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={disableMfaCode.length !== 6 || isVerifyingDisableMfa}
              onClick={async () => {
                if (disableMfaCode.length !== 6 || !profile?.mfaSecret) return;

                setIsVerifyingDisableMfa(true);
                try {
                  const isValid = await verify({
                    token: disableMfaCode,
                    secret: profile.mfaSecret,
                  });

                  if (isValid.valid) {
                    const res = await disableMfa();
                    if (res.success) {
                      console.log(
                        "MFA Disabled successfully, starting cooldown...",
                      );
                      setIsDisableMfaDialogOpen(false);
                      setShowCountdown(true);
                      setCountdown(5);
                    } else {
                      toast({
                        title: "Erro ao desativar",
                        description: res.error,
                        variant: "destructive",
                      });
                    }
                  } else {
                    toast({
                      title: "Código inválido",
                      description:
                        "O código inserido está incorreto ou expirou.",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro de verificação",
                    description: "Não foi possível verificar o código.",
                    variant: "destructive",
                  });
                } finally {
                  setIsVerifyingDisableMfa(false);
                  setDisableMfaCode("");
                }
              }}
            >
              {isVerifyingDisableMfa ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Confirmar Desativação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Logout Compulsório pós-MFA Disable */}
      <Dialog open={showCountdown} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md border-primary/50 shadow-glow bg-black/90 backdrop-blur-xl z-9999"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 animate-pulse">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">
              Segurança Atualizada
            </DialogTitle>
            <DialogDescription className="text-center text-white/70">
              A segurança de dois fatores foi removida com sucesso. Por motivos
              de segurança, sua sessão será encerrada em:
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6">
            <div className="text-6xl font-black text-primary tabular-nums drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
              {countdown !== null ? countdown : 5}
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">
              segundos
            </p>
          </div>

          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs text-center text-orange-400 font-medium">
              Aguarde o redirecionamento automático para a tela de login.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Adjustment Dialog */}
      <Dialog open={isAdjustingPhoto} onOpenChange={setIsAdjustingPhoto}>
        <DialogContent className="sm:max-w-md border-primary/20 bg-black/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ZoomIn className="w-5 h-5 text-primary" />
              Ajustar Enquadramento
            </DialogTitle>
            <DialogDescription>
              Regule o zoom e a posição da sua foto de perfil
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* Viewport de Crop */}
            <div
              className="photo-adjust-viewport checkerboard-bg"
              style={{ borderColor: "#fbbf24" }}
            >
              <div className="image-stage">
                {imageToAdjust && (
                  <img
                    src={imageToAdjust}
                    alt="Ajuste"
                    className="max-w-none pointer-events-none select-none transition-transform duration-75"
                    style={{
                      width: "100%",
                      height: "auto",
                      transform: `scale(${photoConfig.zoom}) translate(${photoConfig.x}%, ${photoConfig.y}%)`,
                    }}
                  />
                )}
              </div>
              <div className="photo-adjust-mask" />
            </div>

            {/* Controles de Ajuste */}
            <div className="space-y-6 px-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3 h-3" /> Zoom
                  </span>
                  <span>{Math.round(photoConfig.zoom * 100)}%</span>
                </div>
                <Slider
                  value={[photoConfig.zoom]}
                  min={1}
                  max={4}
                  step={0.01}
                  onValueChange={([val]) =>
                    setPhotoConfig((prev) => ({ ...prev, zoom: val }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Move className="w-3 h-3" /> Horiz.
                    </span>
                  </div>
                  <Slider
                    value={[photoConfig.x]}
                    min={-50}
                    max={50}
                    step={1}
                    onValueChange={([val]) =>
                      setPhotoConfig((prev) => ({ ...prev, x: val }))
                    }
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Move className="w-3 h-3 rotate-90" /> Vert.
                    </span>
                  </div>
                  <Slider
                    value={[photoConfig.y]}
                    min={-50}
                    max={50}
                    step={1}
                    onValueChange={([val]) =>
                      setPhotoConfig((prev) => ({ ...prev, y: val }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-primary/10">
            <Button variant="ghost" onClick={() => setIsAdjustingPhoto(false)}>
              Cancelar
            </Button>
            <Button
              className="gradient-primary"
              onClick={handleApplyAdjustment}
            >
              Aplicar Foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Selection Dialog for Simulation */}
      <Dialog open={isRoleSimulationModalOpen} onOpenChange={setIsRoleSimulationModalOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-400">
              <Users className="w-5 h-5" />
              Simular Nível de Acesso
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Selecione um papel para visualizar o sistema como se tivesse esse nível de privilégio. 
              Esta mudança é temporária e afetará apenas as permissões de UI e navegação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {STANDARD_ROLES.map((role) => (
              <button
                key={role.name}
                onClick={() => handleStartSimulation(role.name)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all text-left group",
                  simulationRoleSignal.value === role.name 
                    ? "bg-indigo-500/10 border-indigo-500/40" 
                    : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10"
                )}
              >
                 <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold group-hover:text-indigo-300 transition-colors">
                        {getRoleLabel(role.name)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono opacity-60">
                        {role.name}
                    </span>
                 </div>
                 <div className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    getRoleStyle(role.name)
                 )}>
                    {role.rank} pts
                 </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="ghost" onClick={() => setIsRoleSimulationModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}


