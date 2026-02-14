import React, { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orionApi } from "@/integrations/orion/client";
import { kpiService } from "@/services/kpiService";
import { ProductionCategory } from "../types";
import { toast } from "sonner";
import { DollarSign, Save, AlertCircle } from "lucide-react";

// Common measurement units for construction activities
const UNIT_OPTIONS = [
    { value: 'UN', label: 'UN (Unidade)' },
    { value: 'M³', label: 'M³ (Metro Cúbico)' },
    { value: 'M²', label: 'M² (Metro Quadrado)' },
    { value: 'M', label: 'M (Metro Linear)' },
    { value: 'KG', label: 'KG (Quilograma)' },
    { value: 'TON', label: 'TON (Tonelada)' },
    { value: 'L', label: 'L (Litro)' },
    { value: 'VB', label: 'VB (Verba)' },
    { value: 'CJ', label: 'CJ (Conjunto)' },
    { value: 'PC', label: 'PC (Peça)' },
    { value: 'HR', label: 'HR (Hora)' },
    { value: 'DIA', label: 'DIA (Diária)' },
    { value: 'KM', label: 'KM (Quilômetro)' },
    { value: 'HA', label: 'HA (Hectare)' },
];

interface CostConfigurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
}

// Utility: Format number to Brazilian currency string (display only)
const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

// Utility: Format number to Brazilian locale (without currency symbol)
const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};

// Utility: Parse Brazilian currency string to number
const parseCurrencyInput = (value: string): number => {
    // Remove currency symbol, spaces, and replace Brazilian decimal separator
    const cleaned = value
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '') // Remove thousand separators
        .replace(',', '.'); // Convert decimal separator

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

// Utility: Format input as user types (Brazilian format)
const formatInputAsCurrency = (value: string): string => {
    // Remove non-numeric characters except comma
    let cleaned = value.replace(/[^\d,]/g, '');

    // Ensure only one comma
    const parts = cleaned.split(',');
    if (parts.length > 2) {
        cleaned = parts[0] + ',' + parts.slice(1).join('');
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
        cleaned = parts[0] + ',' + parts[1].substring(0, 2);
    }

    // Add thousand separators to integer part
    if (parts[0]) {
        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        cleaned = parts.length === 2 ? intPart + ',' + parts[1] : intPart;
    }

    return cleaned;
};

