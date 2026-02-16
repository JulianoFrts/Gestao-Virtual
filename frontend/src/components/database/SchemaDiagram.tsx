import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    MarkerType,
    Position,
    Handle
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSqlRunner } from '@/hooks/useSqlRunner';
import { toast } from 'sonner';
import { Key, Shield, Info, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Custom Table Node ---
const TableNode = ({ data }: { data: any }) => {
    return (
        <div className="bg-card border-2 border-border rounded-lg shadow-xl min-w-[200px] overflow-hidden group hover:border-primary transition-colors">
            {/* Header */}
            <div className="bg-muted/50 p-2 border-b border-border flex items-center justify-between">
                <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    {data.isAudit && <Shield className="w-3 h-3 text-cyan-500" />}
                    {data.label}
                </div>
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="w-3 h-3 text-muted-foreground hover:text-primary cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px] text-xs">
                            <p className="font-bold mb-1">Quality Hints:</p>
                            <ul className="list-disc pl-3 space-y-1">
                                {data.hints.map((hint: string, i: number) => (
                                    <li key={i}>{hint}</li>
                                ))}
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Columns */}
            <div className="p-2 space-y-1 bg-card">
                {data.columns.map((col: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5 relative">
                        {/* Handles for connections */}
                        <div className="flex items-center gap-2">
                            {col.isPk && <Key className="w-3 h-3 text-yellow-500" />}
                            {col.isFk && <Key className="w-3 h-3 text-blue-500 rotate-90" />}
                            <span className={col.isPk ? "font-bold text-foreground" : "text-muted-foreground"}>
                                {col.name}
                            </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 font-mono">
                            {col.type}
                        </span>
                        
                        {/* ReactFlow Handles */}
                        <Handle type="target" position={Position.Left} id={`${col.name}-target`} className="w-1 h-1 bg-muted-foreground/30!" />
                        <Handle type="source" position={Position.Right} id={`${col.name}-source`} className="w-1 h-1 bg-muted-foreground/30!" />
                    </div>
                ))}
            </div>
            {/* Footer / DDD Tag */}
            {data.domain && (
                <div className="bg-primary/5 p-1 text-[9px] text-primary text-center uppercase tracking-widest font-bold">
                    {data.domain}
                </div>
            )}
        </div>
    );
};

const nodeTypes = {
    table: TableNode,
};

export function SchemaDiagram() {
    const { executeQuery } = useSqlRunner();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);

    const loadSchema = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Tables
            const tablesRes = await executeQuery(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);

            if (!tablesRes) return;

            // 2. Fetch Columns & Constrants (Simplified for demo)
            // In a real scenario, we'd do a complex JOIN
            const columnsRes = await executeQuery(`
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position
            `);

             // 3. Fetch Keys (PK/FK)
             const keysRes = await executeQuery(`
                SELECT
                    tc.table_name, 
                    kcu.column_name, 
                    tc.constraint_type,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name 
                FROM 
                    information_schema.table_constraints AS tc 
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    LEFT JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.table_schema = 'public'
            `);


            if (tablesRes && columnsRes && keysRes) {
                 const newNodes: Node[] = [];
                 const newEdges: Edge[] = [];
                 const tableMap: any = {};

                 // Process Columns & Keys first
                 const columnsByTable: any = {};
                 columnsRes.forEach((c: any) => {
                     if(!columnsByTable[c.table_name]) columnsByTable[c.table_name] = [];
                     
                     // Check keys
                     const pk = keysRes.find((k: any) => k.table_name === c.table_name && k.column_name === c.column_name && k.constraint_type === 'PRIMARY KEY');
                     const fk = keysRes.find((k: any) => k.table_name === c.table_name && k.column_name === c.column_name && k.constraint_type === 'FOREIGN KEY');

                     columnsByTable[c.table_name].push({
                         name: c.column_name,
                         type: c.data_type,
                         isPk: !!pk,
                         isFk: !!fk,
                         fkRef: fk?.foreign_table_name
                     });

                     // Create Edge if FK
                     if (fk) {
                         newEdges.push({
                             id: `e-${c.table_name}-${c.column_name}-${fk.foreign_table_name}`,
                             source: fk.foreign_table_name,
                             target: c.table_name,
                             animated: true,
                             style: { stroke: '#64748b' },
                         });
                     }
                 });

                 // Create Nodes (Layout logic: Simple Grid for now)
                 let x = 0;
                 let y = 0;
                 const SPACING_X = 350;
                 const SPACING_Y = 400;
                 const COLS = 4;

                 tablesRes.forEach((t: any, index: number) => {
                     const isAudit = t.table_name.includes('audit') || t.table_name.includes('log');
                     const hints = [];
                     if (!columnsByTable[t.table_name]?.some((c:any) => c.isPk)) hints.push("Missing Primary Key");
                     if (isAudit) hints.push("Audit Log Table");
                     
                     newNodes.push({
                         id: t.table_name,
                         type: 'table',
                         position: { x, y },
                         data: { 
                             label: t.table_name, 
                             columns: columnsByTable[t.table_name] || [],
                             isAudit,
                             hints,
                             domain: 'CORE' // Placeholder for DDD domain logic
                         }
                     });

                     x += SPACING_X;
                     if ((index + 1) % COLS === 0) {
                         x = 0;
                         y += SPACING_Y;
                     }
                 });

                 setNodes(newNodes);
                 setEdges(newEdges);
            }

        } catch (e) {
            console.error(e);
            toast.error("Erro ao gerar diagrama");
        } finally {
            setLoading(false);
        }
    }, [executeQuery, setNodes, setEdges]);

    useEffect(() => {
        loadSchema();
    }, [loadSchema]);

    const fitView = () => {
        // ReactFlow fitView placeholder - controlled via instance if needed
    };

    return (
        <div className="w-full h-full relative bg-[#0f111a]">
            {loading && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                    <div className="animate-spin text-primary">Loading...</div>
                 </div>
            )}
            
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
            >
                <Background color="#333" gap={16} />
                <Controls />
                <MiniMap style={{ height: 120 }} zoomable pannable />
            </ReactFlow>

             {/* Navigation Legend */}
             <div className="absolute top-4 right-4 bg-card/90 backdrop-blur border border-border rounded-lg p-2 max-h-[300px] overflow-y-auto shadow-xl w-48">
                <h4 className="text-xs font-bold uppercase mb-2 text-muted-foreground sticky top-0 bg-card/90 p-1">Tabelas</h4>
                <div className="space-y-1">
                    {nodes.map(node => (
                        <button 
                            key={node.id} 
                            onClick={() => {
                                // In a full implementation, we'd use reactFlowInstance.setCenter
                                toast.info(`Selecionado: ${node.id}`);
                            }}
                            className="w-full text-left text-[10px] p-1 hover:bg-primary/10 rounded flex items-center justify-between group"
                        >
                            <span className="truncate">{node.data.label}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
