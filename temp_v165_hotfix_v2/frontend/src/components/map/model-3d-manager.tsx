import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Box, Upload, Loader2, Trash2, Check, RefreshCw, Pencil, Save, RotateCcw, Move, Maximize, Ruler, Settings2 } from 'lucide-react';
import { db } from '@/integrations/database';
import { useToast } from '@/hooks/use-toast';
import { CableSettings, ModelTransform } from './cable-config-modal';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface Model3DManagerProps {
    projectId: string;
    cableSettings: CableSettings;
    onUpdateSettings: (settings: CableSettings) => Promise<void>;
}

const DEFAULT_TRANSFORM: ModelTransform = {
    displayName: '',
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    offset: [0, 0, 0],
    baseHeight: 1
};

export function Model3DManager({ projectId, cableSettings, onUpdateSettings }: Model3DManagerProps) {
    const [uploading, setUploading] = useState(false);
    const [existingModels, setExistingModels] = useState<any[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [editingModel, setEditingModel] = useState<{ url: string; name: string } | null>(null);
    const [tempTransform, setTempTransform] = useState<ModelTransform>(DEFAULT_TRANSFORM);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const fetchExistingModels = useCallback(async () => {
        if (!projectId || projectId === 'all') return;
        setLoadingModels(true);
        try {
            const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1$/, '');
            const response = await fetch(`${API_URL}/api/v1/storage/3d-models/list?path=models/${projectId}`);
            const textResponse = await response.text();

            let result;
            try {
                result = JSON.parse(textResponse);
            } catch (e) {
                console.error('❌ [Model3DManager] Server returned non-JSON response:', textResponse.substring(0, 100));
                throw new Error('Servidor retornou uma resposta inválida (não-JSON).');
            }

            if (result.error) throw new Error(result.error);
            setExistingModels(result.data || []);
        } catch (error: any) {
            console.error('❌ [Model3DManager] Error fetching models from API:', error);
            // Fallback para lista vazia em caso de erro na API
            setExistingModels([]);
        } finally {
            setLoadingModels(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchExistingModels();
    }, [fetchExistingModels]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !projectId || projectId === 'all') return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'glb' && ext !== 'gltf') {
            toast({
                title: "Formato Inválido",
                description: "Por favor, selecione um arquivo .glb ou .gltf",
                variant: "destructive"
            });
            return;
        }

        setUploading(true);
        try {
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const fileName = `${Date.now()}_${sanitizedName}`;
            const filePath = `models/${projectId}/${fileName}`;

            const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1$/, '');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', filePath);

            const response = await fetch(`${API_URL}/api/v1/storage/3d-models/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.error || 'Erro no upload');

            const publicUrl = result.data.publicUrl;

            const updatedSettings = {
                ...cableSettings,
                customModelUrl: publicUrl
            };

            await onUpdateSettings(updatedSettings);

            toast({
                title: "Modelo 3D Atualizado",
                description: "O novo modelo foi carregado e aplicado ao mapa.",
            });
            fetchExistingModels();
        } catch (error: any) {
            console.error('❌ [Model3DManager] Error uploading 3D model:', error);
            toast({
                title: "Erro no Upload",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSelectModel = async (modelKey: string) => {
        if (modelKey === 'default') {
            await onUpdateSettings({ ...cableSettings, customModelUrl: undefined });
            toast({ title: "Modelo Padrão", description: "O mapa agora utiliza a torre industrial padrão." });
            return;
        }

        if (modelKey === 'PORTICO-001') {
            const url = `${window.location.origin}/models/PORTICO-001/scene.gltf`;
            await onUpdateSettings({ ...cableSettings, customModelUrl: url });
            toast({ title: "Modelo Selecionado", description: "O Pórtico 001 foi aplicado." });
            return;
        }

        try {
            const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1$/, '');
            const publicUrl = `${API_URL}/api/v1/storage/3d-models/get?path=models/${projectId}/${modelKey}`;

            const updatedSettings = {
                ...cableSettings,
                customModelUrl: publicUrl
            };

            await onUpdateSettings(updatedSettings);
            toast({ title: "Modelo Alterado", description: "O Digital Twin selecionado foi aplicado." });
        } catch (error: any) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
    };

    const handleRemoveFile = async (modelName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("Deseja excluir este arquivo permanentemente?")) return;

        try {
            const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1$/, '');
            const response = await fetch(`${API_URL}/api/v1/storage/3d-models/remove`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `models/${projectId}/${modelName}` })
            });

            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.error || 'Erro ao remover');

            if (cableSettings.customModelUrl?.includes(modelName)) {
                await onUpdateSettings({ ...cableSettings, customModelUrl: undefined });
            }

            fetchExistingModels();
            toast({ title: "Excluído", description: "Arquivo removido com sucesso." });
        } catch (error: any) {
            toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
        }
    };

    const openEditModel = (modelName: string, url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const currentCfg = cableSettings.modelConfigs?.[url] || { ...DEFAULT_TRANSFORM };
        setTempTransform(currentCfg);
        setEditingModel({ url, name: modelName });
    };

    const handleSaveTransform = async () => {
        if (!editingModel) return;

        const newConfigs = {
            ...(cableSettings.modelConfigs || {}),
            [editingModel.url]: tempTransform
        };

        const updatedSettings = {
            ...cableSettings,
            modelConfigs: newConfigs
        };

        await onUpdateSettings(updatedSettings);
        setEditingModel(null);
        toast({
            title: "Propriedades Salvas",
            description: `Configurações do modelo "${tempTransform.displayName || editingModel.name}" atualizadas.`,
        });
    };

    const hasCustomModel = !!cableSettings.customModelUrl;

    return (
        <Card className="glass-card border-amber-500/30 bg-amber-500/5 animate-in slide-in-from-left duration-500 overflow-hidden relative mt-4">
            <div className="absolute top-0 right-0 p-3 opacity-5">
                <Box className="w-7 h-7" />
            </div>
            <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-amber-500">
                    <Box className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Gestor de Modelos 3D</h3>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Digital Twin Ativo</span>
                            <span className={cn(
                                "text-xs font-black uppercase mt-0.5",
                                hasCustomModel ? "text-amber-400" : "text-emerald-500"
                            )}>
                                {hasCustomModel ? "Personalizado" : "Padrão Industrial"}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchExistingModels}
                            className="h-7 w-7 p-0 hover:bg-white/5"
                        >
                            <RefreshCw className={cn("w-3 h-3", loadingModels && "animate-spin")} />
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            accept=".glb,.gltf"
                            className="hidden"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || !projectId || projectId === 'all'}
                                className="h-9 bg-amber-500 hover:bg-amber-600 text-black font-black text-[9px] uppercase tracking-widest transition-all gap-2 shadow-lg shadow-amber-500/10"
                            >
                                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                Novo Upload
                            </Button>
                            <Button
                                onClick={() => window.open('/viewer-3d', '_blank')}
                                className="h-9 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-[9px] uppercase tracking-widest transition-all gap-2 border border-white/10"
                            >
                                <Box className="w-3 h-3 text-amber-500" />
                                Editor 3D
                            </Button>
                        </div>
                    </div>

                    {/* Model Library List */}
                    <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest block mb-2">
                            Modelos Disponíveis ({existingModels.length + 2})
                        </span>

                        <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                            {/* System Default Item */}
                            <div
                                onClick={() => handleSelectModel('default')}
                                className={cn(
                                    "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer group/item",
                                    !hasCustomModel ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/5 border-transparent hover:border-white/10"
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        !hasCustomModel ? "bg-emerald-500 animate-pulse" : "bg-white/10"
                                    )} />
                                    <span className={cn(
                                        "text-[9px] font-bold truncate",
                                        !hasCustomModel ? "text-emerald-400" : "text-white/50 group-hover/item:text-white"
                                    )}>
                                        {cableSettings.modelConfigs?.['default']?.displayName || "Torre Industrial (Padrão)"}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => openEditModel("Torre Industrial (Padrão)", "default", e)}
                                    className="p-1 opacity-100 lg:opacity-0 group-hover/item:opacity-100 hover:text-amber-500 transition-all text-white/20"
                                >
                                    <Settings2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Portico 001 Local Item */}
                            <div
                                onClick={() => handleSelectModel('PORTICO-001')}
                                className={cn(
                                    "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer group/item",
                                    cableSettings.customModelUrl?.includes('PORTICO-001') ? "bg-amber-500/10 border-amber-500/40" : "bg-white/5 border-transparent hover:border-white/10"
                                )}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        cableSettings.customModelUrl?.includes('PORTICO-001') ? "bg-amber-500 animate-pulse" : "bg-white/10"
                                    )} />
                                    <span className={cn(
                                        "text-[9px] font-bold truncate",
                                        cableSettings.customModelUrl?.includes('PORTICO-001') ? "text-amber-400" : "text-white/50 group-hover/item:text-white"
                                    )}>
                                        {cableSettings.modelConfigs?.[`${window.location.origin}/models/PORTICO-001/scene.gltf`]?.displayName || "Pórtico 001 (Sistema)"}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => openEditModel("Pórtico 001", `${window.location.origin}/models/PORTICO-001/scene.gltf`, e)}
                                    className="p-1 opacity-100 lg:opacity-0 group-hover/item:opacity-100 hover:text-amber-500 transition-all text-white/20"
                                >
                                    <Settings2 className="w-3 h-3" />
                                </button>
                            </div>

                            {loadingModels && existingModels.length === 0 ? (
                                <div className="py-8 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-amber-500/20" /></div>
                            ) : existingModels.map((model) => {
                                const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1$/, '');
                                const isActive = cableSettings.customModelUrl?.includes(model.name);
                                const modelUrl = `${API_URL}/api/v1/storage/3d-models/get?path=models/${projectId}/${model.name}`;
                                const config = cableSettings.modelConfigs?.[modelUrl];
                                const displayName = config?.displayName || model.name.split('_').slice(1).join('_') || model.name;

                                return (
                                    <div
                                        key={model.name}
                                        onClick={() => handleSelectModel(model.name)}
                                        className={cn(
                                            "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer group/item",
                                            isActive ? "bg-amber-500/10 border-amber-500/40" : "bg-white/3 border-transparent hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full shrink-0",
                                                isActive ? "bg-amber-500 animate-pulse" : "bg-white/10"
                                            )} />
                                            <span className={cn(
                                                "text-[9px] font-bold truncate max-w-[120px]",
                                                isActive ? "text-amber-400" : "text-white/60 group-hover/item:text-white"
                                            )}>
                                                {displayName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => openEditModel(displayName, modelUrl, e)}
                                                className="p-1 opacity-100 lg:opacity-0 group-hover/item:opacity-100 hover:text-amber-500 transition-all text-white/20"
                                            >
                                                <Pencil className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                                onClick={(e) => handleRemoveFile(model.name, e)}
                                                className="p-1 opacity-100 lg:opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-all text-white/20"
                                            >
                                                <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Edit Dialog */}
            <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
                <DialogContent className="glass-card border-white/10 bg-black/95 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-amber-500 font-black uppercase tracking-widest text-sm">
                            <Settings2 className="w-5 h-5" />
                            Propriedades do Modelo: {editingModel?.name}
                        </DialogTitle>
                        <DialogDescription className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                            Ajuste as dimensões e posicionamento do Digital Twin no mapa.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                        {/* Nome e Altura Base */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Apelido do Modelo</Label>
                                <Input
                                    value={tempTransform.displayName || ''}
                                    onChange={(e) => setTempTransform(prev => ({ ...prev, displayName: e.target.value }))}
                                    className="h-10 bg-white/5 border-white/10 text-xs font-bold"
                                    placeholder="Ex: Torre Suspensão T1, Torre Ângulo..."
                                />
                            </div>

                            <div className="space-y-4 p-4 bg-white/3 rounded-xl border border-white/5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                        <Ruler className="w-3 h-3 text-amber-500" /> Multiplicador de Altura
                                    </Label>
                                    <span className="text-xs font-black text-amber-400 font-mono">{(tempTransform.baseHeight || 1).toFixed(2)}x</span>
                                </div>
                                <Slider
                                    value={[tempTransform.baseHeight || 1]}
                                    min={0.1} max={5} step={0.01}
                                    onValueChange={([v]) => setTempTransform(prev => ({ ...prev, baseHeight: v }))}
                                    className="py-2"
                                />
                                <p className="text-[8px] text-white/40 italic">Ajusta a altura total do modelo proporcionalmente à base do KMZ.</p>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                    <Maximize className="w-3 h-3 text-amber-500" /> Escala (X, Y, Z)
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['X', 'Y', 'Z'].map((axis, i) => (
                                        <div key={axis} className="space-y-1.5">
                                            <span className="text-[8px] font-black text-white/20 ml-1">{axis}</span>
                                            <Input
                                                type="number" step="0.01"
                                                value={tempTransform.scale[i]}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 1;
                                                    const ns = [...tempTransform.scale] as [number, number, number];
                                                    ns[i] = val;
                                                    setTempTransform(prev => ({ ...prev, scale: ns }));
                                                }}
                                                className="h-8 bg-black/40 border-white/5 text-[10px] font-mono text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Rotação e Translação */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                    <RotateCcw className="w-3 h-3 text-amber-500" /> Rotação Inicial (Graus)
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Pitch', 'Roll', 'Yaw'].map((axis, i) => (
                                        <div key={axis} className="space-y-1.5">
                                            <span className="text-[8px] font-black text-white/20 ml-1">{axis}</span>
                                            <Input
                                                type="number" step="1"
                                                value={tempTransform.rotation[i]}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const nr = [...tempTransform.rotation] as [number, number, number];
                                                    nr[i] = val;
                                                    setTempTransform(prev => ({ ...prev, rotation: nr }));
                                                }}
                                                className="h-8 bg-black/40 border-white/5 text-[10px] font-mono text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-2">
                                    <Move className="w-3 h-3 text-amber-500" /> Deslocamento (X, Y, Z Metros)
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Easting', 'Northing', 'Up'].map((axis, i) => (
                                        <div key={axis} className="space-y-1.5">
                                            <span className="text-[8px] font-black text-white/20 ml-1">{axis}</span>
                                            <Input
                                                type="number" step="0.1"
                                                value={tempTransform.offset[i]}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value) || 0;
                                                    const no = [...tempTransform.offset] as [number, number, number];
                                                    no[i] = val;
                                                    setTempTransform(prev => ({ ...prev, offset: no }));
                                                }}
                                                className="h-8 bg-black/40 border-white/5 text-[10px] font-mono text-center"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setTempTransform(DEFAULT_TRANSFORM)}
                                className="w-full h-9 border-white/5 bg-white/2 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest gap-2"
                            >
                                <RefreshCw className="w-3 h-3" /> Resetar Valores
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-white/5 pt-6 gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setEditingModel(null)}
                            className="h-11 px-8 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveTransform}
                            className="h-11 px-12 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-amber-500/20 gap-2"
                        >
                            <Save className="w-4 h-4" /> Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

