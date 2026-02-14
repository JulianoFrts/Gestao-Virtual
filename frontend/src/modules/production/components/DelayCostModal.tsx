import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orionApi } from "@/integrations/orion/client";
import { Loader2, DollarSign, Plus, Trash2, AlertCircle } from "lucide-react";
import { ImpedimentType } from "../types";

interface DelayCostModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

interface DelayReason {
    id: string;
    code: string;
    description: string;
    dailyCost: number;
    category: ImpedimentType;
}

const DelayCostModal = ({ isOpen, onClose, projectId }: DelayCostModalProps) => {
    const queryClient = useQueryClient();
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");
    const [dailyCost, setDailyCost] = useState("");
    const [category, setCategory] = useState<ImpedimentType>("NONE");

    const { data: reasons = [], isLoading } = useQuery({
        queryKey: ["delay-reasons", projectId],
        queryFn: async () => {
            if (!projectId || projectId === 'all') return [];
            const response = await orionApi.get(`/production/delay-reasons?projectId=${projectId}`);
            return response.data as DelayReason[];
        },
        enabled: isOpen && projectId !== 'all'
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!code || !description || !dailyCost) throw new Error("Preencha todos os campos");

            await orionApi.post(`/production/delay-reasons?projectId=${projectId}`, {
                code,
                description,
                dailyCost: parseFloat(dailyCost),
                category
            });
        },
        onSuccess: () => {
            toast.success("Motivo adicionado");
            queryClient.invalidateQueries({ queryKey: ["delay-reasons"] });
            setCode("");
            setDescription("");
            setDailyCost("");
            setCategory("NONE");
        },
        onError: (err: any) => toast.error("Erro ao adicionar: " + err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await orionApi.delete(`/production/delay-reasons?id=${id}`);
        },
        onSuccess: () => {
            toast.success("Motivo removido");
            queryClient.invalidateQueries({ queryKey: ["delay-reasons"] });
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] bg-[#0a0806] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-500">
                        <DollarSign className="h-5 w-5" />
                        Catálogo de Custos de Atraso
                    </DialogTitle>
                    <DialogDescription className="text-white/50">
                        Cadastre os motivos de impedimento e seus respectivos custos diários para esta obra.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Form de Cadastro */}
                    <div className="grid grid-cols-12 gap-3 p-3 rounded-lg bg-white/5 border border-white/10 items-end">
                        <div className="col-span-2">
                            <Label className="text-[10px] uppercase font-bold text-amber-500/80">Código</Label>
                            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: CHUVA" className="h-8 bg-black/40 border-white/10 text-xs" />
                        </div>
                        <div className="col-span-4">
                            <Label className="text-[10px] uppercase font-bold text-amber-500/80">Descrição</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição detalhada" className="h-8 bg-black/40 border-white/10 text-xs" />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-[10px] uppercase font-bold text-amber-500/80">Categoria</Label>
                            <Select value={category} onValueChange={(v: ImpedimentType) => setCategory(v)}>
                                <SelectTrigger className="h-8 bg-black/40 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800">
                                    <SelectItem value="NONE">Nenhum</SelectItem>
                                    <SelectItem value="OWNER">Proprietário</SelectItem>
                                    <SelectItem value="CONTRACTOR">Empreiteira</SelectItem>
                                    <SelectItem value="PROJECT">Projeto</SelectItem>
                                    <SelectItem value="WORK">Obra/Clima</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label className="text-[10px] uppercase font-bold text-amber-500/80">Custo/Dia (R$)</Label>
                            <Input type="number" value={dailyCost} onChange={e => setDailyCost(e.target.value)} placeholder="0.00" className="h-8 bg-black/40 border-white/10 text-xs" />
                        </div>
                        <div className="col-span-2">
                            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full h-8 bg-amber-600 hover:bg-amber-500 font-bold text-xs">
                                <Plus className="h-3 w-3 mr-1" /> Adicionar
                            </Button>
                        </div>
                    </div>

                    {/* Lista */}
                    <div className="border border-white/10 rounded-lg overflow-hidden">
                        <div className="grid grid-cols-12 bg-white/5 p-2 text-[10px] font-bold uppercase text-white/50 border-b border-white/10">
                            <div className="col-span-2">Código</div>
                            <div className="col-span-4">Descrição</div>
                            <div className="col-span-2">Categoria</div>
                            <div className="col-span-2 text-right">Custo Diário</div>
                            <div className="col-span-2 text-center">Ações</div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 text-center text-white/30"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                            ) : reasons.length === 0 ? (
                                <div className="p-8 text-center text-white/30 flex flex-col items-center gap-2">
                                    <AlertCircle className="h-8 w-8 opacity-20" />
                                    Nenhum motivo cadastrado.
                                </div>
                            ) : (
                                reasons.map((r) => (
                                    <div key={r.id} className="grid grid-cols-12 p-2 text-xs border-b border-white/5 hover:bg-white/5 items-center transition-colors">
                                        <div className="col-span-2 font-mono text-amber-500">{r.code}</div>
                                        <div className="col-span-4 truncate" title={r.description}>{r.description}</div>
                                        <div className="col-span-2">
                                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/70">{r.category}</span>
                                        </div>
                                        <div className="col-span-2 text-right font-mono text-green-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.dailyCost)}
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                onClick={() => deleteMutation.mutate(r.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} className="text-white/50 hover:text-white">Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DelayCostModal;
