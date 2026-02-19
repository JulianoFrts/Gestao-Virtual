import React, { useState, useMemo } from 'react';
import { useWorkStages, WorkStage, CreateStageData } from '@/hooks/useWorkStages';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Plus, Edit2, MoreVertical, Trash2, GripVertical, AlertTriangle, ChevronDown, ChevronRight, Zap, Combine, Loader2 } from 'lucide-react';
import StageFormModal from './StageFormModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface GAPOProgressTrackerProps {
    siteId?: string;
    projectId?: string;
}

interface StageWithChildren extends WorkStage {
    children: StageWithChildren[];
}

export default function GAPOProgressTracker({ siteId, projectId }: GAPOProgressTrackerProps) {
    const { stages, isLoading, createStage, updateStage, deleteStage, deleteAllStages, reorderStages, syncStages, refresh } = useWorkStages(siteId || 'all', projectId);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<WorkStage | null>(null);
    const [parentIdForNew, setParentIdForNew] = useState<string | null>(null);
    const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Build hierarchy from flat list
    const hierarchicalStages = useMemo(() => {
        const stageMap = new Map<string, StageWithChildren>();
        const rootStages: StageWithChildren[] = [];

        // First pass: create all nodes
        stages.forEach(stage => {
            // Use progress directly from backend (already aggregated by WorkStageSyncService)
            stageMap.set(stage.id, { ...stage, children: [] } as StageWithChildren);
        });

        // Second pass: build hierarchy
        stages.forEach(stage => {
            const node = stageMap.get(stage.id)!;
            if (stage.parentId && stageMap.has(stage.parentId)) {
                stageMap.get(stage.parentId)!.children.push(node);
            } else {
                rootStages.push(node);
            }
        });

        // Helper to sort children by displayOrder
        const sortNodes = (nodes: StageWithChildren[]) => {
            nodes.sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
            nodes.forEach(n => sortNodes(n.children));
        };

        sortNodes(rootStages);
        return rootStages;
    }, [stages]);

    const getStatusColor = (actual: number, planned: number) => {
        if (actual >= planned) return 'text-emerald-500';
        if (actual < planned * 0.8) return 'text-red-500';
        return 'text-amber-500';
    };

    const handleCreate = (parentId: string | null = null) => {
        setEditingStage(null);
        setParentIdForNew(parentId);
        setIsModalOpen(true);
    };

    const handleEdit = (stage: WorkStage) => {
        setEditingStage(stage);
        setParentIdForNew(null);
        setIsModalOpen(true);
    };

    const handleSave = async (data: CreateStageData, silent = false) => {
        if (editingStage) {
            return updateStage(editingStage.id, data);
        }
        // Usa o parentId dos dados se fornecido (importante para importações), caso contrário usa o parentIdForNew do estado
        return createStage({
            ...data,
            parentId: data.parentId || (parentIdForNew || undefined)
        }, silent);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncStages();
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async (stageId: string) => {
        return deleteStage(stageId);
    };

    const handleDeleteAll = async () => {
        return deleteAllStages();
    };

    const toggleExpanded = (stageId: string) => {
        const newSet = new Set(expandedStages);
        if (newSet.has(stageId)) {
            newSet.delete(stageId);
        } else {
            newSet.add(stageId);
        }
        setExpandedStages(newSet);
    };

    // Drag handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.stopPropagation(); // Prevent parent drag start when dragging child
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverId(id);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        const draggedStage = stages.find(s => s.id === draggedId);
        const targetStage = stages.find(s => s.id === targetId);

        if (!draggedStage || !targetStage) return;

        // Allow reordering only within the same level (same parent)
        if (draggedStage.parentId !== targetStage.parentId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        // Get all siblings
        const siblings = stages
            .filter(s => s.parentId === draggedStage.parentId)
            .sort((a, b) => a.displayOrder - b.displayOrder);

        const draggedIndex = siblings.findIndex(s => s.id === draggedId);
        const targetIndex = siblings.findIndex(s => s.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newSiblings = [...siblings];
        const [removed] = newSiblings.splice(draggedIndex, 1);
        newSiblings.splice(targetIndex, 0, removed);

        // Update display order
        const updates = newSiblings.map((s, index) => ({
            ...s,
            displayOrder: index
        }));

        setDraggedId(null);
        setDragOverId(null);

        await reorderStages(updates);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
    };

    const renderStage = (stage: StageWithChildren, index: number, depth: number = 0) => {
        const hasChildren = stage.children.length > 0;
        const isExpanded = expandedStages.has(stage.id);

        return (
            <div key={stage.id} className={depth > 0 ? 'ml-8 border-l-2 border-slate-800 pl-4' : ''}>
                <Card
                    draggable
                    onDragStart={(e) => handleDragStart(e, stage.id)}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDrop={(e) => handleDrop(e, stage.id)}
                    onDragEnd={handleDragEnd}
                    className={`glass-card overflow-hidden group transition-all mb-2 cursor-grab active:cursor-grabbing ${draggedId === stage.id ? 'opacity-50 scale-[0.98]' : ''
                        } ${dragOverId === stage.id ? 'border-amber-500 bg-amber-500/5' : 'hover:border-primary/20'
                        } ${depth > 0 ? 'bg-slate-900/30' : ''}`}
                >
                    <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                            <div className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-4 w-4" />
                            </div>

                            {/* Expand/Collapse for parents */}
                            {hasChildren ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleExpanded(stage.id)}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-amber-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-500" />
                                    )}
                                </Button>
                            ) : (
                                <div className="w-6" />
                            )}

                            {/* Order/Depth indicator */}
                    
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${depth === 0
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'bg-slate-700/50 text-slate-400'
                                }`}>
                                {depth === 0 ? index + 1 : '↳'}
                            </div>

                            {/* Stage Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-bold truncate ${depth > 0 ? 'text-sm' : 'text-base'}`}>{stage.name}</h3>
                                            {stage.productionActivityId && (
                                                <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                                            )}
                                            <Badge variant="outline" className="text-[10px] font-black tracking-widest bg-white/5 uppercase">
                                                Peso: {(stage.weight * 100).toFixed(0)}%
                                            </Badge>
                                            {hasChildren && (
                                                <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-500 border-sky-500/30 flex gap-1 items-center">
                                                    <Combine className="h-2.5 w-2.5" />
                                                    Consolidado ({stage.children.length})
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                           

                            {/* Progresso */}
                            <div className="w-32 space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-500">Progresso</span>
                                    <span className={getStatusColor(stage.progress?.[0]?.actualPercentage || 0, stage.progress?.[0]?.plannedPercentage || 0)}>
                                        {Math.min(100, stage.progress?.[0]?.actualPercentage || 0).toFixed(2)}%
                                    </span>
                                </div>

                                <Progress value={Math.min(100, stage.progress?.[0]?.actualPercentage || 0)} className="h-1.5 bg-white/5" />
                            </div>

                            {/* Actions */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-slate-950 border-slate-800">
                                    <DropdownMenuItem onClick={() => handleCreate(stage.id)} className="cursor-pointer">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Adicionar Sub-etapa
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-800" />
                                    <DropdownMenuItem onClick={() => handleEdit(stage)} className="cursor-pointer">
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => handleDelete(stage.id)}
                                        className="cursor-pointer text-rose-500 focus:text-rose-500"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardContent>
                </Card>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="space-y-0">
                        {stage.children.map((child, childIndex) => renderStage(child, childIndex, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Acompanhamento de Metas
                    </h2>
                    <p className="text-xs text-muted-foreground italic font-medium">
                        Cronograma Físico x Realizado por etapa de obra.
                        {stages.length > 0 && <span className="text-amber-500 ml-1">Arraste para reordenar • Clique ⋮ para sub-etapas</span>}
                    </p>
                </div>
                <div className="flex gap-2">
                    {stages.length > 0 && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 gap-2 font-bold"
                            >
                                {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                Sincronizar Produção
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-rose-500/30 text-rose-500 hover:bg-rose-950/20 gap-2">
                                        <Trash2 className="w-3 h-3" /> Remover Todas
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-950 border-slate-800">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-rose-500 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5" />
                                            Remover Todas as Etapas
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Tem certeza que deseja remover <strong>todas as {stages.length} etapas</strong>?
                                            Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="border-slate-700">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDeleteAll}
                                            className="bg-rose-600 hover:bg-rose-700"
                                        >
                                            Sim, Remover Todas
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                    <Button onClick={() => handleCreate(null)} className="gradient-primary font-bold gap-2">
                        <Plus className="w-4 h-4" /> Nova Etapa
                    </Button>
                </div>
            </div>

            <div className="space-y-0">
                {isLoading ? (
                    <div className="py-20 text-center glass-card italic text-muted-foreground">
                        <div className="h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        Calculando avanço físico...
                    </div>
                ) : hierarchicalStages.length === 0 ? (
                    <div className="py-20 text-center glass-card">
                        <p className="italic text-muted-foreground mb-4">Nenhuma etapa de obra cadastrada para este projeto.</p>
                        <Button onClick={() => handleCreate(null)} variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar Primeira Etapa
                        </Button>
                    </div>
                ) : (
                    hierarchicalStages.map((stage, index) => renderStage(stage, index, 0))
                )}
            </div>

            <StageFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setParentIdForNew(null);
                }}
                stage={editingStage}
                onSave={handleSave}
                onDelete={handleDelete}
                onSync={syncStages}
                onRefresh={refresh}
            />
        </div>
    );
}
