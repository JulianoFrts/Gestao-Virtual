import React, { useState, useRef } from 'react';
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
  Hash
} from 'lucide-react';
import { JobFunctionImportService, RawImportItem } from '@/services/import/JobFunctionImportService';
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

interface ImportJobFunctionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string | null;
}

export function ImportJobFunctionsModal({ open, onOpenChange, companyId }: ImportJobFunctionsModalProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<RawImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [laborFilter, setLaborFilter] = useState<string>('all');
  const [importLimit, setImportLimit] = useState<string>('0'); // 0 = todos

  // Lógica de Filtragem
  const filteredItems = React.useMemo(() => {
    let result = items;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(term) || 
        (item.description && item.description.toLowerCase().includes(term))
      );
    }
    
    if (levelFilter !== 'all') {
      const lvl = parseInt(levelFilter);
      result = result.filter(item => item.hierarchyLevel === lvl);
    }
    
    if (laborFilter !== 'all') {
      result = result.filter(item => item.laborType === laborFilter);
    }
    
    return result;
  }, [items, searchTerm, levelFilter, laborFilter]);

  const uniqueLevels = React.useMemo(() => {
    const levels = Array.from(new Set(items.map(i => i.hierarchyLevel)));
    return levels.sort((a, b) => b - a);
  }, [items]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const content = await file.text();
      const parsedItems = await JobFunctionImportService.parseCSV(content, companyId);
      setItems(parsedItems);
    } catch (error) {
      toast({ title: 'Erro ao processar arquivo', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    const validFilteredItems = filteredItems.filter(i => i.status !== 'invalid');
    const limitNum = parseInt(importLimit);
    const itemsToImport = limitNum > 0 ? validFilteredItems.slice(0, limitNum) : validFilteredItems;

    if (itemsToImport.length === 0) {
      toast({ title: 'Nenhum item válido para importar', description: 'Verifique filtros e validade dos dados.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: job, error } = await orionApi.post<{ id: string }>('jobs', {
        type: 'JOB_FUNCTION_IMPORT',
        payload: { 
            data: itemsToImport.map(i => ({
                name: i.name,
                description: i.description,
                canLeadTeam: i.canLeadTeam,
                laborType: i.laborType,
                hierarchyLevel: i.hierarchyLevel,
                companyId
            }))
        }
      });

      if (error) throw new Error(error.message);
      if (job) {
        updateJobState(job.id, job as any);
        monitorJob(job.id);
        toast({ title: 'Importação iniciada', description: `${itemsToImport.length} funções em processamento.` });
        onOpenChange(false);
        setItems([]);
      }
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = items.filter(i => i.status === 'valid').length;
  const invalidCount = items.filter(i => i.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!isSubmitting) {
            onOpenChange(val);
            if (!val) setItems([]);
        }
    }}>
      <DialogContent className="max-w-4xl bg-[#0c0c0e] border-white/10 p-0 overflow-hidden rounded-4xl shadow-2xl backdrop-blur-xl">
        <div className="p-8 border-b border-white/5 bg-linear-to-br from-primary/5 to-transparent">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20">
                <FileUp className="text-primary w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                  Importação Inteligente
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">
                  Carregue seu CSV para automatizar o cadastro de cargos e funções.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          {items.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer border-2 border-dashed border-white/5 hover:border-primary/40 rounded-4xl p-12 transition-all hover:bg-primary/5 flex flex-col items-center justify-center gap-4 active:scale-[0.98]"
            >
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                <FileUp className="w-8 h-8 text-slate-500 group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white group-hover:text-primary transition-colors">Clique para selecionar o arquivo</p>
                <p className="text-sm text-slate-500 font-medium tracking-wide">Apenas arquivos .CSV são suportados (UTF-8)</p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      placeholder="Buscar por nome ou descrição..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-11 bg-white/5 border-white/10 rounded-2xl text-sm focus:ring-primary/20"
                    />
                  </div>
                  
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-[140px] h-11 bg-white/5 border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <SelectValue placeholder="Nível" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1c] border-white/10 text-white rounded-2xl">
                      <SelectItem value="all">TODOS NÍVEIS</SelectItem>
                      {uniqueLevels.map(lvl => (
                        <SelectItem key={lvl} value={lvl.toString()}>NÍVEL {lvl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={laborFilter} onValueChange={setLaborFilter}>
                    <SelectTrigger className="w-[120px] h-11 bg-white/5 border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider">
                      <SelectValue placeholder="Mão de Obra" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1c] border-white/10 text-white rounded-2xl">
                      <SelectItem value="all">TODOS (MOI/MOD)</SelectItem>
                      <SelectItem value="MOD">MOD</SelectItem>
                      <SelectItem value="MOI">MOI</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={importLimit} onValueChange={setImportLimit}>
                    <SelectTrigger className="w-[160px] h-11 bg-primary/10 border-primary/20 rounded-2xl text-xs font-black text-primary uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" />
                        <span>QTD: {importLimit === '0' ? 'TOTAL' : importLimit}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1c] border-white/10 text-white rounded-2xl">
                      <SelectItem value="0">IMPORTAR TUDO ({validCount})</SelectItem>
                      {[5, 10, 20, 50, 100].map(val => (
                        <SelectItem key={val} value={val.toString()}>LIMITAR: {val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-black uppercase text-white tracking-widest">
                          {filteredItems.filter(i => i.status === 'valid').length} Filtrados {validCount !== filteredItems.filter(i => i.status === 'valid').length && `(de ${validCount})`}
                        </span>
                    </div>
                    {invalidCount > 0 && (
                      <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-500" />
                          <span className="text-xs font-black uppercase text-white tracking-widest">{invalidCount} Inválidos</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white" onClick={() => setItems([])}>Limpar Tudo</Button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/5 overflow-hidden bg-black/40">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader className="bg-white/5 sticky top-0 z-10">
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4">Nome da Função</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4">Descrição</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 text-center">Lid.</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 text-center">Nível</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-4 text-center">Mao de Obra (MOI/MOD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item, idx) => (
                        <TableRow key={idx} className={cn("border-white/5 transition-colors", item.status === 'invalid' ? 'bg-rose-500/5' : 'hover:bg-white/5')}>
                          <TableCell className="py-4">
                            {item.status === 'valid' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-sm text-white">
                            {item.name || <span className="text-rose-500 italic">Ausente</span>}
                            {item.errors && (
                                <p className="text-[10px] font-medium text-rose-500 mt-1">{item.errors[0]}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 max-w-[200px] truncate">{item.description || '-'}</TableCell>
                          <TableCell className="text-center">
                            {item.canLeadTeam ? (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-black uppercase hover:bg-amber-500/10">Sim</Badge>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px]">Não</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-white">
                            {item.hierarchyLevel}
                          </TableCell>
                           <TableCell className="text-center">
                            {item.laborType === 'MOD' ? (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-black uppercase hover:bg-amber-500/10">MOD</Badge>
                            ) : (
                              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] font-black uppercase hover:bg-blue-500/10">MOI</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="flex gap-4 items-center bg-blue-500/5 border border-blue-500/10 p-5 rounded-3xl">
                 <Info className="w-5 h-5 text-blue-400 shrink-0" />
                 <p className="text-[11px] text-blue-400/80 font-medium leading-relaxed">
                   Apenas linhas marcadas com check serão importadas. Linhas com erro serão ignoradas automaticamente pelo sistema.
                 </p>
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-8 border-t border-white/5 flex gap-4 justify-end bg-black/20">
            <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                disabled={isSubmitting}
                className="rounded-2xl h-14 px-8 font-bold text-slate-400 hover:bg-white/5 hover:text-white"
            >
                CANCELAR
            </Button>
            <Button 
                onClick={handleConfirm} 
                className="rounded-2xl h-14 px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-[0_10px_30px_rgba(var(--primary),0.3)] transition-all active:scale-[0.98]"
                disabled={isSubmitting || validCount === 0}
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  IMPORTAR AGORA <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
