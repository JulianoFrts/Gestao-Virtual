import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Table, Save, ArrowRight } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Column {
    name: string;
    type: string;
    isPk: boolean;
    isNullable: boolean;
}

interface CreateTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tableName: string, columns: Column[]) => void;
}

export function CreateTableModal({
    isOpen,
    onClose,
    onConfirm
}: CreateTableModalProps) {
    const [tableName, setTableName] = useState('');
    const [columns, setColumns] = useState<Column[]>([
        { name: 'id', type: 'uuid', isPk: true, isNullable: false }
    ]);

    const addColumn = () => {
        setColumns([...columns, { name: '', type: 'text', isPk: false, isNullable: true }]);
    };

    const removeColumn = (index: number) => {
        setColumns(columns.filter((_, i) => i !== index));
    };

    const updateColumn = (index: number, field: keyof Column, value: any) => {
        const newColumns = [...columns];
        newColumns[index] = { ...newColumns[index], [field]: value };
        setColumns(newColumns);
    };

    const handleConfirm = () => {
        if (!tableName.trim()) return;
        if (columns.some(c => !c.name.trim())) return;
        onConfirm(tableName, columns);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-[#0c0c0e] border-white/10 p-0 overflow-hidden rounded-3xl shadow-2xl backdrop-blur-xl">
                <div className="p-8 border-b border-white/5 bg-linear-to-br from-cyan-500/10 to-transparent">
                    <DialogHeader className="flex flex-row items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center ring-1 ring-cyan-500/20 shadow-premium">
                            <Table className="text-cyan-500 w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                                Nova Tabela
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium">
                                Defina o nome e as colunas da sua nova tabela
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8">
                    {/* Table Name */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Nome da Tabela</label>
                        <Input 
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            placeholder="ex: profiles, products, orders..."
                            className="bg-white/5 border-white/10 h-12 rounded-xl text-lg font-bold"
                        />
                    </div>

                    {/* Columns List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Definição de Colunas</label>
                            <Button variant="ghost" size="sm" onClick={addColumn} className="text-cyan-500 hover:text-cyan-400 font-bold text-[10px] uppercase gap-2">
                                <Plus className="w-3 h-3" /> Adicionar Coluna
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {columns.map((col, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 group transition-all hover:border-white/10">
                                    <Input 
                                        value={col.name}
                                        onChange={(e) => updateColumn(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="nome_da_coluna"
                                        className="h-10 bg-transparent border-none font-bold text-slate-200 focus-visible:ring-0"
                                    />

                                    <Select 
                                        value={col.type} 
                                        onValueChange={(val) => updateColumn(idx, 'type', val)}
                                    >
                                        <SelectTrigger className="w-[180px] h-10 bg-black/40 border-white/5 rounded-xl text-xs font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10">
                                            <SelectItem value="uuid">UUID</SelectItem>
                                            <SelectItem value="text">TEXT</SelectItem>
                                            <SelectItem value="varchar(255)">VARCHAR(255)</SelectItem>
                                            <SelectItem value="integer">INTEGER</SelectItem>
                                            <SelectItem value="numeric">NUMERIC</SelectItem>
                                            <SelectItem value="boolean">BOOLEAN</SelectItem>
                                            <SelectItem value="timestamp">TIMESTAMP</SelectItem>
                                            <SelectItem value="jsonb">JSONB</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <div className="flex items-center gap-6 px-4 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <Checkbox 
                                                id={`pk-${idx}`} 
                                                checked={col.isPk} 
                                                onCheckedChange={(val) => updateColumn(idx, 'isPk', val)} 
                                            />
                                            <label htmlFor={`pk-${idx}`} className="text-[9px] font-black uppercase text-slate-500 cursor-pointer">PK</label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox 
                                                id={`null-${idx}`} 
                                                checked={col.isNullable} 
                                                onCheckedChange={(val) => updateColumn(idx, 'isNullable', val)} 
                                            />
                                            <label htmlFor={`null-${idx}`} className="text-[9px] font-black uppercase text-slate-500 cursor-pointer">NULL</label>
                                        </div>
                                    </div>

                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeColumn(idx)}
                                        className="text-slate-600 hover:text-rose-500 rounded-xl"
                                        disabled={columns.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 border-t border-white/5 bg-black/40 flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">CANCELAR</Button>
                    <Button 
                        onClick={handleConfirm}
                        className="rounded-xl h-12 px-10 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-glow-cyan/20 flex gap-3"
                    >
                        PREPARAR SQL <ArrowRight className="w-5 h-5" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
