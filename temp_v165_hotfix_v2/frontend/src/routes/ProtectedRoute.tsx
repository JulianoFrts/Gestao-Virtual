import React from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSync } from "@/contexts/SyncContext";
import { ShieldAlert } from "lucide-react";
import { isProtectedSignal, can } from "@/signals/authSignals";
import { useSignals } from "@preact/signals-react/runtime";
import { Button } from "@/components/ui/button";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireConnection?: boolean;
  moduleId?: string;
}

export function ProtectedRoute({
  children,
  requireConnection = false,
  moduleId
}: ProtectedRouteProps) {
  useSignals();
  const { user, profile, isLoading } = useAuth();
  const { isOnline } = useSync();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="animate-pulse text-sm font-medium text-muted-foreground">
            Verificando acesso seguro...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Verificar permissão do módulo se fornecido
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
  }

  return <>{children}</>;
}
