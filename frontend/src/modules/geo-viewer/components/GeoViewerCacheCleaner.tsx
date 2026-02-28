import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { orionApi } from '@/integrations/orion/client'

interface GeoViewerCacheCleanerProps {
  projectId: string | null
  onRefresh: () => Promise<void>
}

export const GeoViewerCacheCleaner: React.FC<GeoViewerCacheCleanerProps> = ({
  projectId,
  onRefresh,
}) => {
  const [attempts, setAttempts] = useState(0)
  const [isCleaning, setIsCleaning] = useState(false)
  const lastAttemptTime = useRef<number>(0)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleClearCache = useCallback(async () => {
    if (!projectId || isCleaning) return

    // Lógica de Cooldown de 1.5s
    const now = Date.now()
    if (now - lastAttemptTime.current < 1500) {
      return
    }
    lastAttemptTime.current = now

    setIsCleaning(true)
    
    try {
      // 1. Limpeza de Cache local da API Orion
      orionApi.clearCache()
      
      // 2. Tentar recarregar os dados (Simula o Sincronizando Dados)
      await onRefresh()
      
      // Sucesso: resetamos as tentativas
      setAttempts(0)
      toast({
        title: 'Sincronização Concluída',
        description: 'Os dados foram atualizados com sucesso.',
      })
    } catch (error) {
      const nextAttempt = attempts + 1
      setAttempts(nextAttempt)

      if (nextAttempt >= 3) {
        // REGRA DE OURO: Mensagem genérica e segura. Redirecionamento para Dashboard.
        toast({
          variant: 'destructive',
          title: 'Sistema Indisponível',
          description: 'Não foi possível completar a operação. Por favor, contate o administrador ou registre um ticket.',
        })
        
        // Aguarda 2 segundos para o usuário ler e redireciona
        setTimeout(() => navigate('/dashboard'), 2000)
      } else {
        toast({
          variant: 'default',
          title: 'Aviso',
          description: `Falha na sincronização. Tentativa ${nextAttempt} de 3.`,
        })
      }
    } finally {
      setIsCleaning(false)
    }
  }, [projectId, isCleaning, attempts, onRefresh, navigate, toast])

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClearCache}
      disabled={isCleaning}
      className="h-11 gap-3 rounded-2xl px-6 text-[10px] font-black tracking-widest text-neutral-400 uppercase hover:bg-white/10 hover:text-emerald-400 transition-all active:scale-95"
    >
      <RefreshCw className={`h-4 w-4 ${isCleaning ? 'animate-spin' : ''}`} />
      <span>{isCleaning ? 'Sincronizando...' : 'Limpar Cache'}</span>
    </Button>
  )
}
