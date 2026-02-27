import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkStage, CreateStageData } from '@/hooks/useWorkStages';
import { Save, Trash2, AlertCircle, List, PenLine, Loader2, FolderPlus, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery } from '@tanstack/react-query';
import { orionApi } from '@/integrations/orion/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StageFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage?: WorkStage | null;
    onSave: (data: CreateStageData, silent?: boolean) => Promise<{ success: boolean; stageId?: string }>;
    onDelete?: (stageId: string) => Promise<{ success: boolean }>;
    onSync?: () => Promise<{ success: boolean }>;
    onRefresh?: () => void;
    bulkCreateStages?: (items: CreateStageData[], silent?: boolean) => Promise<any>;
}

interface ProductionCategory {
    id: string;
    name: string;
    order: number;
    activities: { id: string; name: string; weight: number; order: number }[];
}

const DEFAULT_PRODUCTION_CATEGORIES: ProductionCategory[] = [
    {
        id: 'cat-pre',
        name: 'SERVIÇOS PRELIMINARES',
        order: 1,
        activities: [
            { id: 'act-croqui', name: 'Croqui de Acesso', weight: 1, order: 1 },
            { id: 'act-sonda', name: 'Sondagem', weight: 1, order: 2 },
            { id: 'act-passivo', name: 'Passivo Ambiental', weight: 1, order: 3 },
            { id: 'act-conf', name: 'Conferência de Perfil', weight: 1, order: 4 },
            { id: 'act-marc', name: 'Marcação de Cavas', weight: 1, order: 5 },
            { id: 'act-secao', name: 'Seção Diagonal', weight: 1, order: 6 },
            { id: 'act-veg-area', name: 'Supressão Vegetal (Área)', weight: 1, order: 7 },
            { id: 'act-veg-faixa', name: 'Supressão Vegetal (Faixa)', weight: 1, order: 8 },
            { id: 'act-veg-corte', name: 'Supressão Vegetal (Corte)', weight: 1, order: 9 },
            { id: 'act-acesso', name: 'Abertura de Acessos', weight: 2, order: 10 },
            { id: 'act-recup', name: 'Recuperação de Acesso', weight: 1, order: 11 },
        ]
    },
    {
        id: 'cat-fund',
        name: 'FUNDAÇÕES',
        order: 2,
        activities: [
            { id: 'act-esc', name: 'Escavação (Mastro/Pé)', weight: 3, order: 1 },
            { id: 'act-crav', name: 'Cravação de Estacas', weight: 3, order: 2 },
            { id: 'act-arm', name: 'Armação (Mastro/Pé)', weight: 2, order: 3 },
            { id: 'act-niv', name: 'Nivelamento / Preparação', weight: 2, order: 4 },
            { id: 'act-conc', name: 'Concretagem (Mastro/Pé)', weight: 5, order: 5 },
            { id: 'act-reat', name: 'Reaterro (Mastro/Pé)', weight: 2, order: 6 },
            { id: 'act-ensaio', name: 'Ensaio de Arrancamento', weight: 1, order: 7 },
            { id: 'act-fund100', name: 'Fundação 100%', weight: 1, order: 8 },
        ]
    },
    {
        id: 'cat-aterr',
        name: 'SISTEMAS DE ATERRAMENTO',
        order: 3,
        activities: [
            { id: 'act-contrap', name: 'Instalação Cabo Contrapeso', weight: 2, order: 1 },
            { id: 'act-resist', name: 'Medição de Resistência', weight: 1, order: 2 },
            { id: 'act-aterr-cerca', name: 'Aterramento de Cercas', weight: 1, order: 3 },
        ]
    },
    {
        id: 'cat-mont',
        name: 'MONTAGEM DE TORRES',
        order: 4,
        activities: [
            { id: 'act-distrib', name: 'Distribuição / Transporte', weight: 1, order: 1 },
            { id: 'act-pre-mont', name: 'Pré-montagem em Solo', weight: 3, order: 2 },
            { id: 'act-icamento', name: 'Montagem / Içamento', weight: 7, order: 3 },
            { id: 'act-rev', name: 'Revisão Final / Flambagem', weight: 1, order: 4 },
            { id: 'act-giro', name: 'Giro e Prumo', weight: 1, order: 5 },
        ]
    },

    {
        id: 'cat-cabos',
        name: 'LANÇAMENTO DE CABOS',
        order: 5,
        activities: [
            { id: 'act-cavaletes', name: 'Instalação de Cavaletes', weight: 1, order: 1 },
            { id: 'act-piloto', name: 'Lançamento de Cabo Piloto', weight: 2, order: 2 },
            { id: 'act-pararaios', name: 'Lançamento de Para-raios', weight: 3, order: 3 },
            { id: 'act-cadeias', name: 'Cadeias e Bandolas', weight: 2, order: 4 },
            { id: 'act-condutores', name: 'Lançamento de Condutores', weight: 10, order: 5 },
            { id: 'act-gramp', name: 'Nivelamento e Grampeação', weight: 3, order: 6 },
            { id: 'act-jumpers', name: 'Jumpers / Espaçadores', weight: 2, order: 7 },
            { id: 'act-esferas', name: 'Esferas de Sinalização', weight: 1, order: 8 },
            { id: 'act-defensas', name: 'Defensas de Estais', weight: 1, order: 9 },
            { id: 'act-entrega', name: 'Entrega Final / Comissionamento', weight: 1, order: 10 },
        ]
    }
];

