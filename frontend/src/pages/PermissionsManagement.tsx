import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { isSidebarOpenSignal } from '@/signals/uiSignals';
import { localApi } from '@/integrations/orion/client';
import { 
  ShieldCheck, 
  Settings, 
  Lock, 
  Search, 
  ChevronRight, 
  Plus, 
  Save, 
  Loader2,
  AlertTriangle,
  Info,
  Menu
} from 'lucide-react';

interface PermissionLevel {
  id: string;
  name: string;
  rank: number;
  description?: string;
}

interface PermissionModule {
  id: string;
  name: string;
  code: string;
  category?: string;
}

interface PermissionMatrix {
  id: string;
  levelId: string;
  moduleId: string;
  isGranted: boolean;
}

export default function PermissionsManagement() {
  const { toast } = useToast();
  const [levels, setLevels] = useState<PermissionLevel[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [matrix, setMatrix] = useState<Record<string, boolean>>({}); // Map moduleId -> isGranted
  
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [levelsRes, modulesRes] = await Promise.all([
        localApi.get('/permission_levels'),
        localApi.get('/permission_modules')
      ]);
      
      const levelsData = (Array.isArray(levelsRes.data) ? levelsRes.data : (levelsRes.data as any).data || []);
      const modulesData = Array.isArray(modulesRes.data) ? modulesRes.data : (modulesRes.data as any).data || [];
      
      setLevels(levelsData);
      setModules(modulesData);
      
      if (levelsData.length > 0) {
        setSelectedLevelId(levelsData[0].id);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar dados de permissão.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLevelId) {
      loadMatrix(selectedLevelId);
    }
  }, [selectedLevelId]);

  const loadMatrix = async (levelId: string) => {
    try {
      const response = await localApi.get(`/permission_matrix?levelId=${levelId}`);
      const matrixData = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      
      const matrixMap: Record<string, boolean> = {};
      matrixData.forEach((item: PermissionMatrix) => {
        matrixMap[item.moduleId] = item.isGranted;
      });
      setMatrix(matrixMap);
    } catch (error) {
      console.error("Failed to load matrix:", error);
    }
  };

  const handleTogglePermission = (moduleId: string) => {
    setMatrix(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleSave = async () => {
    if (!selectedLevelId) return;
    
    setIsSaving(true);
    try {
      // Filtrar apenas módulos que existem na lista atual para evitar FK violations no backend
      const activeModuleIds = modules.map(m => m.id);
      const matrixToSync = Object.entries(matrix)
        .filter(([moduleId]) => activeModuleIds.includes(moduleId))
        .map(([moduleId, isGranted]) => ({
          moduleId,
          isGranted
        }));

      // O backend deve suportar atualização em lote da matriz para o levelId
      const response = await localApi.post(`/permission_matrix/sync`, {
        levelId: selectedLevelId,
        matrix: matrixToSync
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Falha ao salvar permissões.");
      }

      toast({ title: "Sucesso", description: "Permissões atualizadas com sucesso!" });
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message || "Falha ao salvar permissões.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLevels = levels
    .filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.rank - a.rank);
  const groupedModules = modules.reduce((acc, mod) => {
    const cat = mod.category || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(mod);
    return acc;
  }, {} as Record<string, PermissionModule[]>);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 pb-7">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:flex hidden text-slate-400 hover:text-white"
            onClick={() => isSidebarOpenSignal.value = !isSidebarOpenSignal.value}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="md:hidden flex">
            {/* O Header já provê o menu mobile, então no mobile este botão pode ser opcional ou um simples back */}
            <Menu className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Gestão de Permissões
            </h1>
            <p className="text-slate-500 font-medium">Configure as regras de acesso e autoridade para cada nível hierárquico.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 h-12 rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.3)]">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
          SALVAR ALTERAÇÕES
        </Button>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Coluna Esquerda: Lista de Cargos */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card className="bg-[#0c0c0e] border-white/5 rounded-4xl shadow-2xl overflow-hidden ring-1 ring-white/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Níveis / Cargos
                </CardTitle>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Buscar cargo..." 
                  className="bg-black/40 border-white/5 pl-10 h-11 rounded-xl focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="p-4 space-y-2">
                  {filteredLevels.map((level, idx) => (
                    <button
                      key={`${level.id}-${idx}`}
                      onClick={() => setSelectedLevelId(level.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                        selectedLevelId === level.id 
                          ? (level.rank >= 1000 ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20")
                          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="text-left flex items-center gap-3">
                        {level.rank >= 1000 && (
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border",
                            selectedLevelId === level.id ? "bg-black/10 border-black/20" : "bg-amber-500/10 border-amber-500/20"
                          )}>
                            <ShieldCheck className={cn("w-6 h-6", selectedLevelId === level.id ? "text-black" : "text-amber-500")} />
                          </div>
                        )}
                        <div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest block opacity-60",
                            selectedLevelId === level.id && level.rank >= 1000 ? "text-black" : ""
                          )}>Rank {level.rank}</span>
                          <span className="font-bold text-lg">{level.name.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-5 h-5 transition-transform", selectedLevelId === level.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Matriz de Permissões */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Card className="bg-[#0c0c0e] border-white/5 rounded-4xl shadow-2xl overflow-hidden min-h-[calc(100vh-220px)] ring-1 ring-white/5">
            <CardHeader className="border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center ring-1 ring-primary/20">
                    <Settings className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-white">
                      Configuração de Recursos
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                      Ativando os módulos para o cargo <span className="text-primary font-bold">{levels.find(l => l.id === selectedLevelId)?.name}</span>.
                    </CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
               <ScrollArea className="h-[calc(100vh-320px)] -mr-4 pr-4">
                  <Accordion type="multiple" className="space-y-4" defaultValue={Object.keys(groupedModules)}>
                     {Object.entries(groupedModules).map(([category, items]) => (
                       <AccordionItem key={category} value={category} className="border border-white/5 bg-black/20 rounded-3xl overflow-hidden shadow-lg">
                          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors data-[state=open]:border-b data-[state=open]:border-white/5">
                            <span className="text-sm font-black uppercase tracking-[0.2em] text-primary/80">
                              {category}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                               {items.map((mod, idx) => (
                                 <div 
                                   key={`${mod.id}-${idx}`} 
                                   onClick={() => handleTogglePermission(mod.id)}
                                   className={cn(
                                     "flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all cursor-pointer group",
                                     matrix[mod.id] 
                                       ? "bg-primary/10 border-primary/30" 
                                       : "bg-white/2 border-white/5 hover:border-white/10"
                                   )}
                                 >
                                    <div className="flex items-center gap-3 min-w-0">
                                       <span className={cn("font-bold text-sm", matrix[mod.id] ? "text-primary" : "text-white")}>
                                         {mod.name}
                                       </span>
                                       <code className="text-[9px] text-slate-500 font-mono tracking-tight bg-white/5 px-2 py-0.5 rounded-full shrink-0">
                                         {mod.code}
                                       </code>
                                    </div>
                                    <Checkbox 
                                      checked={!!matrix[mod.id]} 
                                      onCheckedChange={() => handleTogglePermission(mod.id)}
                                      className="h-5 w-5 rounded-md border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                                    />
                                 </div>
                               ))}
                            </div>
                          </AccordionContent>
                       </AccordionItem>
                     ))}
                  </Accordion>
               </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-2 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex gap-3 items-center">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <p className="text-[11px] text-amber-500/70 font-medium leading-snug">
          <span className="font-black uppercase tracking-wider">Atenção:</span> Alterar permissões de níveis base pode afetar múltiplos usuários. Valide as dependências antes de salvar.
        </p>
      </div>
    </div>
  );
}
