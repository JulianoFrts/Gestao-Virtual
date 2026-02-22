import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { orionApi } from "@/integrations/orion/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface TowerActivityGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    companyId: string;
    editingGoal: any | null;
    parentId: string | null;
}

const TowerActivityGoalModal = ({ 
    isOpen, 
    onClose, 
    projectId, 
    companyId, 
    editingGoal, 
    parentId 
}: TowerActivityGoalModalProps) => {
    const queryClient = useQueryClient();
    const { register, handleSubmit, reset, setValue } = useForm({
        defaultValues: {
            name: "",
            description: "",
            order: 0,
        }
    });

    useEffect(() => {
        if (editingGoal) {
            reset({
                name: editingGoal.name,
                description: editingGoal.description || "",
                order: editingGoal.order || 0,
            });
        } else {
            reset({
                name: "",
                description: "",
                order: 0,
            });
        }
    }, [editingGoal, reset]);

    const onSubmit = async (data: any) => {
        try {
            const payload = {
                ...data,
                id: editingGoal?.id,
                projectId,
                companyId,
                parentId: editingGoal ? editingGoal.parentId : parentId,
                level: editingGoal ? editingGoal.level : (parentId ? undefined : 1), // Backend handles level calculation
                single: true
            };

            await orionApi.post("/tower-activity-goals", payload);
            toast.success(editingGoal ? "Atividade atualizada" : "Atividade criada");
            queryClient.invalidateQueries({ queryKey: ["tower-activity-goals"] });
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar atividade");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[#0c0a09] border-primary/20">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tighter italic text-primary">
                        {editingGoal ? "Editar Atividade" : "Nova Atividade"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome da Atividade</Label>
                        <Input 
                            id="name" 
                            {...register("name", { required: true })} 
                            className="bg-black/40 border-primary/10 focus:border-primary/40 h-11"
                            placeholder="Ex: Montagem de Torre"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição (Opcional)</Label>
                        <Textarea 
                            id="description" 
                            {...register("description")} 
                            className="bg-black/40 border-primary/10 focus:border-primary/40 min-h-[100px]"
                            placeholder="Detalhes técnicos da meta..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="order" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ordem de Exibição</Label>
                            <Input 
                                id="order" 
                                type="number" 
                                {...register("order", { valueAsNumber: true })} 
                                className="bg-black/40 border-primary/10 focus:border-primary/40 h-11"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-6">
                        <Button type="button" variant="ghost" onClick={onClose} className="uppercase text-[10px] font-bold tracking-widest">
                            Cancelar
                        </Button>
                        <Button type="submit" className="gradient-primary uppercase text-[10px] font-black tracking-widest px-8">
                            Salvar Atividade
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default TowerActivityGoalModal;
