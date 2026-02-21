import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, HardHat, SignpostBig, ShieldCheck, ArrowRight } from 'lucide-react';
import { localApi } from '@/integrations/orion/client';
import { useToast } from '@/hooks/use-toast';

interface ContextOption {
    id: string;
    name: string;
    companyId?: string;
    projectId?: string;
}

interface ContextSelectorModalProps {
  open: boolean;
  onSuccess: () => void;
}

export function ContextSelectorModal({ open, onSuccess }: ContextSelectorModalProps) {
  const { profile, selectContext } = useAuth();
  const { toast } = useToast();
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [options, setOptions] = useState<any>(null);
  const [selection, setSelection] = useState({
    companyId: '',
    projectId: '',
    siteId: ''
  });

  useEffect(() => {
    if (open && profile) {
      loadOptions();
    }
  }, [open, profile]);

  const loadOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const response = await localApi.get('/auth/context/options');
      const data = response.data as any;
      setOptions(data);
      
      // Se for FIXED, já podemos tentar validar automaticamente ou preencher
      if (data.type === 'FIXED') {
          handleAutoSubmit(data);
      } else if (data.type === 'PROJECT_MANAGER' || data.type === 'SITE_MANAGER') {
          setSelection(prev => ({
              ...prev,
              companyId: data.companyId || '',
              projectId: data.projectId || ''
          }));
      }
    } catch (error) {
      console.error("[ContextSelector] Failed to load options:", error);
      toast({ title: "Erro", description: "Falha ao carregar opções de acesso.", variant: "destructive" });
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleAutoSubmit = async (fixedData: any) => {
      try {
          await selectContext({
              companyId: fixedData.companyId,
              projectId: fixedData.projectId,
              siteId: fixedData.siteId
          });
          onSuccess();
      } catch (err) {
          console.error("[ContextSelector] Auto-submit failed:", err);
      }
  };

  const handleSubmit = async () => {
    if (!selection.companyId && options?.type === 'GLOBAL') {
        toast({ title: "Atenção", description: "Selecione uma empresa." });
        return;
    }
    if (!selection.projectId && (options?.type === 'GLOBAL' || options?.type === 'PROJECT_MANAGER')) {
        toast({ title: "Atenção", description: "Selecione uma obra." });
        return;
    }
    if (!selection.siteId) {
        toast({ title: "Atenção", description: "Selecione um canteiro." });
        return;
    }

    setIsSubmitting(true);
    try {
      await selectContext(selection);
      toast({ title: "Sucesso", description: "Contexto de trabalho definido!" });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Erro de Validação", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (options?.type === 'FIXED' && !isLoadingOptions) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md bg-[#0c0c0e] border-white/10 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
        <DialogHeader className="items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-primary/20">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white mb-2">
            Isolamento de Segurança
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Defina seu contexto de trabalho para esta sessão.
          </DialogDescription>
        </DialogHeader>

        {isLoadingOptions ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-primary/40">Sincronizando Permissões...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-6">
            {/* Seleção de Empresa */}
            {(options?.type === 'GLOBAL') && (
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                  <Building2 className="w-3 h-3 text-primary" />
                  Empresa Vinculada
                </Label>
                <Select
                  value={selection.companyId}
                  onValueChange={(val) => setSelection({ companyId: val, projectId: '', siteId: '' })}
                >
                  <SelectTrigger className="bg-black/40 border-white/5 rounded-2xl h-12 text-white font-bold hove:bg-black/60 transition-all">
                    <SelectValue placeholder="Selecione a Empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c0c0e] border-white/10 rounded-2xl">
                    {options.companies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="text-white hover:bg-primary/20">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seleção de Obra (Project) */}
            {(options?.type === 'GLOBAL' || options?.type === 'PROJECT_MANAGER') && (
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                  <SignpostBig className="w-3 h-3 text-primary" />
                  Obra / Projeto
                </Label>
                <Select
                  value={selection.projectId}
                  onValueChange={(val) => setSelection(prev => ({ ...prev, projectId: val, siteId: '' }))}
                  disabled={options.type === 'GLOBAL' && !selection.companyId}
                >
                  <SelectTrigger className="bg-black/40 border-white/5 rounded-2xl h-12 text-white font-bold hove:bg-black/60 transition-all">
                    <SelectValue placeholder="Selecione a Obra" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0c0c0e] border-white/10 rounded-2xl">
                    {options.projects?.filter((p: any) => options.type !== 'GLOBAL' || p.companyId === selection.companyId).map((p: any) => (
                      <SelectItem key={p.id} value={p.id} className="text-white hover:bg-primary/20">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Seleção de Canteiro (Site) */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
                <HardHat className="w-3 h-3 text-primary" />
                Canteiro de Obras
              </Label>
              <Select
                value={selection.siteId}
                onValueChange={(val) => setSelection(prev => ({ ...prev, siteId: val }))}
                disabled={(options.type === 'GLOBAL' || options.type === 'PROJECT_MANAGER') && !selection.projectId}
              >
                <SelectTrigger className="bg-black/40 border-white/5 rounded-2xl h-12 text-white font-bold hove:bg-black/60 transition-all">
                  <SelectValue placeholder="Selecione o Canteiro" />
                </SelectTrigger>
                <SelectContent className="bg-[#0c0c0e] border-white/10 rounded-2xl">
                  {options.sites?.filter((s: any) => (options.type !== 'GLOBAL' && options.type !== 'PROJECT_MANAGER') || s.projectId === selection.projectId).map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="text-white hover:bg-primary/20">{s.name}</SelectItem>
                  ))}
                  {/* Se for SITE_MANAGER, as opções vêm direto no options.sites */}
                  {options.type === 'SITE_MANAGER' && options.sites.map((s: any) => (
                      <SelectItem key={s.id} value={s.id} className="text-white hover:bg-primary/20">{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.3)] transition-all active:scale-[0.98] mt-4"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  CONFIRMAR ACESSO <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
