import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Info,
  Search,
  Filter,
  Hash,
  Download,
  LayoutGrid,
  MapPin
} from 'lucide-react';
import { TowerImportService, RawTowerImportItem } from '@/services/import/TowerImportService';
import { orionApi } from '@/integrations/orion/client';
import { monitorJob, updateJobState } from '@/signals/jobSignals';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { selectedContextSignal } from '@/signals/authSignals';
import { useSignals } from '@preact/signals-react/runtime';
import { useProjects } from '@/hooks/useProjects';
import { useSites } from '@/hooks/useSites';
import { utils, writeFile } from "xlsx";
import { useQueryClient } from '@tanstack/react-query';
import { getUniqPayload } from 'recharts/types/util/payload/getUniqPayload';

interface TowerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  companyId?: string;
  siteId?: string;
}

const TowerImportModal = ({
  isOpen,
  onClose,
  projectId: propProjectId,
  companyId: initialCompanyId,
  siteId: propSiteId
}: TowerImportModalProps) => {
  useSignals();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { projects } = useProjects();
  const queryClient = useQueryClient();
  
  const [items, setItems] = useState<RawTowerImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Contexto dinâmico
  const [selectedProjectId, setSelectedProjectId] = useState<string>(propProjectId || selectedContextSignal.value?.projectId || '');
  
  // Normalizar siteId para o seletor (se for 'all', vira 'none')
  const initialSiteId = useMemo(() => {
    if (propSiteId && propSiteId !== 'all') return propSiteId;
    const signalSiteId = selectedContextSignal.value?.siteId;
    if (signalSiteId && signalSiteId !== 'all') return signalSiteId;
    return 'none';
  }, [propSiteId, selectedContextSignal.value?.siteId]);

  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteId);

  // Hook de canteiros baseado no projeto selecionado
  const { sites } = useSites(selectedProjectId && selectedProjectId !== 'all' ? selectedProjectId : undefined);

  // Sincronizar com sinais globais se as props mudarem ou o sinal mudar
  useEffect(() => {
    if (!propProjectId && selectedContextSignal.value?.projectId) {
        setSelectedProjectId(selectedContextSignal.value.projectId);
    }
  }, [propProjectId, selectedContextSignal.value?.projectId]);

  useEffect(() => {
    const targetSiteId = propSiteId || selectedContextSignal.value?.siteId || 'none';
    setSelectedSiteId(targetSiteId === 'all' ? 'none' : targetSiteId);
  }, [propSiteId, selectedContextSignal.value?.siteId]);

  // Estados de Filtro de Preview
  const [searchTerm, setSearchTerm] = useState('');
  const [trechoFilter, setTrechoFilter] = useState<string>('all');
  const [importLimit, setImportLimit] = useState<string>('0'); 

  const filteredItems = useMemo(() => {
    let result = items;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.NumeroTorre.toLowerCase().includes(term) || 
        (item.Trecho && item.Trecho.toLowerCase().includes(term))
      );
    }
    
    if (trechoFilter !== 'all') {
      result = result.filter(item => item.Trecho === trechoFilter);
    }
    
    return result;
  }, [items, searchTerm, trechoFilter]);

  const uniqueTrechos = useMemo(() => {
    const trechos = Array.from(new Set(items.map(i => i.Trecho).filter(Boolean)));
    return trechos.sort();
  }, [items]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const parsedItems = await TowerImportService.parseFile(file);
      setItems(parsedItems);
    } catch (error) {
      toast({ title: 'Erro ao processar arquivo', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
          Sequencia: 1,
          Trecho: "C1",
          NumeroTorre: "0/1",
          TextoTorre: "PORT",
          Tipificacao: "PORT",
          TramoLancamento: 19
      }
    ];
    const ws = utils.json_to_sheet(template);
    
    // Forçar colunas específicas para texto para evitar a conversão automática de datas no Excel
    // NumeroTorre (identificador alfanumérico como 0/1, TRIO_C1)
    const range = utils.decode_range(ws['!ref'] || 'A1:K2');
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cellAddress = utils.encode_cell({ r: R, c: 2 }); // Coluna C (NumeroTorre)
        if (ws[cellAddress]) {
            ws[cellAddress].t = 's'; // Force type to string
            ws[cellAddress].z = '@'; // Force Excel format to text
        }
    }

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Modelo Importação");
    writeFile(wb, "Modelo_Importacao_Torres.xlsx");
  };

  const handleConfirm = async () => {
    const validFilteredItems = filteredItems.filter(i => i.status !== 'invalid');
    const limitNum = parseInt(importLimit);
    const itemsToImport = limitNum > 0 ? validFilteredItems.slice(0, limitNum) : validFilteredItems;

    if (!selectedProjectId) {
        toast({ title: 'Obra não selecionada', description: 'Por favor, selecione a obra de destino.', variant: 'destructive' });
        return;
    }

    if (itemsToImport.length === 0) {
      toast({ title: 'Nenhum item válido para importar', description: 'Verifique filtros e validade dos dados.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    // Configuração de Loteamento (Batching) para "Stream" de dados
    const BATCH_SIZE = 50;
    const totalBatches = Math.ceil(itemsToImport.length / BATCH_SIZE);
    let successfullyStarted = 0;
    let failedBatches = 0;

    try {
      for (let i = 0; i < itemsToImport.length; i += BATCH_SIZE) {
        const batch = itemsToImport.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        try {
            const { data: job, error } = await orionApi.post<{ id: string }>('jobs', {
              type: 'TOWER_IMPORT',
              payload: { 
                  data: batch.map(item => ({
                      projectId: selectedProjectId,
                      companyId: initialCompanyId || profile?.companyId,
                      siteId: (selectedSiteId && selectedSiteId !== 'none') ? selectedSiteId : null,
                      externalId: item.NumeroTorre,
                      trecho: item.Trecho,
                      towerType: item.TextoTorre,
                      objectSeq: item.Sequencia,
                      tramoLancamento: item.TramoLancamento,
                      tipificacaoEstrutura: item.Tipificacao,
                      type: 'TOWER'
                  })),

                  projectId: selectedProjectId,
                  companyId: initialCompanyId || profile?.companyId,
                  siteId: (selectedSiteId && selectedSiteId !== 'none') ? selectedSiteId : null,
                  requestedBy: profile?.id,
                  requestedAt: new Date().toISOString(),
                  batchInfo: { current: batchNum, total: totalBatches, size: batch.length }
              }
            });
            
            if (error) {
                console.error(`Erro no lote ${batchNum}: ${error.message}`);
                failedBatches++;
                continue;
            }
            
            if (job) {
              updateJobState(job.id, job as any);
              monitorJob(job.id);
              successfullyStarted += batch.length;
            }
            
            // Pequeno delay entre lotes para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (innerErr: any) {
            console.error(`Fatal HTTP Error no lote ${batchNum}:`, innerErr);
            failedBatches++;
        }
      }

      if (failedBatches > 0) {
          toast({ 
            title: 'Lotes enviados com ressalvas', 
            description: `${successfullyStarted} torres enviadas. Falha em ${failedBatches} lote(s).`,
            variant: "warning" as any
          });
      } else {
          toast({ 
            title: 'Lotes enviados', 
            description: 'Os dados foram enviados para o servidor e estão sendo processados em segundo plano.' 
          });
      }
      
      onClose();
      setItems([]);
    } catch (err: any) {
      toast({ title: 'Erro fatal na importação', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = items.filter(i => i.status === 'valid').length;
  const invalidCount = items.filter(i => i.status === 'invalid').length;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
        if (!isSubmitting) {
            if (!val) {
                setItems([]);
                onClose();
            }
        }
    }}>
      <DialogContent className="max-w-6xl bg-[#0c0c0e] border-white/10 p-0 overflow-hidden rounded-4xl shadow-2xl backdrop-blur-xl">
        <div className="p-8 border-b border-white/5 bg-linear-to-br from-primary/5 to-transparent">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20 shadow-glow">
                <FileUp className="text-primary w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                  Importação de Torres Premium
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Módulo de processamento e importação em massa de torres e vãos técnicos do projeto.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-9 border-white/10 hover:bg-white/5 text-[10px] uppercase font-black tracking-widest">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Template CSV
                </Button>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[75vh]">
        <div className="p-8 space-y-8">
          {/* DESTINATION CONTEXT SELECTORS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl border border-white/5">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Obra de Destino</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-12 bg-black/40 border-white/10 rounded-2xl text-xs font-bold text-white">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-primary" />
                      <SelectValue placeholder="Selecione a Obra" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-white/10 text-white rounded-2xl">
                    {projects?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Canteiro (Opcional)</label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger className="h-12 bg-black/40 border-white/10 rounded-2xl text-xs font-bold text-white">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <SelectValue placeholder="Selecione o Canteiro" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1c] border-white/10 text-white rounded-2xl">
                    <SelectItem value="none">NENHUM CANTEIRO (PROJETO)</SelectItem>
                    {sites?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>

          {items.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer border-2 border-dashed border-white/5 hover:border-primary/40 rounded-4xl p-20 transition-all hover:bg-primary/5 flex flex-col items-center justify-center gap-6 active:scale-[0.98]"
            >
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500 shadow-premium">
                {isProcessing ? <Loader2 className="w-12 h-12 animate-spin text-primary" /> : <FileUp className="w-12 h-12 text-slate-500 group-hover:text-primary" />}
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-white group-hover:text-primary transition-colors">Arraste seu CSV ou clique para selecionar</p>
                <p className="text-sm text-slate-500 font-medium tracking-wide mt-2">Suporte a delimitadores , (vírgula) ou ; (ponto e vírgula)</p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      placeholder="Buscar por número da torre ou trecho..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-base focus:ring-primary/20 industrial-input font-bold"
                    />
                  </div>
                  
                  <Select value={trechoFilter} onValueChange={setTrechoFilter}>
                    <SelectTrigger className="w-[180px] h-14 bg-white/5 border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <SelectValue placeholder="Trecho" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1c] border-white/10 text-white rounded-2xl">
                      <SelectItem value="all">TODOS TRECHOS</SelectItem>
                      {uniqueTrechos.map(t => (
                        <SelectItem key={t} value={t!}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={importLimit} onValueChange={setImportLimit}>
                    <SelectTrigger className="w-[200px] h-14 bg-primary/10 border-primary/20 rounded-2xl text-xs font-black text-primary uppercase tracking-widest shadow-glow">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" />
                        <span>LIMITE: {importLimit === '0' ? 'TOTAL' : importLimit}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1c] border-white/10 text-white rounded-2xl">
                      <SelectItem value="0">IMPORTAR TUDO ({validCount})</SelectItem>
                      {[10, 50, 100, 200, 500].map(val => (
                        <SelectItem key={val} value={val.toString()}>PROXIMOS {val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                  <div className="flex items-center gap-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Válidos</span>
                            <span className="text-lg font-black text-white leading-none">{filteredItems.filter(i => i.status === 'valid').length}</span>
                        </div>
                    </div>
                    {invalidCount > 0 && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center ring-1 ring-rose-500/20">
                            <XCircle className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Críticos</span>
                            <span className="text-lg font-black text-white leading-none">{invalidCount}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors" onClick={() => setItems([])}>Resetar Arquivo</Button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 overflow-hidden bg-black/40 shadow-premium">
                  <Table>
                    <TableHeader className="bg-white/5 sticky top-0 z-10">
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="w-16 text-center py-6"></TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6 text-center">SEQ</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">(Nº Torre)</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6">TRECHO</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6 text-center">TIPO</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-6 text-center pr-10">TRAMO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item, idx) => (
                        <TableRow key={idx} className={cn("border-white/5 transition-colors group", item.status === 'invalid' ? 'bg-rose-500/5' : 'hover:bg-white/5')}>
                          <TableCell className="py-5 text-center">
                            {item.status === 'valid' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-rose-500 mx-auto animate-pulse" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm font-black text-primary/80 uppercase">{item.Sequencia}</span>
                          </TableCell>
                          <TableCell className="font-black text-sm text-white group-hover:text-primary transition-colors">
                            {item.NumeroTorre || <span className="text-rose-500 italic">Ausente</span>}
                            {item.errors && (
                                <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-tighter bg-rose-500/10 px-2 py-0.5 rounded w-fit">{item.errors[0]}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-400 font-mono tracking-tighter uppercase">{item.Trecho || '-'}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                                <Badge className="bg-white/10 text-white border-white/5 text-[9px] font-black uppercase hover:bg-white/20 whitespace-nowrap px-2.5 py-1">
                                    {item.TextoTorre || 'Autoportante'}
                                </Badge>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{item.TextoTorre || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center pr-10">
                            <span className="text-[11px] font-black text-slate-500 uppercase">{item.TramoLancamento}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              </div>

              <div className="flex gap-6 items-center bg-primary/5 border border-primary/10 p-8 rounded-4xl">
                 <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shadow-glow">
                    <Info className="w-7 h-7 text-primary shrink-0" />
                 </div>
                 <div className="flex-1 space-y-1">
                   <strong className="text-primary text-sm uppercase font-black tracking-widest block">Segurança de Dados & Audit</strong>
                   <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-3xl">
                     Apenas linhas validadas pelo motor de importação serão registradas. O sistema associará automaticamente estas torres ao projeto selecionado.
                   </p>
                 </div>
              </div>
            </div>
          )}
        </div>
        </ScrollArea>

        {items.length > 0 && (
          <div className="p-8 border-t border-white/5 flex gap-4 justify-end bg-black/60 backdrop-blur-3xl">
            <Button 
                variant="ghost" 
                onClick={() => setItems([])} 
                disabled={isSubmitting}
                className="rounded-2xl h-16 px-10 font-black text-slate-400 hover:bg-white/5 hover:text-white uppercase tracking-widest text-xs"
            >
                CANCELAR
            </Button>
            <Button 
                onClick={handleConfirm} 
                className="rounded-2xl h-16 px-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xl shadow-glow transition-all active:scale-[0.95] flex gap-3"
                disabled={isSubmitting || validCount === 0 || !selectedProjectId}
            >
              {isSubmitting ? <Loader2 className="w-7 h-7 animate-spin" /> : (
                <>
                  CONFIRMAR IMPORTAÇÃO <ArrowRight className="w-7 h-7" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TowerImportModal;
