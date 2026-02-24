import React, { useState } from 'react';
import { Access } from '@/components/auth/Access';
import { useProjects, Project } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Plus, HardHat, Search, Loader2, MapPin, Building2, BadgeCheck, Pencil, Trash2, UserCircle, Briefcase, TrendingUp, Clock, Lock, Shield } from 'lucide-react';
import { isProtectedSignal, can, show } from '@/signals/authSignals';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { DelegationModal } from '@/components/projects/DelegationModal';
import { useSignals } from "@preact/signals-react/runtime";
import { applyMask, parseNumber, parseCurrency, maskNumber, maskCurrency } from '@/utils/inputValidators';


export default function Projects() {
    useSignals();
    const { projects, isLoading: projectsLoading, createProject, updateProject, deleteProject } = useProjects();
    const { companies, isLoading: companiesLoading } = useCompanies();
    const { users, isLoading: usersLoading } = useUsers();
    const isLoading = projectsLoading || companiesLoading || usersLoading;


    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        companyId: '',
        address: '',
        status: 'active',
        plannedHours: '' as string | number,
        estimatedCost: '' as string | number,
        startDate: '',
        endDate: '',
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.companyId) {
            toast({ title: 'Aviso', description: 'Nome e Empresa são obrigatórios', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave: Partial<Project> = {
                ...formData,
                plannedHours: typeof formData.plannedHours === 'string' ? parseNumber(formData.plannedHours) : formData.plannedHours,
                estimatedCost: typeof formData.estimatedCost === 'string' ? parseCurrency(formData.estimatedCost) : formData.estimatedCost,
                startDate: formData.startDate ? new Date(formData.startDate) : null,
                endDate: formData.endDate ? new Date(formData.endDate) : null,
            };

            if (editingProject) {
                const result = await updateProject(editingProject.id, dataToSave);
                if (result) {
                    resetForm();
                }
            } else {
                const result = await createProject(dataToSave);
                if (result) {
                    resetForm();
                }
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (project: Project) => {
        setEditingProject(project);
        setFormData({
            name: project.name,
            companyId: project.companyId,
            address: project.address || '',
            status: project.status,
            plannedHours: maskNumber(project.plannedHours || 0),
            estimatedCost: maskCurrency((project.estimatedCost || 0).toString()),
            startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
            endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (project: Project) => {
        setConfirmModal({
            open: true,
            title: 'Excluir Obra',
            description: `Deseja realmente excluir a obra "${project.name}"? Esta ação não pode ser desfeita e removerá todos os vínculos com canteiros e funcionários.`,
            variant: 'destructive',
            onConfirm: async () => {
                if (await deleteProject(project.id)) {
                    // Success toast is handled in the hook
                }
            }
        });
    };

    const resetForm = () => {
        setFormData({ name: '', companyId: '', address: '', status: 'active', plannedHours: '', estimatedCost: '', startDate: '', endDate: '' });
        setEditingProject(null);
        setIsDialogOpen(false);
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getCompanyName = (id: string) => companies.find(c => c.id === id)?.name || 'Empresa desconhecida';

    const getProjectManagers = (projectId: string) => {
        return users.filter(u => u.role === 'GESTOR_PROJECT' && u.projectId === projectId);
    };


    return (
        <div className="space-y-6 animate-fade-in view-adaptive-container pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold gradient-text">Gestão de Obras</h1>
                    <p className="text-muted-foreground">Gerencie as obras e vincule-as às empresas</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                }}>
                    <Access auth="projects.create" mode="hide">
                        <DialogTrigger asChild>
                            <Button className="gradient-primary text-white shadow-glow">
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Obra
                            </Button>
                        </DialogTrigger>
                    </Access>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shadow-glow">
                                    <HardHat className="text-white w-6 h-6" />
                                </div>
                                {editingProject ? 'Editar Obra' : 'Nova Obra'}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground pt-1">
                                Gerencie os detalhes da obra, planejamento e empresa responsável.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Seção: Identificação */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-accent font-semibold text-sm uppercase tracking-wider">
                                        <BadgeCheck className="w-4 h-4" />
                                        Identificação
                                    </div>
                                    <Separator className="bg-white/10" />

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-bold">Empresa Responsável *</Label>
                                        <Select value={formData.companyId} onValueChange={val => setFormData({ ...formData, companyId: val })}>
                                            <SelectTrigger className="industrial-input h-10">
                                                <SelectValue placeholder="Selecione a empresa" />
                                            </SelectTrigger>
                                            <SelectContent className="glass-card border-white/10">
                                                {companies.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-bold">Nome da Obra *</Label>
                                        <Access auth="projects.rename" mode="read-only">
                                            <Input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="industrial-input h-10 pr-10"
                                                placeholder="Ex: Edifício Horizonte"
                                                required
                                            />
                                        </Access>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-bold">Endereço</Label>
                                        <Input
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="industrial-input h-10"
                                            placeholder="Localização da obra"
                                        />
                                    </div>
                                </div>

                                {/* Seção: Planejamento */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                                        <TrendingUp className="w-4 h-4" />
                                        Planejamento (Metas)
                                    </div>
                                    <Separator className="bg-white/10" />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase text-muted-foreground font-bold italic">HHH Planejado</Label>
                                            <Input
                                                type="text"
                                                value={formData.plannedHours}
                                                onChange={e => setFormData({ ...formData, plannedHours: applyMask(e.target.value, 'number') })}
                                                className="industrial-input h-10"
                                                placeholder="Total de Horas"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase text-muted-foreground font-bold italic">Orçamento (R$)</Label>
                                            <Input
                                                type="text"
                                                value={formData.estimatedCost}
                                                onChange={e => setFormData({ ...formData, estimatedCost: applyMask(e.target.value, 'currency') })}
                                                className="industrial-input h-10"
                                                placeholder="Valor estimado"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase text-muted-foreground font-bold italic">Data Início</Label>
                                            <Input
                                                type="date"
                                                value={formData.startDate}
                                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                className="industrial-input h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase text-muted-foreground font-bold italic">Data Fim</Label>
                                            <Input
                                                type="date"
                                                value={formData.endDate}
                                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                className="industrial-input h-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground font-black">Status</Label>
                                        <Select value={formData.status} onValueChange={val => setFormData({ ...formData, status: val })}>
                                            <SelectTrigger className="industrial-input h-10">
                                                <SelectValue placeholder="Status da obra" />
                                            </SelectTrigger>
                                            <SelectContent className="glass-card border-white/10">
                                                <SelectItem value="active">Em Andamento</SelectItem>
                                                <SelectItem value="completed">Concluída</SelectItem>
                                                <SelectItem value="paused">Pausada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Nota: Delegação de Poderes foi movida para um modal próprio, acessível via botão no card da obra */}

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 h-11 border-white/10">
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 h-11 bg-accent hover:bg-accent/80 text-white shadow-glow" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    {editingProject ? 'Salvar Alterações' : 'Cadastrar Obra'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar obras..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 industrial-input"
                />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <Card key={`skeleton-${i}`} className="glass-card animate-pulse overflow-hidden border-l-4 border-l-white/5 relative h-[280px]">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-white/5 w-12 h-12" />
                                    <div className="space-y-2">
                                        <div className="h-4 w-32 bg-white/10 rounded" />
                                        <div className="h-3 w-24 bg-white/5 rounded" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                                    <div className="space-y-2">
                                        <div className="h-2 w-12 bg-white/5 rounded" />
                                        <div className="h-3 w-16 bg-white/10 rounded" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-2 w-12 bg-white/5 rounded" />
                                        <div className="h-3 w-16 bg-white/10 rounded" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-3 w-full bg-white/5 rounded" />
                                    <div className="h-3 w-2/3 bg-white/5 rounded" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : filteredProjects.map((project) => {
                    const managers = getProjectManagers(project.id);

                    return (
                        <Card key={project.id} className="glass-card group hover:shadow-strong transition-all overflow-hidden border-l-4 border-l-accent relative">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <Access auth="projects.delegate" mode="hide">
                                    <DelegationModal 
                                        projectId={project.id} 
                                        projectName={project.name}
                                        trigger={
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Delegação de Poderes">
                                                <Shield className="w-4 h-4" />
                                            </Button>
                                        }
                                    />
                                </Access>
                                <Access auth={['projects.rename', 'projects.update']} mode="hide" any>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent" onClick={() => handleEdit(project)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                </Access>
                                <Access auth="projects.delete" mode="hide">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(project)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </Access>
                            </div>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-2xl bg-accent/10 group-hover:bg-accent/20 transition-colors">
                                        <HardHat className="w-6 h-6 text-accent" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{project.name}</CardTitle>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Building2 className="w-3 h-3" />
                                            {getCompanyName(project.companyId)}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Target HHH</p>
                                        <p className="text-sm font-black flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-primary" />
                                            {project.plannedHours?.toLocaleString() || '0'}h
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Orçamento</p>
                                        <p className="text-sm font-black flex items-center gap-1">
                                            <Briefcase className="w-3 h-3 text-emerald-500" />
                                            R$ {project.estimatedCost?.toLocaleString() || '0,00'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span className="truncate">{project.address || 'Local não informado'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <BadgeCheck className={`w-4 h-4 ${project.status === 'active' ? 'text-emerald-500' : 'text-amber-500'}`} />
                                        <span className="capitalize">
                                            {project.status === 'active' ? 'Em Andamento' :
                                                project.status === 'completed' ? 'Concluída' : 'Pausada'}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-white/5 flex flex-col gap-1">
                                        <span className="text-[10px] uppercase font-bold tracking-tight text-white/40">Gestor Responsável</span>
                                        <div className="flex items-center gap-2">
                                            <UserCircle className="w-4 h-4 text-accent" />
                                            <span className="text-xs font-medium text-foreground">
                                                {managers.length > 0 ? managers.map(m => m.fullName).join(', ') : 'Não atribuído'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={confirmModal.open}
                onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
                title={confirmModal.title}
                description={confirmModal.description}
                onConfirm={confirmModal.onConfirm}
                variant={confirmModal.variant}
            />
        </div>
    );
}
