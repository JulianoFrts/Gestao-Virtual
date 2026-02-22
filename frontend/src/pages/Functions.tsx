import React, { useState, useRef } from 'react';
import { Access } from '@/components/auth/Access';
import { useJobFunctions } from '@/hooks/useJobFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Briefcase, Crown, Search, FileUp as FileUpIcon, FileDown, Loader2, TrendingUp, Copy, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useAuth } from '@/contexts/AuthContext';
import { orionApi } from '@/integrations/orion/client';
import { monitorJob, updateJobState } from '@/signals/jobSignals';
import { isProtectedSignal, can } from '@/signals/authSignals';
import { useSignals } from "@preact/signals-react/runtime";
import { ImportJobFunctionsModal } from '@/components/functions/ImportJobFunctionsModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface JobFunction {
    id: string;
    name: string;
    description?: string;
    canLeadTeam: boolean;
    hierarchyLevel?: number;
    laborType?: string;
    companyId?: string | null;
    isTemplate?: boolean;
}

export default function Functions() {
    useSignals();
    const { functions, isLoading, createFunction, updateFunction, deleteFunction } = useJobFunctions();
    const { profile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingFunction, setEditingFunction] = useState<JobFunction | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        canLeadTeam: false,
        hierarchyLevel: 0,
        laborType: '',
        isTemplate: false,
    });
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void | Promise<void>;
        variant: 'default' | 'destructive';
    }>({
        open: false,
        title: '',
        description: '',
        onConfirm: () => { },
        variant: 'default'
    });
    const { toast } = useToast();
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB


    const sanitizeCSVValue = (value: string): string => {
        // Remove leading special chars that could trigger formulas (CSV injection prevention)
        return value.replace(/^[=+\-@\t\r]/g, '').trim();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limpa o valor para permitir re-upload do mesmo arquivo
        e.target.value = '';
        
        // Simplesmente abrimos o modal, o processamento ocorre lá agora
        setIsImportModalOpen(true);
    };

    const downloadTemplate = () => {
        const headers = ['SEQUENCIA', 'Funcao', 'Descricao', 'Pode Liderar? (sim/nao)', 'Nivel (Peso Hierarquico 0-100)', 'Mao de Obra (MOI/MOD)'];
        const examples = [
            ['1', 'Encarregado', 'Líder de equipe de campo', 'sim', '6', 'MOI'],
            ['2', 'Ajudante', 'Auxiliar em diversas tarefas', 'nao', '1', 'MOD']
        ];

        const csvContent = [
            headers.join(';'),
            ...examples.map(row => row.join(';'))
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'template_importacao_funcoes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: 'Template baixado',
            description: 'Preencha o arquivo para importar seus cargos.',
        });
    };

    const GLOBAL_MANAGEMENT_ROLES = [
        'SUPER_ADMIN_GOD',
        'SOCIO_DIRETOR',
        'TI_SOFTWARE',
        'ADMIN',
        'HELPER_SYSTEM',
    ];

    const isGlobalManager = profile?.role && GLOBAL_MANAGEMENT_ROLES.includes(profile.role);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast({
                title: 'Erro',
                description: 'O nome da função é obrigatório',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);

        try {
            const dataToSave = {
                ...formData,
                companyId: formData.isTemplate ? null : profile?.companyId,
            };

            if (editingFunction) {
                const result = await updateFunction(editingFunction.id, dataToSave);
                if (result.success) {
                    toast({
                        title: 'Função atualizada!',
                        description: `A função "${formData.name}" foi atualizada com sucesso.`,
                    });
                }
            } else {
                const result = await createFunction(dataToSave);
                if (result.success) {
                    toast({
                        title: 'Função criada!',
                        description: `A função "${formData.name}" foi adicionada com sucesso.`,
                    });
                }
            }
            resetForm();
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (func: { id: string; name: string }) => {
        setConfirmModal({
            open: true,
            title: 'Excluir Função',
            description: `Deseja realmente remover a função "${func.name}"? Esta ação não pode ser desfeita e pode afetar funcionários vinculados.`,
            variant: 'destructive',
            onConfirm: async () => {
                const result = await deleteFunction(func.id);
                if (result.success) {
                    toast({
                        title: 'Função removida',
                        description: `A função "${func.name}" foi removida.`,
                    });
                }
            }
        });
    };

    const handleCopy = (func: JobFunction) => {
        setEditingFunction(null); // Estamos criando uma nova
        setFormData({
            name: `${func.name} (Cópia)`,
            description: func.description || '',
            canLeadTeam: func.canLeadTeam,
            hierarchyLevel: func.hierarchyLevel || 0,
            laborType: func.laborType || '',
            isTemplate: false,
        });
        setIsDialogOpen(true);
        toast({
            title: 'Modelo copiado',
            description: 'Ajuste os detalhes e salve para criar na sua empresa.',
        });
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', canLeadTeam: false, hierarchyLevel: 0, laborType: '', isTemplate: false });
        setEditingFunction(null);
        setIsDialogOpen(false);
    };

    const filteredFunctions = functions.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pr-2">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
                <div className="w-full xl:w-auto">
                    <h1 className="text-3xl font-display font-bold gradient-text">Gestão de Funções</h1>
                    <p className="text-muted-foreground">Gerencie cargos, hierarquia e permissões de liderança</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                    <Access auth="functions.update" mode="hide">
                        <>
                            <Button 
                                variant="outline" 
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex-1 md:flex-auto border-primary/20 hover:bg-primary/5 text-primary-foreground/80 min-w-[140px]"
                            >
                                <FileUpIcon className="w-4 h-4 mr-2" />
                                Importar CSV
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={downloadTemplate}
                                className="flex-1 md:flex-auto border-white/10 hover:bg-white/5 min-w-[140px]"
                            >
                                <FileDown className="w-4 h-4 mr-2" />
                                Template
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileUpload}
                            />
                        </>
                    </Access>

                    <Access auth="functions.create" mode="hide">
                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            if (!open) resetForm();
                            setIsDialogOpen(open);
                        }}>
                            <DialogTrigger asChild>
                                <Button className="gradient-primary text-white shadow-glow border-none">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nova Função
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[95%] max-w-md mx-auto h-auto max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                                            <Briefcase className="text-white w-6 h-6" />
                                        </div>
                                        {editingFunction ? 'Editar Função' : 'Nova Função'}
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground pt-1">
                                        Defina as atribuições e o nível hierárquico da função.
                                    </DialogDescription>
                                </DialogHeader>

                                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                                    {/* Seção: Identificação */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                                            <Briefcase className="w-4 h-4" />
                                            Identificação
                                        </div>
                                        <Separator className="bg-white/10" />

                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-xs uppercase text-muted-foreground font-bold">Nome da Função *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="Ex: Engenheiro Civil"
                                                className="industrial-input h-10"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description" className="text-xs uppercase text-muted-foreground font-bold">Descrição</Label>
                                            <Input
                                                id="description"
                                                value={formData.description}
                                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                placeholder="Breve descrição das responsabilidades"
                                                className="industrial-input h-10 w-full"
                                            />
                                        </div>
                                    </div>

                                    {/* Seção: Configurações */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm uppercase tracking-wider">
                                            <TrendingUp className="w-4 h-4" />
                                            Hierarquia e Liderança
                                        </div>
                                        <Separator className="bg-white/10" />

                                        {isGlobalManager && !editingFunction && (
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <Globe className="w-5 h-5 text-primary" />
                                                    <div className="flex flex-col">
                                                        <Label htmlFor="isTemplate" className="cursor-pointer font-bold text-sm">Função Modelo (Global)</Label>
                                                        <span className="text-[10px] text-muted-foreground">Disponível para todas as empresas copiarem</span>
                                                    </div>
                                                </div>
                                                <Checkbox
                                                    id="isTemplate"
                                                    checked={formData.isTemplate}
                                                    onCheckedChange={(checked) =>
                                                        setFormData(prev => ({ ...prev, isTemplate: checked as boolean }))
                                                    }
                                                />
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <Crown className="w-5 h-5 text-amber-500" />
                                                <div className="flex flex-col">
                                                    <Label htmlFor="canLeadTeam" className="cursor-pointer font-bold text-sm">Poder de Liderança</Label>
                                                    <span className="text-[10px] text-muted-foreground">Esta função pode gerenciar equipes de campo</span>
                                                </div>
                                            </div>
                                            <Checkbox
                                                id="canLeadTeam"
                                                checked={formData.canLeadTeam}
                                                onCheckedChange={(checked) =>
                                                    setFormData(prev => ({ ...prev, canLeadTeam: checked as boolean }))
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="level" className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                                                Nível de Peso Hierárquico (0-100)
                                            </Label>
                                            <Input
                                                id="level"
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.hierarchyLevel}
                                                onChange={(e) => setFormData(prev => ({ ...prev, hierarchyLevel: parseInt(e.target.value) || 0 }))}
                                                className="industrial-input h-10"
                                            />
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label htmlFor="labor_type" className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                                               Mão de Obra (MOI/MOD)
                                            </Label>
                                            <Select 
                                                value={formData.laborType || ''} 
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, laborType: val }))}
                                            >
                                                <SelectTrigger className="industrial-input h-10 border-white/10 bg-white/5">
                                                    <SelectValue placeholder="Selecione o tipo..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1a1a1c] border-white/10 text-white">
                                                    <SelectItem value="MOD">MOD - Mão de Obra Direta</SelectItem>
                                                    <SelectItem value="MOI">MOI - Mão de Obra Indireta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <Button type="button" variant="outline" onClick={resetForm} className="w-[48%] flex-1 h-11">
                                            Cancelar
                                        </Button>
                                        <Button type="submit" className="w-[48%] flex-1 h-11 gradient-primary shadow-glow" disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                            {editingFunction ? 'Salvar Alterações' : formData.isTemplate ? 'Criar Modelo Global' : 'Criar Função'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </Access>
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-1/2 lg:w-[40%] xl:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar funções..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 industrial-input w-full"
                />
            </div>

            {/* Functions Table */}
            {filteredFunctions.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="py-12 text-center">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-medium">Nenhuma função encontrada</h3>
                        <p className="text-muted-foreground mt-1">
                            {searchTerm ? 'Tente outro termo de busca' : 'Crie sua primeira função para começar'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="relative rounded-2xl border border-white/10 bg-card/30 backdrop-blur-md overflow-hidden shadow-premium">
                    <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl border-b border-white/10">
                                <TableRow className="hover:bg-transparent border-white/10 border-b-0">
                                    <TableHead className="w-[80px] text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 py-5 px-6">LVL</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 py-5 px-6">Função & Atribuições</TableHead>
                                    <TableHead className="hidden md:table-cell text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 py-5 px-6">Descrição Técnica</TableHead>
                                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 py-5 px-6">Soberania</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 py-5 px-6">Gestão</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFunctions.map((func) => {
                                    const isTemplate = !func.companyId;
                                    const canEditFunc = can('functions.update') || (isTemplate && isGlobalManager);
                                    const canDeleteFunc = can('functions.delete') || (isTemplate && isGlobalManager);
                                    
                                    return (
                                        <TableRow 
                                            key={func.id} 
                                            className={cn(
                                                "group border-white/5 transition-colors duration-200",
                                                canEditFunc ? "cursor-pointer hover:bg-white/5" : "cursor-default"
                                            )}
                                                onClick={() => {
                                                    if (!canEditFunc) return;
                                                    setEditingFunction(func);
                                                    setFormData({
                                                    name: func.name,
                                                    description: func.description || '',
                                                    canLeadTeam: func.canLeadTeam,
                                                    hierarchyLevel: func.hierarchyLevel || 0,
                                                    laborType: func.laborType || '',
                                                    isTemplate: !func.companyId,
                                                });
                                                
                                                    setIsDialogOpen(true);
                                                }}
                                        >
                                            <TableCell className="py-4 px-6 font-mono text-[10px] whitespace-nowrap">
                                                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold">
                                                    LV {func.hierarchyLevel || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 font-bold text-sm text-white group-hover:text-primary transition-colors">
                                                        {func.name}
                                                        {isTemplate && (
                                                            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 text-[9px] h-4 font-black uppercase tracking-tighter">
                                                                Global
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell py-4 px-6 text-xs text-muted-foreground max-w-[300px] truncate">
                                                {func.description || '-'}
                                            </TableCell>
                                            <TableCell className="py-4 px-6 text-center">
                                                {func.canLeadTeam ? (
                                                    <div className="flex justify-center">
                                                        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-[0_0_10px_-2px_rgba(245,158,11,0.3)]">
                                                            <Crown className="w-3.5 h-3.5" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/30 font-mono text-[10px]">Não</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                                                    {isTemplate && !isGlobalManager ? (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(func);
                                                            }}
                                                            className="h-8 w-8 bg-primary/5 border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-primary"
                                                            title="Copiar para Empresa"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            {canEditFunc && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-white/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingFunction(func);
                                                                        setFormData({
                                                                            name: func.name,
                                                                            description: func.description || '',
                                                                            canLeadTeam: func.canLeadTeam,
                                                                            hierarchyLevel: func.hierarchyLevel || 0,
                                                                            laborType: func.laborType || '',
                                                                            isTemplate: !func.companyId,
                                                                        });
                                                                        setIsDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            {canDeleteFunc && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(func);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={confirmModal.open}
                onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
                title={confirmModal.title}
                description={confirmModal.description}
                onConfirm={confirmModal.onConfirm}
                variant={confirmModal.variant}
            />

            <ImportJobFunctionsModal 
                open={isImportModalOpen}
                onOpenChange={setIsImportModalOpen}
                companyId={profile?.companyId || null}
            />
        </div>
    );
}

