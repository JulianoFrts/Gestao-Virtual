import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  GripVertical, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActivityNode {
  id: string;
  name: string;
  level: number;
  order: number;
  towerId?: string | null;
  metadata?: any;
  children?: ActivityNode[];
}

interface TowerActivityTreeProps {
  data: ActivityNode[];
  onMove: (id: string, newParentId: string | null, newOrder: number) => void;
  onEdit: (node: ActivityNode) => void;
  onDelete: (id: string) => void;
  onCreate: (parentId: string | null) => void;
}

const ActivityItem = React.memo(({ 
  node, 
  onMove, 
  onEdit, 
  onDelete, 
  onCreate 
}: { 
  node: ActivityNode;
  onMove: any;
  onEdit: any;
  onDelete: any;
  onCreate: any;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  const hasWarning = !node.towerId && node.level > 1;

  return (
    <div className="ml-4 border-l border-amber-900/10 pl-4 py-1">
      <div className={cn(
        "group flex items-center justify-between p-2 rounded-lg transition-all hover:bg-primary/5 border border-transparent hover:border-primary/20",
        node.level === 1 ? "bg-primary/5 font-bold" : "bg-transparent"
      )}>
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab active:cursor-grabbing" />
          
          <button 
            type="button"
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-1 hover:bg-white/10 rounded"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          <div className="flex flex-col">
            <span className="text-sm tracking-tight text-foreground/90 uppercase">
              {node.name}
            </span>
            {hasWarning && (
              <div className="flex items-center gap-1.5 text-[9px] text-amber-500 font-bold uppercase animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Sem torre vinculada
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreate(node.id)}>
            <Plus className="w-3.5 h-3.5 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
            <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10" onClick={() => onDelete(node.id)}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mt-1 animate-in fade-in slide-in-from-left-2 duration-300">
          {node.children?.sort((a,b) => a.order - b.order).map(child => (
            <ActivityItem 
              key={child.id} 
              node={child} 
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreate={onCreate}
            />
          ))}
        </div>
      )}
    </div>
  );
});

ActivityItem.displayName = "ActivityItem";

export const TowerActivityTree = ({ 
  data, 
  onMove, 
  onEdit, 
  onDelete, 
  onCreate 
}: TowerActivityTreeProps) => {
  return (
    <div className="space-y-2 p-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black tracking-tighter uppercase italic text-primary">
          Hierarquia de Atividades & Metas
        </h3>
        <Button size="sm" onClick={() => onCreate(null)} className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" /> Atividade Mãe
        </Button>
      </div>
      
      <div className="rounded-xl border border-primary/10 bg-black/40 p-4 shadow-inner">
        {data.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground/40 italic flex flex-col items-center gap-2">
            <Move className="w-12 h-12 opacity-10" />
            Nenhuma atividade cadastrada. Comece criando uma atividade mãe.
          </div>
        ) : (
          data.sort((a,b) => a.order - b.order).map(rootNode => (
            <ActivityItem 
              key={rootNode.id} 
              node={rootNode} 
              onMove={onMove}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreate={onCreate}
            />
          ))
        )}
      </div>
    </div>
  );
};