export default function StageFormModal({ isOpen, onClose, stage, onSave, onDelete, onSync, onRefresh, bulkCreateStages }: StageFormModalProps) {
    const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [weight, setWeight] = useState('1.0');
    const [productionActivityId, setProductionActivityId] = useState<string>('none');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Import state
    const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
    const [selectedCategoriesOnly, setSelectedCategoriesOnly] = useState<Set<string>>(new Set()); // For Meta Mãe only
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const isEditMode = !!stage;

    // Fetch production activities
    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['production-categories'],
        queryFn: async () => {
            try {
                const res = await orionApi.get('/production/categories');
                const data = res.data as ProductionCategory[];
                // Se a API retornar vazio, use o padrão
                if (!data || data.length === 0) return DEFAULT_PRODUCTION_CATEGORIES;
                return data;
            } catch (error) {
                console.warn('Falha ao carregar categorias do backend, usando padrão local.', error);
                return DEFAULT_PRODUCTION_CATEGORIES;
            }
        },
        enabled: isOpen && activeTab === 'import',
        initialData: DEFAULT_PRODUCTION_CATEGORIES
    });

    useEffect(() => {
        if (stage) {
            setName(stage.name);
            setDescription(stage.description || '');
            setWeight(String(stage.weight));
            setProductionActivityId(stage.productionActivityId || 'none');
            setActiveTab('manual');
        } else {
            setName('');
            setDescription('');
            setWeight('1.0');
            setProductionActivityId('none');
            setSelectedActivities(new Set());
            setSelectedCategoriesOnly(new Set());
        }
        setError('');
    }, [stage, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('O nome da etapa é obrigatório.');
            return;
        }

        const weightNum = parseFloat(weight.replace(',', '.'));
        if (isNaN(weightNum) || weightNum <= 0 || weightNum > 1) {
            setError('O peso deve ser um número entre 0.01 e 1.0');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await onSave({
                name: name.trim(),
                description: description.trim() || undefined,
                weight: weightNum,
                productionActivityId: productionActivityId !== 'none' ? productionActivityId : null
            });

            if (result.success) {
                onClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImport = async () => {
        const hasActivities = selectedActivities.size > 0;
        const hasCategoriesOnly = selectedCategoriesOnly.size > 0;

        console.log('[Import] Iniciando importação...', { hasActivities, hasActivitiesCount: selectedActivities.size, hasCategoriesOnly });

        if (!hasActivities && !hasCategoriesOnly) {
            setError('Selecione pelo menos uma categoria ou atividade para importar.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const bulkData: any[] = [];

            for (const cat of categories || []) {
                const catActivities = cat.activities.filter(a => selectedActivities.has(a.id));
                const isParentRequested = selectedCategoriesOnly.has(cat.id) || catActivities.length > 0;

                if (!isParentRequested) continue;

                bulkData.push({
                    name: cat.name,
                    description: catActivities.length > 0
                        ? `Etapa principal com ${catActivities.length} sub-metas`
                        : `Meta principal`,
                    weight: 1.0,
                    displayOrder: cat.order,
                    children: catActivities.map(act => ({
                        name: act.name,
                        description: `Sub-meta de ${cat.name}`,
                        weight: Number(act.weight) || 1.0,
                        displayOrder: act.order,
                        productionActivityId: act.id
                    }))
                });
            }

            console.log(`[Import] Enviando ${bulkData.length} categorias para importação em lote...`);
            
            if (bulkCreateStages) {
                await bulkCreateStages(bulkData, true);
            } else {
                console.warn('[Import] hook bulkCreateStages não fornecido');
                // Fallback (não recomendado mas para segurança)
                for (const item of bulkData) {
                    const res = await onSave(item, true);
                    if (item.children) {
                        for (const child of item.children) {
                            await onSave({ ...child, parentId: res.stageId }, true);
                        }
                    }
                }
            }

            console.log('[Import] Processo concluído com sucesso.');
            if (onSync) {
                await onSync();
            } else {
                onRefresh?.();
            }
            onClose();
        } catch (err: any) {
            console.error('[Import] Erro fatal durante a importação:', err);
            setError(err.message || 'Erro ao importar etapas');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!stage || !onDelete) return;
        setIsSubmitting(true);
        try {
            const result = await onDelete(stage.id);
            if (result.success) {
                onClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleActivity = (activityId: string, categoryId: string) => {
        const newSet = new Set(selectedActivities);
        if (newSet.has(activityId)) {
            newSet.delete(activityId);
        } else {
            newSet.add(activityId);
            // If adding an activity, remove category-only selection
            const newCatSet = new Set(selectedCategoriesOnly);
            newCatSet.delete(categoryId);
            setSelectedCategoriesOnly(newCatSet);
        }
        setSelectedActivities(newSet);
    };

    const toggleCategory = (categoryId: string) => {
        const category = categories?.find(c => c.id === categoryId);
        if (!category) return;

        const selectedCount = category.activities.filter(a => selectedActivities.has(a.id)).length;
        const isManuallySelected = selectedCategoriesOnly.has(categoryId);
        const isActive = selectedCount > 0 || isManuallySelected;

        const newActSet = new Set(selectedActivities);
        const newCatSet = new Set(selectedCategoriesOnly);

        if (isActive) {
            // Unselect everything in this category
            category.activities.forEach(a => newActSet.delete(a.id));
            newCatSet.delete(categoryId);
        } else {
            // Select all activities in this category
            category.activities.forEach(a => newActSet.add(a.id));
            newCatSet.add(categoryId);
        }

        setSelectedActivities(newActSet);
        setSelectedCategoriesOnly(newCatSet);
    };



    const toggleExpandCategory = (categoryId: string) => {
        const newSet = new Set(expandedCategories);
        if (newSet.has(categoryId)) {
            newSet.delete(categoryId);
        } else {
            newSet.add(categoryId);
        }
        setExpandedCategories(newSet);
    };

    const selectNone = () => {
        setSelectedActivities(new Set());
        setSelectedCategoriesOnly(new Set());
    };

    const getImportCount = () => {
        const categoriesToBeImported = new Set<string>();

        // Count categories that have activities selected
        categories?.forEach(cat => {
            if (cat.activities.some(a => selectedActivities.has(a.id)) || selectedCategoriesOnly.has(cat.id)) {
                categoriesToBeImported.add(cat.id);
            }
        });

        // Count items: Parents + Children
        return categoriesToBeImported.size + selectedActivities.size;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-950 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-amber-500">
                        {isEditMode ? 'Editar Etapa' : 'Nova Etapa de Obra'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        {isEditMode ? 'Atualize os dados da etapa.' : 'Adicione uma nova etapa ou importe das atividades de produção.'}
                    </DialogDescription>
                </DialogHeader>

                {!isEditMode && (
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'import')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-900">
                            <TabsTrigger value="manual" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500">
                                <PenLine className="h-4 w-4 mr-2" />
                                Manual
                            </TabsTrigger>
                            <TabsTrigger value="import" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500">
                                <List className="h-4 w-4 mr-2" />
                                Importar Atividades
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}

                <div className="flex-1 overflow-y-auto py-4">
                    {error && (
                        <div className="bg-rose-950/30 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-sm flex items-center gap-2 mb-4">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {(activeTab === 'manual' || isEditMode) && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs uppercase font-bold tracking-wider text-slate-400">
                                    Nome da Etapa *
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Fundação, Montagem, Lançamento..."
                                    className="bg-black/40 border-slate-700"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-xs uppercase font-bold tracking-wider text-slate-400">
                                    Descrição
                                </Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descrição detalhada da etapa (opcional)"
                                    className="bg-black/40 border-slate-700 min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="weight" className="text-xs uppercase font-bold tracking-wider text-slate-400">
                                    Peso na Obra (0.01 a 1.0)
                                </Label>
                                <Input
                                    id="weight"
                                    type="text"
                                    inputMode="decimal"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="Ex: 0.25 (25% do peso total)"
                                    className="bg-black/40 border-slate-700 w-32"
                                />
                                <p className="text-[10px] text-slate-500">
                                    O peso define a importância relativa desta etapa no cálculo do avanço físico geral.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="activityLink" className="text-xs uppercase font-bold tracking-wider text-slate-400">
                                    Vincular à Atividade de Produção
                                </Label>
                                <Select value={productionActivityId} onValueChange={setProductionActivityId}>
                                    <SelectTrigger className="bg-black/40 border-slate-700">
                                        <div className="flex items-center gap-2">
                                            {productionActivityId !== 'none' && <Zap className="h-3 w-3 text-amber-500 fill-amber-500/20" />}
                                            <SelectValue placeholder="Selecione uma atividade para vincular automático" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        <SelectItem value="none">-- Sem Vínculo Automático --</SelectItem>
                                        {categories?.map((cat) => (
                                            <SelectGroup key={cat.id}>
                                                <SelectLabel className="text-amber-500 font-bold px-2 py-1.5 text-xs uppercase tracking-wider bg-slate-900/50">
                                                    {cat.name}
                                                </SelectLabel>
                                                {cat.activities.map((act) => (
                                                    <SelectItem key={act.id} value={act.id} className="pl-6 text-sm">
                                                        {act.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-emerald-500/80">
                                    Ao vincular, o avanço desta etapa será atualizado automaticamente quando a produção for apontada.
                                </p>
                            </div>
                        </form>
                    )}

                    {activeTab === 'import' && !isEditMode && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">
                                        Selecione as categorias e atividades:
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        <FolderPlus className="h-3 w-3 inline mr-1" />
                                        Marque só a categoria = Meta Mãe | Marque atividades = Meta Mãe + Sub-metas
                                    </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs">
                                    Limpar
                                </Button>
                            </div>

                            {loadingCategories ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                                    {categories?.map(category => {
                                        const selectedCount = category.activities.filter(a => selectedActivities.has(a.id)).length;
                                        const isCategoryOnly = selectedCategoriesOnly.has(category.id);
                                        const isExpanded = expandedCategories.has(category.id);
                                        const hasAnySelection = selectedCount > 0 || isCategoryOnly;

                                        return (
                                            <div key={category.id} className={`bg-slate-900/50 rounded-lg border transition-all ${hasAnySelection ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800'
                                                }`}>
                                                {/* Category Header */}
                                                <div className="flex items-center gap-2 p-3">
                                                    {/* Expand/Collapse */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => toggleExpandCategory(category.id)}
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-slate-500" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                                        )}
                                                    </Button>

                                                    {/* Category Only Checkbox */}
                                                    <div
                                                        className="flex items-center gap-2 cursor-pointer"
                                                        onClick={() => toggleCategory(category.id)}
                                                    >
                                                        <Checkbox
                                                            checked={hasAnySelection}
                                                            className="border-amber-500 data-[state=checked]:bg-amber-500"
                                                        />
                                                    </div>

                                                    {/* Category Name */}
                                                    <span
                                                        className="font-bold text-sm text-amber-500 uppercase tracking-wider flex-1 cursor-pointer"
                                                        onClick={() => toggleExpandCategory(category.id)}
                                                    >
                                                        {category.name}
                                                    </span>

                                                    {/* Selection indicator */}
                                                    {isCategoryOnly && (
                                                        <Badge className="bg-amber-500/20 text-amber-400 text-[9px]">
                                                            Só Meta Mãe
                                                        </Badge>
                                                    )}
                                                    {selectedCount > 0 && (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">
                                                            {selectedCount} sub-metas
                                                        </Badge>
                                                    )}

                                                    {/* Select All Activities Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-[10px] h-6 px-2"
                                                        onClick={() => toggleCategory(category.id)}
                                                    >
                                                        {hasAnySelection ? 'Limpar' : 'Todas'}
                                                    </Button>
                                                </div>

                                                {/* Activities List */}
                                                {isExpanded && (
                                                    <div className="px-3 pb-3 pt-0 border-t border-slate-800/50">
                                                        <div className="grid grid-cols-2 gap-1 mt-2">
                                                            {category.activities.map(activity => (
                                                                <label
                                                                    key={activity.id}
                                                                    className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white p-1.5 rounded hover:bg-slate-800/50"
                                                                >
                                                                    <Checkbox
                                                                        checked={selectedActivities.has(activity.id)}
                                                                        onCheckedChange={() => toggleActivity(activity.id, category.id)}
                                                                    />
                                                                    <span className="truncate">{activity.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {getImportCount() > 0 && (
                                <p className="text-xs text-amber-500 font-medium">
                                    {getImportCount()} item(s) selecionado(s) para importar
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center justify-between border-t border-slate-800 pt-4">
                    {isEditMode && onDelete ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" className="text-rose-500 hover:bg-rose-950/30 hover:text-rose-400">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-950 border-slate-800">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-rose-500">Excluir Etapa</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza que deseja excluir a etapa "{stage?.name}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="border-slate-700">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        className="bg-rose-600 hover:bg-rose-700"
                                    >
                                        Sim, Excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : (
                        <div />
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="border-slate-700 hover:bg-slate-800">
                            Cancelar
                        </Button>

                        {activeTab === 'manual' || isEditMode ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isSubmitting ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Criar Etapa')}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleImport}
                                disabled={isSubmitting || getImportCount() === 0}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            >
                                <List className="h-4 w-4 mr-2" />
                                {isSubmitting ? 'Importando...' : `Importar ${getImportCount()} Item(s)`}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
