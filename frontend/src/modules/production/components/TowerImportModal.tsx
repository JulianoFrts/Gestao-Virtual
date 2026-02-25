"use client";

import React, { useRef, useState } from "react";
import { TowerImportService, RawTowerImportItem } from "@/services/import/TowerImportService";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileUp, AlertCircle, ArrowRight } from "lucide-react";
import { orionApi } from "@/integrations/orion/client";
import { monitorJob, updateJobState } from "@/signals/jobSignals";
import { useAuth } from "@/contexts/AuthContext";

type ImportItem = {
  id: string;
  name: string;
  valid: boolean;
  errors?: string[];
};

type ImportSummary = {
  total: number;
  valid: number;
  invalid: number;
};

interface TowerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  companyId?: string;
  siteId?: string;
}

export default function TowerImportModal({
  isOpen,
  onClose,
  projectId,
  companyId,
  siteId,
}: TowerImportModalProps) {
  const { toast } = useToast();
  const { profile, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ImportItem[]>([]);
  const [rawItems, setRawItems] = useState<RawTowerImportItem[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const result = await TowerImportService.parseFile(file);
      setRawItems(result.items);

      const mappedItems: ImportItem[] = result.items.map((item) => ({
        id: item.NumeroTorre || String(item.Sequencia),
        name: item.NumeroTorre || `Torre ${item.Sequencia}`,
        valid: item.status === "valid",
        errors: item.errors,
      }));

      setItems(mappedItems);

      setImportSummary({
        total: result.total,
        valid: result.valid,
        invalid: result.invalid,
      });

      toast({ title: "Arquivo processado com sucesso" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao processar arquivo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

const MAX_IMPORT_LIMIT = 900;

const handleConfirm = async () => {
  if (!projectId || projectId === "all") {
    toast({ title: "Obra não selecionada", variant: "destructive" });
    return;
  }

  const cid = companyId || profile?.companyId;
  if (!cid || cid === "all") {
    toast({ title: "Empresa não identificada", variant: "destructive" });
    return;
  }

  if (!profile?.id) {
    toast({
      title: "Perfil não carregado",
      variant: "destructive",
    });
    return;
  }

  const validItems = rawItems.filter(
    (i) => i.status === "valid" || i.status === "warning"
  );

  if (validItems.length === 0) {
    toast({
      title: "Nenhum item válido para importar",
      variant: "destructive",
    });
    return;
  }

  setIsSubmitting(true);

  try {
    // 🔥 Se for até 900 → fluxo normal
    if (validItems.length <= MAX_IMPORT_LIMIT) {
      const { data: job, error } = await orionApi.post<{ id: string }>(
        "jobs",
        {
          type: "TOWER_IMPORT",
          payload: {
            data: validItems.map((item) => ({
              projectId,
              companyId: cid,
              siteId: siteId && siteId !== "all" ? siteId : null,
              externalId: item.NumeroTorre,
              trecho: item.Trecho,
              towerType: item.TextoTorre,
              objectSeq: item.Sequencia,
              tramoLancamento: item.TramoLancamento,
              tipificacaoEstrutura: item.Tipificacao,
              goForward: item.VaoVante,
              totalConcreto: item.VolumeConcreto,
              pesoArmacao: item.PesoArmacao,
              pesoEstrutura: item.PesoEstrutura,
              type: "TOWER",
            })),
            projectId,
            companyId: cid,
            siteId: siteId && siteId !== "all" ? siteId : null,
            requestedBy: profile.id,
          },
        }
      );

      if (error) throw new Error(error.message);

      if (job) {
        updateJobState(job.id, job as any);
        monitorJob(job.id);
      }
    } 
    // 🚀 Se passar de 900 → chama worker em batches
    else {
      const batches = Array.from(
        { length: Math.ceil(validItems.length / MAX_IMPORT_LIMIT) },
        (_, index) =>
          validItems.slice(
            index * MAX_IMPORT_LIMIT,
            index * MAX_IMPORT_LIMIT + MAX_IMPORT_LIMIT
          )
      );

      await Promise.all(
        batches.map(async (batch, index) => {
          const { data: job, error } = await orionApi.post<{ id: string }>(
            "jobs",
            {
              type: "TOWER_IMPORT",
              payload: {
                data: batch.map((item) => ({
                  projectId,
                  companyId: cid,
                  siteId: siteId && siteId !== "all" ? siteId : null,
                  externalId: item.NumeroTorre,
                  trecho: item.Trecho,
                  towerType: item.TextoTorre,
                  objectSeq: item.Sequencia,
                  tramoLancamento: item.TramoLancamento,
                  tipificacaoEstrutura: item.Tipificacao,
                  goForward: item.VaoVante,
                  totalConcreto: item.VolumeConcreto,
                  pesoArmacao: item.PesoArmacao,
                  pesoEstrutura: item.PesoEstrutura,
                  type: "TOWER",
                })),
                projectId,
                companyId: cid,
                siteId: siteId && siteId !== "all" ? siteId : null,
                requestedBy: profile.id,
                batchInfo: {
                  current: index + 1,
                  total: batches.length,
                  size: batch.length,
                },
              },
            }
          );

          if (error) throw new Error(error.message);

          if (job) {
            updateJobState(job.id, job as any);
            monitorJob(job.id);
          }
        })
      );
    }

    toast({
      title: "Importação iniciada",
      description: `${validItems.length} torres enviadas para processamento.`,
    });

    onClose();
    setItems([]);
    setRawItems([]);
    setImportSummary(null);

  } catch (err: any) {
    toast({
      title: "Erro na importação",
      description: err.message,
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isSubmitting && !val && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-[#0c0c0e] border-white/10 p-0 overflow-hidden shadow-2xl backdrop-blur-xl rounded-[2rem]">
        
        {/* HEADER */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white mb-1">
              Importação de Torres
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium tracking-wide">
              Selecione um arquivo CSV ou Excel para importar as torres.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* BODY */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-8 space-y-6 flex flex-col min-h-0 overflow-hidden">

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isSubmitting}
              variant="outline"
              className="group w-full h-24 border-dashed border-2 border-white/5 hover:border-primary/40 rounded-3xl flex flex-col gap-2 transition-all hover:bg-primary/5 active:scale-[0.98]"
            >
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : (
                <FileUp className="w-8 h-8 text-slate-500 group-hover:text-primary transition-colors" />
              )}
              <span className="text-sm font-bold text-slate-400 group-hover:text-primary transition-colors">
                Clique para selecionar o arquivo
              </span>
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />

            {importSummary && (
              <div className="grid grid-cols-3 gap-4 border border-white/5 rounded-3xl p-6 bg-white/5 backdrop-blur-md">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black text-white">{importSummary.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Válidos</p>
                  <p className="text-2xl font-black text-emerald-500">{importSummary.valid}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Inválidos</p>
                  <p className="text-2xl font-black text-rose-500">{importSummary.invalid}</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 border-t border-white/5 flex gap-4 justify-end bg-black/60 backdrop-blur-3xl">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl h-14 px-8 font-black text-slate-400 hover:bg-white/5 hover:text-white uppercase tracking-widest text-xs"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              isSubmitting ||
              rawItems.filter(i => i.status === "valid" || i.status === "warning").length === 0
            }
            className="rounded-2xl h-14 px-12 bg-amber-500 hover:bg-amber-600 text-black font-black text-sm shadow-glow transition-all active:scale-[0.95] flex gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Confirmar Importação <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}