export default function CostConfigurationModal({ isOpen, onClose, projectId }: CostConfigurationModalProps) {
    const queryClient = useQueryClient();
    const [localCosts, setLocalCosts] = useState<Record<string, { displayPrice: string, unit: string }>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch Categories (Activities)
    const { data: categories } = useQuery({
        queryKey: ["production-categories"],
        queryFn: async () => {
            const res = await orionApi.get("/production/categories");
            return res.data as ProductionCategory[];
        },
        enabled: isOpen
    });

    // Fetch Existing Costs
    const { data: existingCosts } = useQuery({
        queryKey: ["unit-costs", projectId],
        queryFn: () => kpiService.getUnitCosts(projectId),
        enabled: isOpen && !!projectId
    });

    // Initialize state with formatted values
    useEffect(() => {
        if (existingCosts && existingCosts.length > 0) {
            const map: Record<string, { displayPrice: string, unit: string }> = {};
            existingCosts.forEach((c: any) => {
                const numValue = Number(c.unitPrice);
                map[c.activityId] = {
                    displayPrice: formatNumber(numValue),
                    unit: c.measureUnit
                };
            });
            setLocalCosts(map);
        }
    }, [existingCosts]);

    const handlePriceChange = useCallback((activityId: string, rawValue: string) => {
        const formatted = formatInputAsCurrency(rawValue);

        setLocalCosts(prev => ({
            ...prev,
            [activityId]: {
                ...prev[activityId] || { displayPrice: '0,00', unit: 'UN' },
                displayPrice: formatted
            }
        }));

        // Clear error if value is valid
        const numValue = parseCurrencyInput(formatted);
        if (numValue >= 0) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[activityId];
                return newErrors;
            });
        }
    }, []);

    const handleUnitChange = useCallback((activityId: string, value: string) => {
        setLocalCosts(prev => ({
            ...prev,
            [activityId]: {
                ...prev[activityId] || { displayPrice: '0,00', unit: 'UN' },
                unit: value.toUpperCase()
            }
        }));
    }, []);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        Object.entries(localCosts).forEach(([activityId, data]) => {
            const numValue = parseCurrencyInput(data.displayPrice);
            if (numValue < 0) {
                newErrors[activityId] = 'Valor inválido';
            }
            if (!data.unit || data.unit.trim() === '') {
                newErrors[activityId] = 'Unidade obrigatória';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const mutation = useMutation({
        mutationFn: async () => {
            if (!validateForm()) {
                throw new Error('Validação falhou');
            }

            const costsToSave = Object.entries(localCosts)
                .filter(([_, data]) => parseCurrencyInput(data.displayPrice) > 0)
                .map(([activityId, data]) => ({
                    activityId,
                    unitPrice: parseCurrencyInput(data.displayPrice),
                    measureUnit: data.unit.toUpperCase().trim()
                }));

            await kpiService.saveUnitCosts(projectId, costsToSave);
        },
        onSuccess: () => {
            toast.success("Custos atualizados com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["unit-costs", projectId] });
            onClose();
        },
        onError: (error: any) => {
            if (error.message !== 'Validação falhou') {
                toast.error("Erro ao salvar custos.");
            }
        }
    });

    const getTotalConfigured = () => {
        return Object.values(localCosts).filter(c => parseCurrencyInput(c.displayPrice) > 0).length;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader className="border-b border-slate-800 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-500">
                        <DollarSign className="h-6 w-6" />
                        Configuração de Custos Unitários
                    </DialogTitle>
                    <p className="text-xs text-slate-500 mt-1">
                        Defina o preço por unidade para cada atividade. Use formato brasileiro (ex: 1.500,00)
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {categories?.map((category) => (
                        <div key={category.id} className="space-y-3">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                {category.name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {category.activities.map((activity) => {
                                    const cost = localCosts[activity.id] || { displayPrice: '0,00', unit: 'UN' };
                                    const hasError = !!errors[activity.id];

                                    return (
                                        <div
                                            key={activity.id}
                                            className={`bg-slate-900/50 p-3 rounded-lg border transition-colors ${hasError
                                                ? 'border-rose-500/50 bg-rose-950/20'
                                                : parseCurrencyInput(cost.displayPrice) > 0
                                                    ? 'border-emerald-500/30 bg-emerald-950/10'
                                                    : 'border-slate-800 hover:border-amber-500/30'
                                                }`}
                                        >
                                            <Label
                                                className="text-xs font-bold text-slate-300 mb-2 block truncate"
                                                title={activity.name}
                                            >
                                                {activity.name}
                                            </Label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-bold">R$</span>
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className={`pl-8 h-9 text-sm bg-black/40 border-slate-700 text-right font-mono ${hasError ? 'border-rose-500 focus:ring-rose-500' : ''
                                                            }`}
                                                        value={cost.displayPrice}
                                                        onChange={(e) => handlePriceChange(activity.id, e.target.value)}
                                                        placeholder="0,00"
                                                    />
                                                </div>
                                                <div className="w-24">
                                                    <Select
                                                        value={cost.unit}
                                                        onValueChange={(value) => handleUnitChange(activity.id, value)}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs bg-black/40 border-slate-700 uppercase font-bold">
                                                            <SelectValue placeholder="UN" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-[200px]">
                                                            {UNIT_OPTIONS.map(opt => (
                                                                <SelectItem
                                                                    key={opt.value}
                                                                    value={opt.value}
                                                                    className="text-xs"
                                                                >
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            {hasError && (
                                                <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    {errors[activity.id]}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="border-t border-slate-800 pt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        {getTotalConfigured()} atividades com custo definido
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="border-slate-700 hover:bg-slate-800">
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => mutation.mutate()}
                            disabled={mutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {mutation.isPending ? "Salvando..." : "Salvar Configurações"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
