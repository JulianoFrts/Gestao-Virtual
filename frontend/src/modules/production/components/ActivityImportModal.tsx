import React, { useState, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Download
} from 'lucide-react';
import { ActivityImportService, RawActivityImportItem } from '@/services/import/ActivityImportService';
import { orionApi } from '@/integrations/orion/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { utils, writeFile } from "xlsx";

interface ActivityImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

const ActivityImportModal = ({
  isOpen,
  onClose,
  projectId
}: ActivityImportModalProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<RawActivityImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(term));
  }, [items, searchTerm]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const parsedItems = await ActivityImportService.parseFile(file);
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
          Atividade: "Escavação Mecânica",
          Nivel: 1,
          Ordem: 1,
          Descricao: "Escavação das fundações",
          VinculoTorre: ""
      },
      {
          Atividade: "Concretagem",
          Nivel: 1,
          Ordem: 2,
          Descricao: "Lançamento de concreto",
          VinculoTorre: ""
      }
    ];
    const ws = utils.json_to_sheet(template);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Modelo Atividades");
    writeFile(wb, "Modelo_Importacao_Atividades.xlsx");
  };

  const handleConfirm = async () => {
    const validItems = items.filter(i => i.status !== 'invalid');
    if (validItems.length === 0) {
      toast({ title: 'Nenhum item válido para importar', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await orionApi.post('/tower-activity-goals', {
        projectId,
        companyId: profile?.companyId,
        data: validItems
      });

      if (res.error) throw new Error(res.error.message);
      
      toast({ title: 'Importação concluída', description: `${validItems.length} atividades importadas.` });
      setItems([]);
      onClose();
    } catch (err: any) {
      toast({ title: 'Erro na importação', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !isSubmitting && !val && onClose()}>
      <DialogContent className="max-w-6xl bg-[#0c0c0e] border-white/10 p-0 overflow-hidden rounded-4xl shadow-2xl backdrop-blur-xl">
        <div className="p-8 border-b border-white/5 bg-linear-to-br from-primary/5 to-transparent">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20">
                <FileUp className="text-primary w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                  Importação de Atividades & Metas
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Assistente de importação para configurar a EAP e metas de produção das torres.
                </DialogDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-9 border-white/10 hover:bg-white/5 text-[10px] uppercase font-black">
                <Download className="w-3.5 h-3.5 mr-2" />
                Template CSV/XLSX
            </Button>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-8 space-y-8">
            {items.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer border-2 border-dashed border-white/5 hover:border-primary/40 rounded-4xl p-20 transition-all hover:bg-primary/5 flex flex-col items-center justify-center gap-6"
              >
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500 shadow-premium">
                  {isProcessing ? <Loader2 className="w-12 h-12 animate-spin text-primary" /> : <FileUp className="w-12 h-12 text-slate-500 group-hover:text-primary" />}
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white group-hover:text-primary transition-colors">Arraste seu arquivo ou clique para selecionar</p>
                  <p className="text-sm text-slate-500 font-medium tracking-wide mt-2">Suporte a CSV, XLSX e XLS</p>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      placeholder="Buscar por atividade..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 bg-white/5 border-white/10 rounded-2xl"
                    />
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-2xl border border-white/5">
                    <span className="text-xs font-bold text-slate-500">{items.length} Itens detectados</span>
                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-400 font-black text-[10px] uppercase" onClick={() => setItems([])}>Resetar</Button>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 overflow-hidden bg-black/40">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/10">
                        <TableHead className="w-16 text-center">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Atividade</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Nível</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Ordem</TableHead>
                        <TableHead className="text-[10px] font-black uppercase pr-10">Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.slice(0, 100).map((item, idx) => (
                        <TableRow key={idx} className={cn("border-white/5", item.status === 'invalid' ? 'bg-rose-500/5' : 'hover:bg-white/5')}>
                          <TableCell className="text-center">
                            {item.status === 'valid' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-rose-500 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-white uppercase italic">{item.name}</TableCell>
                          <TableCell className="text-center text-slate-300 font-mono">{item.level}</TableCell>
                          <TableCell className="text-center text-slate-300 font-mono">{item.order}</TableCell>
                          <TableCell className="text-xs text-slate-500 pr-10">{item.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {items.length > 0 && (
          <div className="p-8 border-t border-white/5 flex gap-4 justify-end bg-black/60">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-2xl h-12 px-8 font-black text-slate-500 uppercase tracking-widest text-[10px]">CANCELAR</Button>
            <Button 
              onClick={handleConfirm} 
              className="rounded-2xl h-12 px-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs shadow-glow flex gap-3"
              disabled={isSubmitting || items.filter(i => i.status === 'valid').length === 0}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>CONFIRMAR IMPORTAÇÃO <ArrowRight className="w-5 h-5" /></>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ActivityImportModal;
