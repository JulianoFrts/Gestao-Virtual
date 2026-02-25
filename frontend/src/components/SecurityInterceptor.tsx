import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente que escuta eventos globais de erro de segurança emitidos pelo OrionApiClient.
 * Centraliza a exibição de toasts para erros 403 (Forbidden) e outros problemas de permissão.
 */
export const SecurityInterceptor = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleSecurityError = (event: any) => {
      const { status, message } = event.detail || {};

      if (status === 403) {
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: message || "Você não tem permissão para realizar esta operação ou acessar este recurso.",
          duration: 5000,
        });
      }
    };

    window.addEventListener('orion-security-error', handleSecurityError);
    
    return () => {
      window.removeEventListener('orion-security-error', handleSecurityError);
    };
  }, [toast]);

  return null; // Componente puramente funcional (listener)
};
