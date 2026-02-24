import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { orionApi } from "@/integrations/orion/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronDown, ChevronRight, Layers, Zap } from "lucide-react";
import { ACTIVITY_PRESETS, ActivityPresetCategory } from "@/modules/production/constants/activityPresets";
import { cn } from "@/lib/utils";

interface ActivityPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  companyId: string;
  siteId?: string;
}

const ActivityPresetsModal = ({
  isOpen,
  onClose,
  projectId,
  companyId,
  siteId,
}: ActivityPresetsModalProps) => {
  const queryClient = useQueryClient();
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCategory = (index: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCategories(new Set(ACTIVITY_PRESETS.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedCategories(new Set());
  };

  const handleApply = async () => {
    if (selectedCategories.size === 0) {
      toast.warning("Selecione pelo menos uma categoria");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build hierarchy: for each selected category, create parent + children
      const goals: any[] = [];
      const workStageItems: any[] = [];

      for (const catIndex of Array.from(selectedCategories).sort()) {
        const category = ACTIVITY_PRESETS[catIndex];

        // === TowerActivityGoals (tree hierarchy) ===
        // Parent activity (level 1)
        goals.push({
          name: category.name,
          level: 1,
          order: category.order,
          parentId: null,
          metadata: { isPreset: true },
        });

        // Sub-activities (level 2)
        for (const activity of category.activities) {
          goals.push({
            name: activity.name,
            level: 2,
            order: activity.order,
            parentId: `__parent_${category.name}__`,
            metadata: {
              unit: activity.unit,
              price: activity.price,
              parentName: category.name,
              isPreset: true,
            },
          });
        }

        // === WorkStages (production grid columns) ===
        workStageItems.push({
          name: category.name,
          displayOrder: category.order,
          weight: 1.0,
          metadata: { isPreset: true },
          children: category.activities.map((activity) => ({
            name: activity.name,
            displayOrder: activity.order,
            weight: 1.0,
            metadata: {
              unit: activity.unit,
              price: activity.price,
              isPreset: true,
            },
          })),
        });
      }

      // Create both in parallel: TowerActivityGoals (tree) + WorkStages (grid columns)
      await Promise.all([
        orionApi.post("/tower-activity-goals", {
          projectId,
          companyId,
          data: goals,
        }),
        orionApi.post("/work_stages/bulk", {
          projectId,
          siteId,
          data: workStageItems,
        }),
      ]);

      toast.success(`${selectedCategories.size} categorias aplicadas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["tower-activity-goals"] });
      queryClient.invalidateQueries({ queryKey: ["work-stages"] });
      // Force refresh work stages signal
      const { fetchWorkStages } = await import("@/signals/workStageSignals");
      await fetchWorkStages(true, undefined, projectId, companyId);

      setSelectedCategories(new Set());
      onClose();
    } catch (error) {
      toast.error("Erro ao aplicar padrões");
      console.error("[ActivityPresetsModal] Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-[#0c0a09] border-primary/20 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tighter italic text-primary flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Padrões de Atividades
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Selecione os padrões que deseja aplicar ao projeto. Cada padrão cria uma atividade mãe com suas sub-metas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-4 pr-2">
          {ACTIVITY_PRESETS.map((category, catIndex) => {
            const isSelected = selectedCategories.has(catIndex);
            const isExpanded = expandedCategories.has(catIndex);

            return (
              <div
                key={category.name}
                className={cn(
                  "rounded-xl border transition-all duration-200",
                  isSelected
                    ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5"
                    : "border-white/5 bg-black/30 hover:border-white/10"
                )}
              >
                {/* Category Header */}
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleCategory(catIndex)}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleCategory(catIndex)}
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(catIndex); }}
                    className="p-0.5 hover:bg-white/10 rounded"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                  <div className="flex-1">
                    <span className="text-sm font-black uppercase tracking-tight text-foreground/90">
                      {category.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold border-white/10 text-muted-foreground">
                    {category.activities.length} sub-metas
                  </Badge>
                </div>

                {/* Sub-activities */}
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-white/5">
                    <div className="mt-2 space-y-1">
                      {category.activities.map((activity) => (
                        <div
                          key={activity.name}
                          className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/2 hover:bg-white/4 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            <span className="text-xs text-foreground/70 uppercase tracking-tight">
                              {activity.order}. {activity.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] font-mono border-white/5 text-muted-foreground/50">
                              {activity.unit}
                            </Badge>
                            {activity.price > 0 && (
                              <span className="text-[9px] font-mono text-emerald-500/60">
                                R$ {activity.price.toLocaleString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="text-[10px] font-bold uppercase tracking-widest text-primary"
            >
              Selecionar Tudo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Limpar
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="uppercase text-[10px] font-bold tracking-widest">
              Cancelar
            </Button>
            <Button
              onClick={handleApply}
              disabled={isSubmitting || selectedCategories.size === 0}
              className="gradient-primary uppercase text-[10px] font-black tracking-widest px-6"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Aplicar ({selectedCategories.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityPresetsModal;
