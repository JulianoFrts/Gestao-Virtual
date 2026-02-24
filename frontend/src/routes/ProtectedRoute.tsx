import React from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { ShieldAlert } from "lucide-react";
import { isProtectedSignal, can } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireConnection?: boolean;
  moduleId?: string;
  roles?: string[];
}

export function ProtectedRoute({
  children,
  requireConnection = false,
  moduleId,
  roles
}: ProtectedRouteProps) {
  useSignals();
  const { user, profile, isLoading } = useAuth();
  const { isOnline } = useSync();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 1. O Nível de Decisão Máximo é a Matriz (moduleId).
  // Se a rota define um moduleId, ele é o guia exclusivo de acesso. Ignora os 'roles' hardcoded da rota.
  if (moduleId && profile) {
    const hasPermission = can(moduleId);
    if (!hasPermission) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
          <ShieldAlert className="mb-4 h-16 w-16 text-destructive" />
          <h2 className="mb-2 text-2xl font-bold">Acesso Restrito</h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Você não possui as permissões necessárias para acessar este módulo.
            Entre em contato com o administrador do sistema.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar para o Início
          </Button>
        </div>
      );
    }
  } else if (roles && roles.length > 0 && profile) {
    // 2. Se NÃO houver moduleId, fazemos o fallback para a checagem tradicional (legado / fallback)
    const userRole = profile.role || (user as any).role;
    const isGod = (profile as any).isSystemAdmin || can('*');

    if (!isGod && !roles.includes(userRole)) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
          <ShieldAlert className="mb-4 h-16 w-16 text-destructive" />
          <h2 className="mb-2 text-2xl font-bold">Acesso Restrito por Papel</h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Seu nível de acesso ({userRole}) não permite ver esta página.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Voltar para o Início
          </Button>
        </div>
      );
    }
  }

  // Verificar exigência de conexão (Modo Online Obrigatório)
  if (requireConnection && !isOnline) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldAlert className="mb-4 h-16 w-16 text-warning" />
        <h2 className="mb-2 text-2xl font-bold">Conexão Necessária</h2>
        <p className="mb-6 max-w-md text-muted-foreground">
          Este módulo requer uma conexão ativa com o servidor para garantir a integridade dos dados em tempo real. Por favor, verifique sua internet.
        </p>
        <Button onClick={() => navigate("/")} variant="outline">
          Voltar para o Início
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
