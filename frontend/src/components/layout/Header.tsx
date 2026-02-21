import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { useMessages } from "@/hooks/useMessages";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/ModeToggle";
import { isProtectedUser } from "@/utils/permissionHelpers";
import { getRoleStyle, getRoleLabel } from "@/utils/roleUtils";
import { cn } from "@/lib/utils";
import { isProtectedSignal, can } from "@/signals/authSignals";
import { appNameSignal } from "@/signals/settingsSignals";
import { useSignals } from "@preact/signals-react/runtime";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LogOut,
  Menu,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  User,
  Mail,
  Ticket,
  Key,
  FileText,
  CheckCircle,
  ArrowRight,
  Laptop,
  Shield,
  ShieldCheck,
  QrCode,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Logo } from "@/components/common/Logo";

// Lazy load QRScanner to optimize initial bundle (html5-qrcode is ~1MB)
const QRScanner = React.lazy(() => import("@/components/auth/QRScanner").then(module => ({ default: module.QRScanner })));

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

export function Header({ onMenuClick, title: propTitle }: HeaderProps) {
  const { user, profile, logout } = useAuth();
  const { isOnline, isSyncing, pendingChanges, syncNow } = useSync();
  const { messages } = useMessages();
  const location = useLocation();
  const navigate = useNavigate();

  // Normalize role for visual checks
  const roleUpper = (profile?.role || "").toUpperCase();

  const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Início",
    "/time-clock": "Registro de Ponto",
    "/daily-report": "Novo Relatório",
    "/reports": "Relatórios Diários",
    "/time-records": "Espelho de Ponto",
    "/teams": "Equipes",
    "/employees": "Funcionários",
    "/functions": "Funções",
    "/users": "Usuários",
    "/settings": "Configurações",
    "/messages": "Mensagens",
  };

  const title = useMemo(() => {
    if (propTitle) return propTitle;
    return PAGE_TITLES[location.pathname] || appNameSignal.value;
  }, [location.pathname, propTitle, PAGE_TITLES, appNameSignal.value]);

  useSignals();

  const displayName =
    profile?.fullName || user?.email?.split("@")[0] || "Usuário";
  const [isQRModalOpen, setIsQRModalOpen] = React.useState(false);

  const unreadCount = useMemo(() => {
    return messages.filter((msg) => {
      const isRecipient = msg.recipientId === profile?.id;
      const canManageTickets =
        can("system_messages.manage") || isProtectedSignal.value;
      const isAdminType =
        msg.recipientRole === "ADMIN" || msg.type === "PASSWORD_RESET";

      return (
        msg.status === "PENDING" &&
        msg.senderId !== profile?.id &&
        msg.senderEmail !== user?.email &&
        (isRecipient || (canManageTickets && isAdminType))
      );
    }).length;
  }, [messages, profile, user]);

  // Lista de mensagens pendentes para exibir no popover
  const pendingMessages = useMemo(() => {
    return messages.filter((msg) => {
      const isRecipient = msg.recipientId === profile?.id;
      const canManageTickets =
        can("system_messages.manage") || isProtectedSignal.value;
      const isAdminType =
        msg.recipientRole === "ADMIN" || msg.type === "PASSWORD_RESET";

      return (
        msg.status === "PENDING" &&
        msg.senderId !== profile?.id &&
        msg.senderEmail !== user?.email &&
        (isRecipient || (canManageTickets && isAdminType))
      );
    });
  }, [messages, profile, user]);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/40 backdrop-blur-2xl shadow-premium border-b border-white/5 overflow-hidden">
      {/* Gloss effect overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-foreground hover:text-primary hover:bg-muted/20 lg:hidden transition-all"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Logo variant="icon" size="sm" />
            <h1 className="font-display text-lg font-bold text-secondary-foreground">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />

          {/* QR Scanner */}
          <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:text-primary hover:bg-muted/20 transition-all"
                title="Escanear QR para Login"
              >
                <QrCode className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border/50 glass-card">
              <DialogHeader>
                <DialogTitle>Aprovar Acesso</DialogTitle>
              </DialogHeader>
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-primary animate-pulse w-full">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-black uppercase tracking-widest opacity-50">Carregando Scanner...</span>
                </div>
              }>
                <QRScanner
                  onClose={() => setIsQRModalOpen(false)}
                  onSuccess={() => setIsQRModalOpen(false)}
                />
              </React.Suspense>
            </DialogContent>
          </Dialog>

          {/* Sync Status - Tooltip added for clarity */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 cursor-help transition-colors hover:bg-secondary/70"
            title={isSyncing ? "Sincronizando dados com o servidor..." : isOnline ? "Sistema Online e Sincronizado" : "Sistema Offline"}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="relative flex items-center justify-center">
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 text-primary animate-spin" />
              ) : pendingChanges > 0 ? (
                <>
                  <CloudOff className="h-4 w-4 text-accent" />
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-300">
                    +{pendingChanges}
                  </span>
                </>
              ) : (
                <Cloud className="h-4 w-4 text-success" />
              )}
            </div>
          </div>

          {/* Messages Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:text-primary hover:bg-muted/20 relative transition-all"
                title="Mensagens"
              >
                <Mail className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in duration-300">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b bg-muted/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-primary" />
                    Central de Tickets
                  </h4>
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unreadCount} pendente{unreadCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {pendingMessages.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    Nenhum ticket pendente
                  </div>
                ) : (
                  pendingMessages.slice(0, 5).map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate("/messages")}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`mt-1 ${msg.type === "PASSWORD_RESET" ? "text-yellow-500" : "text-primary"}`}
                        >
                          {msg.type === "PASSWORD_RESET" ? (
                            <Key className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {msg.subject}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {msg.sender?.full_name ||
                              msg.senderEmail ||
                              "Anônimo"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(msg.createdAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-yellow-500 border-yellow-500"
                        >
                          Pendente
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t bg-muted/30">
                <Button
                  variant="ghost"
                  className="w-full h-8 text-xs"
                  onClick={() => navigate("/messages")}
                >
                  Ver todos os tickets
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:text-primary hover:bg-muted/20 overflow-hidden transition-all"
              >
                {profile?.image ? (
                  <img
                    src={profile.image}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[220px] w-auto max-w-[320px]"
            >
              <div className="px-3 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary overflow-hidden border border-primary/20 shrink-0">
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          // Dynamic Color by Role
                          (roleUpper === "SUPER_ADMIN_GOD" ||
                            roleUpper === "SYSTEM_HELPER") &&
                          "text-[#ea580c] font-extrabold drop-shadow-[0_0_8px_rgba(234,88,12,0.4)]",
                          (roleUpper === "SUPER_ADMIN" ||
                            roleUpper === "SUPERADMIN") &&
                          "text-[#f4a261] font-bold",
                          roleUpper === "ADMIN" && "text-[#4dabf7] font-bold",
                          roleUpper === "TI_SOFTWARE" &&
                          "text-[#00ff9c] font-bold font-mono tracking-tight",
                          ![
                            "SUPER_ADMIN_GOD",
                            "SYSTEM_HELPER",
                            "SUPER_ADMIN",
                            "SUPERADMIN",
                            "ADMIN",
                            "TI_SOFTWARE",
                          ].includes(roleUpper) &&
                          isProtectedUser(profile as any) &&
                          "text-orange-400 font-extrabold",
                        )}
                      >
                        {displayName}
                      </p>
                      {isProtectedUser(profile as any) &&
                        (roleUpper === "SUPER_ADMIN_GOD" ||
                          roleUpper === "SYSTEM_HELPER") && (
                          <ShieldCheck className="w-3 h-3 text-orange-500 shrink-0" />
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  {/* Premium Badge Logic for Dropdown */}
                  {roleUpper === "SUPER_ADMIN_GOD" ||
                    roleUpper === "SYSTEM_HELPER" ? (
                    <div className="role-badge role-super-admin-god shadow-[0_0_20px_-5px_rgba(255,183,3,0.5)] scale-90 origin-left">
                      <span className="relative z-10">Super Admin God</span>
                      <span className="orb"></span>
                      <span className="orb"></span>
                      <span className="orb"></span>
                    </div>
                  ) : roleUpper === "SUPER_ADMIN" ||
                    roleUpper === "SUPERADMIN" ? (
                    <div className="role-badge role-socio-diretor scale-90 origin-left">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3" />
                        Sócio Diretor
                      </span>
                    </div>
                  ) : roleUpper === "ADMIN" ? (
                    <div className="role-badge role-admin scale-90 origin-left">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    </div>
                  ) : roleUpper === "TI_SOFTWARE" ? (
                    <div className="role-badge role-ti-software scale-90 origin-left">
                      <span className="flex items-center gap-1.5">
                        <Laptop className="w-3 h-3" />
                        TI-Software
                      </span>
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight transition-all",
                        getRoleStyle(profile?.role || "worker"),
                      )}
                    >
                      {getRoleLabel(profile?.role || "worker")}
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              {pendingChanges > 0 && isOnline && (
                <DropdownMenuItem onClick={syncNow} disabled={isSyncing}>
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  Sincronizar agora
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:bg-destructive/10"
                disabled={!isOnline}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair {!isOnline && "(Offline)"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
