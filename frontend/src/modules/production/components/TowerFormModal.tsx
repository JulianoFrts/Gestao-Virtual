import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { orionApi } from "@/integrations/orion/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TowerProductionData } from "../types";

interface TowerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    tower?: TowerProductionData | null;
}

const TowerFormModal = ({
    isOpen,
    onClose,
    projectId,
    tower,
}: TowerFormModalProps) => {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        objectId: "",
        trecho: "",
        towerType: "Autoportante",
        tipoFundacao: "",
        totalConcreto: "",
        pesoArmacao: "",
        pesoEstrutura: "",
        tramoLancamento: "",
        tipificacaoEstrutura: "",
        goForward: "",
        technicalKm: "",
        objectSeq: "",
    });

    useEffect(() => {
        if (tower) {
            setFormData({
                objectId: tower.objectId || "",
                trecho: tower.trecho || "",
                towerType: tower.towerType || "Autoportante",
                tipoFundacao: tower.tipoFundacao || "",
                totalConcreto: tower.totalConcreto?.toString() || "",
                pesoArmacao: tower.pesoArmacao?.toString() || "",
                pesoEstrutura: tower.pesoEstrutura?.toString() || "",
                tramoLancamento: tower.tramoLancamento || "",
                tipificacaoEstrutura: tower.tipificacaoEstrutura || "",
                goForward: (tower as any).goForward?.toString() || "",
                technicalKm: (tower as any).technicalKm?.toString() || "",
                objectSeq: tower.objectSeq?.toString() || "",
            });
        } else {
            setFormData({
                objectId: "",
                trecho: "",
                towerType: "Autoportante",
                tipoFundacao: "",
                totalConcreto: "",
                pesoArmacao: "",
                pesoEstrutura: "",
                tramoLancamento: "",
                tipificacaoEstrutura: "",
                goForward: "",
                technicalKm: "",
                objectSeq: "",
            });
        }
    }, [tower, isOpen]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const normalizedObjectId = formData.objectId.replace(/^(Torre|TORRE)\s+/i, "").trim();
            const payload = {
                projectId,
                id: tower?.id,
                objectId: normalizedObjectId,
                metadata: {
                    towerType: formData.towerType,
                    trecho: formData.trecho,
                    tipoFundacao: formData.tipoFundacao,
                    totalConcreto: formData.totalConcreto ? parseFloat(formData.totalConcreto) : null,
                    pesoArmacao: formData.pesoArmacao ? parseFloat(formData.pesoArmacao) : null,
                    pesoEstrutura: formData.pesoEstrutura ? parseFloat(formData.pesoEstrutura) : null,
                    tramoLancamento: formData.tramoLancamento,
                    tipificacaoEstrutura: formData.tipificacaoEstrutura,
                    goForward: formData.goForward ? parseFloat(formData.goForward) : null,
                    technicalKm: formData.technicalKm ? parseFloat(formData.technicalKm) : null,
                    objectSeq: formData.objectSeq ? parseInt(formData.objectSeq) : 0,
                }
            };

            const response = await orionApi.post("/map_elements", [{ ...payload, type: 'TOWER' }]);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-towers"] });
            toast.success(tower ? "Torre atualizada com sucesso" : "Torre adicionada com sucesso");
            onClose();
        },
        onError: (error: any) => {
            toast.error("Erro ao salvar torre: " + (error.response?.data?.message || error.message));
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{tower ? "Editar Torre" : "Adicionar Nova Torre"}</DialogTitle>
                    <DialogDescription>
                        {tower ? "Atualize os detalhes técnicos desta torre." : "Preencha as informações técnicas para cadastrar uma nova torre."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="objectId">Número da Torre (ID)</Label>
                            <Input
                                id="objectId"
                                name="objectId"
                                value={formData.objectId}
                                onChange={handleChange}
                                placeholder="ex: 0/1"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="trecho">Trecho</Label>
                            <Input
                                id="trecho"
                                name="trecho"
                                value={formData.trecho}
                                onChange={handleChange}
                                placeholder="ex: L1"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="objectSeq">Sequência</Label>
                            <Input
                                id="objectSeq"
                                name="objectSeq"
                                type="number"
                                value={formData.objectSeq}
                                onChange={handleChange}
                                placeholder="ex: 1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="towerType">Tipo de Torre</Label>
                            <Select
                                value={formData.towerType}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, towerType: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Autoportante">Autoportante</SelectItem>
                                    <SelectItem value="Estaiada">Estaiada</SelectItem>
                                    <SelectItem value="Pórtico">Pórtico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tipoFundacao">Tipo de Fundação</Label>
                            <Input
                                id="tipoFundacao"
                                name="tipoFundacao"
                                value={formData.tipoFundacao}
                                onChange={handleChange}
                                placeholder="ex: Grelha"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="totalConcreto">Concreto (m³)</Label>
                            <Input
                                id="totalConcreto"
                                name="totalConcreto"
                                type="number"
                                step="0.01"
                                value={formData.totalConcreto}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pesoArmacao">Armação (ton)</Label>
                            <Input
                                id="pesoArmacao"
                                name="pesoArmacao"
                                type="number"
                                step="0.001"
                                value={formData.pesoArmacao}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pesoEstrutura">Estrutura (ton)</Label>
                            <Input
                                id="pesoEstrutura"
                                name="pesoEstrutura"
                                type="number"
                                step="0.001"
                                value={formData.pesoEstrutura}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="tramoLancamento">Tramo de Lançamento</Label>
                            <Input
                                id="tramoLancamento"
                                name="tramoLancamento"
                                value={formData.tramoLancamento}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tipificacaoEstrutura">Tipificação</Label>
                            <Input
                                id="tipificacaoEstrutura"
                                name="tipificacaoEstrutura"
                                value={formData.tipificacaoEstrutura}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="goForward">Vão Vante (m)</Label>
                            <Input
                                id="goForward"
                                name="goForward"
                                type="number"
                                step="0.001"
                                value={formData.goForward}
                                onChange={handleChange}
                                placeholder="ex: 450"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="technicalKm">KM Técnico</Label>
                            <Input
                                id="technicalKm"
                                name="technicalKm"
                                type="number"
                                step="0.001"
                                value={formData.technicalKm}
                                onChange={handleChange}
                                placeholder="ex: 12.450"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        {saveMutation.isPending && (
                            <Loader2 key="loader-icon" className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {tower ? "Salvar Alterações" : "Criar Torre"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TowerFormModal;
