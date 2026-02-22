import * as React from 'react';
import { Access } from '@/components/auth/Access';
import { useTeams } from '@/hooks/useTeams';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useEmployees } from '@/hooks/useEmployees';
import { useSites } from '@/hooks/useSites';
import { useCompanies } from '@/hooks/useCompanies';
import { useProjects } from '@/hooks/useProjects';
import { useJobFunctions } from '@/hooks/useJobFunctions';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Users, Search, Crown, AlertCircle, Loader2, Lock, Check, ChevronsUpDown, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { isProtectedSignal, can, selectedContextSignal } from '@/signals/authSignals';
import { useSignals } from "@preact/signals-react/runtime";
import { ProjectSelector } from '@/components/shared/ProjectSelector';
import { ProjectEmptyState } from '@/components/shared/ProjectEmptyState';
import { useNavigate } from 'react-router-dom';

export default function Teams() {
    useSignals();
    const { profile: currentUserProfile } = useAuth();
    const navigate = useNavigate();
    const { teams, isLoading, createTeam, updateTeam, deleteTeam } = useTeams();
    const { employees } = useEmployees();
    const { sites } = useSites();
    const { projects } = useProjects();
    const { companies } = useCompanies();
    const { functions } = useJobFunctions();
    const [searchTerm, setSearchTerm] = React.useState('');
    
    // Context from Global Signal
    const selectedContext = selectedContextSignal.value;
    const filterCompany = selectedContext?.companyId || 'all';
    const filterProject = selectedContext?.projectId || 'all';
    const filterSite = selectedContext?.siteId || 'all';

    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingTeam, setEditingTeam] = React.useState<any>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [formData, setFormData] = React.useState({
        name: '',
        supervisorId: '',
        members: [] as string[],
        siteId: filterSite !== 'all' ? filterSite : '',
        companyId: filterCompany !== 'all' ? filterCompany : '',
        projectId: filterProject !== 'all' ? filterProject : ''
    });
    const [memberSearchTerm, setMemberSearchTerm] = React.useState('');
    const [supervisorSearchOpen, setSupervisorSearchOpen] = React.useState(false);
    const [confirmModal, setConfirmModal] = React.useState<{
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

    const activeEmployees = employees.filter(e => e.isActive);

    // Get employees already in other teams
    const getEmployeesInOtherTeams = () => {
        const employeesInTeams = new Set<string>();
        teams.forEach(team => {
            if (team.id !== editingTeam?.id) { // Exclude current team when editing
                team.members?.forEach(memberId => employeesInTeams.add(memberId));
            }
        });
        return employeesInTeams;
    };

    // Get supervisors already leading other teams
    const getSupervisorsInOtherTeams = () => {
        const supervisorsInTeams = new Set<string>();
        teams.forEach(team => {
            if (team.id !== editingTeam?.id && team.supervisorId) {
                supervisorsInTeams.add(team.supervisorId);
            }
        });
        return supervisorsInTeams;
    };

    // Filter employees by selected site
    const availableEmployees = React.useMemo(() => {
        if (!formData.siteId) return [];

        const selectedSite = sites.find(s => s.id === formData.siteId);
        if (!selectedSite) return activeEmployees;

        // Filter employees from the same site and company
        return activeEmployees.filter(emp => {
            return emp.siteId === formData.siteId || emp.companyId === selectedSite.companyId;
        });
    }, [activeEmployees, formData.siteId, sites]);

    // Filter employees who can lead teams (have a function with canLeadTeam = true)
    const availableSupervisors = React.useMemo(() => {
        return availableEmployees.filter(emp => {
            if (!emp.functionId) return false;
            const empFunction = functions.find(f => f.id === emp.functionId);
            return empFunction?.canLeadTeam === true;
        });
    }, [availableEmployees, functions]);

    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.fullName || 'Desconhecido';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast({ title: 'Erro', description: 'O nome da equipe é obrigatório', variant: 'destructive' });
            return;
        }

        setIsSaving(true);

        try {
            const selectedSite = sites.find(s => s.id === formData.siteId);
            const companyId = formData.companyId || selectedSite?.companyId || companies[0]?.id;

            if (editingTeam) {
                const result = await updateTeam(editingTeam.id, {
                    name: formData.name,
                    supervisorId: formData.supervisorId || undefined,
                    members: formData.members,
                    siteId: formData.siteId || undefined,
                    companyId: companyId
                });
                if (result.success) {
                    toast({ title: 'Equipe atualizada!' });
                }
            } else {
                const result = await createTeam({
                    name: formData.name,
                    supervisorId: formData.supervisorId || undefined,
                    members: formData.members,
                    siteId: formData.siteId || undefined,
                    companyId: companyId
                });
                if (result.success) {
                    toast({ title: 'Equipe criada!' });
                }
            }
            resetForm();
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            supervisorId: '',
            members: [],
            siteId: '',
            companyId: '',
            projectId: ''
        });
        setEditingTeam(null);
        setMemberSearchTerm('');
        setIsDialogOpen(false);
    };

    const handleDelete = async (team: any) => {
        setConfirmModal({
            open: true,
            title: 'Excluir Equipe',
            description: `Deseja realmente excluir a equipe "${team.name}"? Esta ação removerá a organização da equipe mas não excluirá os funcionários.`,
            variant: 'destructive',
            onConfirm: async () => {
                const result = await deleteTeam(team.id);
                if (result.success) {
                    toast({ title: 'Equipe excluída' });
                }
            }
        });
    };

    const toggleMember = (id: string) => {
        const employeesInOtherTeams = getEmployeesInOtherTeams();

        // Check if employee is already in another team
        if (!formData.members.includes(id) && employeesInOtherTeams.has(id)) {
            toast({
                title: 'Funcionário já está em outra equipe',
                description: 'Um funcionário não pode estar em múltiplas equipes simultaneamente.',
                variant: 'destructive'
            });
            return;
        }

        // Ensure leader cannot be removed from members
        if (id === formData.supervisorId && formData.members.includes(id)) {
            toast({
                title: 'O líder deve ser membro da equipe',
                description: 'Para remover este funcionário dos membros, você deve primeiro alterar o supervisor da equipe.',
                variant: 'destructive'
            });
            return;
        }

        setFormData(p => ({
            ...p,
            members: p.members.includes(id)
                ? p.members.filter(m => m !== id)
                : [...p.members, id]
        }));
    };

    const filteredTeams = teams.filter(t => {
        const matchesSearch = (t.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCompany = filterCompany === 'all' || t.companyId === filterCompany;

        // Find project through site if not explicitly labeled (assume schema support or resolve manually)
        const site = sites.find(s => s.id === t.siteId);
        const matchesProject = filterProject === 'all' || site?.projectId === filterProject;
        const matchesSite = filterSite === 'all' || t.siteId === filterSite;

        return matchesSearch && matchesCompany && matchesProject && matchesSite;
    });

    if (isLoading) {
        return (
            <LoadingScreen 
                isLoading={true} 
                title="GESTÃO DE EQUIPES" 
                message="SINCRONIZANDO ESTRUTURAS"
                details={[
                    { label: "Equipes", isLoading: isLoading },
                    { label: "Funcionários", isLoading: false }, // Assuming other data is fast or not tracked individually here
                ]}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in view-adaptive-container py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (!open) resetForm();
                    setIsDialogOpen(open);
                }}>
                    <Access auth="teams.create" mode="hide">
                        <DialogTrigger asChild>
                            <Button className="gradient-primary text-white shadow-glow">
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Equipe
                            </Button>
                        </DialogTrigger>
                    </Access>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingTeam ? 'Editar' : 'Nova'} Equipe</DialogTitle>
                            <DialogDescription>Preencha os dados da equipe de trabalho</DialogDescription>
                        </DialogHeader>

                        {activeEmployees.length === 0 ? (
                            <div className="p-6 text-center space-y-3 bg-muted/20 rounded-lg">
                                <AlertCircle className="w-10 h-10 text-warning mx-auto" />
                                <p className="text-sm font-medium">Nenhum funcionário ativo</p>
                                <p className="text-xs text-muted-foreground">Cadastre e ative funcionários antes de montar uma equipe.</p>
                                <Button variant="outline" size="sm" onClick={() => window.location.href = '/employees'}>Ir para Funcionários</Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome da Equipe *</Label>
                                    <Input
                                        placeholder="Ex: Equipe de Alvenaria"
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        className="industrial-input"
                                    />
                                </div>

                                {can('system.is_corporate') && (
                                    <div className="space-y-2">
                                        <Label>Empresa Afiliada *</Label>
                                        <Select
                                            value={formData.companyId}
                                            onValueChange={v => setFormData(p => ({ ...p, companyId: v, projectId: '', siteId: '', supervisorId: '', members: [] }))}
                                        >
                                            <SelectTrigger className="industrial-input">
                                                <SelectValue placeholder="Selecione a empresa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {companies.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Obra Vinculada *</Label>
                                    <Select
                                        value={formData.projectId}
                                        onValueChange={v => setFormData(p => ({ ...p, projectId: v, siteId: '', supervisorId: '', members: [] }))}
                                        disabled={(!formData.companyId && can('system.is_corporate'))}
                                    >
                                        <SelectTrigger className="industrial-input">
                                            <SelectValue placeholder="Selecione a obra" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects
                                                .filter(p => !formData.companyId || p.companyId === formData.companyId)
                                                .map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Canteiro / Unidade *</Label>
                                    <Select
                                        value={formData.siteId}
                                        onValueChange={v => setFormData(p => ({ ...p, siteId: v, supervisorId: '', members: [] }))}
                                        disabled={!formData.projectId}
                                    >
                                        <SelectTrigger className="industrial-input">
                                            <SelectValue placeholder="Selecione o local" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sites
                                                .filter(s => s.projectId === formData.projectId)
                                                .map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Supervisor (Líder)</Label>
                                    {!formData.siteId && (
                                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-600">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Selecione um canteiro primeiro</span>
                                        </div>
                                    )}
                                    {formData.siteId && availableSupervisors.length === 0 && (
                                        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-600">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Nenhum funcionário com função de liderança disponível neste canteiro</span>
                                        </div>
                                    )}
                                    <Popover open={supervisorSearchOpen} onOpenChange={setSupervisorSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={supervisorSearchOpen}
                                                className="w-full justify-between industrial-input h-10 font-normal"
                                                disabled={!formData.siteId}
                                            >
                                                {formData.supervisorId ? (
                                                    <div className="flex items-center gap-2">
                                                        <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                                        <span>{getEmployeeName(formData.supervisorId)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">Selecione um líder...</span>
                                                )}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0 border-slate-800" align="start">
                                            <Command className="bg-slate-900 text-slate-200">
                                                <CommandInput placeholder="Procurar líder..." className="h-9" />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum líder encontrado.</CommandEmpty>
                                                    <CommandGroup heading="Lideranças Disponíveis">
                                                        {availableSupervisors.map((e) => {
                                                            const supervisorsInOtherTeams = getSupervisorsInOtherTeams();
                                                            const isLeadingOtherTeam = supervisorsInOtherTeams.has(e.id);
                                                            return (
                                                                <CommandItem
                                                                    key={e.id}
                                                                    value={e.fullName}
                                                                    onSelect={() => {
                                                                        const supervisorsInOtherTeams = getSupervisorsInOtherTeams();
                                                                        if (supervisorsInOtherTeams.has(e.id)) {
                                                                            toast({
                                                                                title: 'Líder já está em outra equipe',
                                                                                description: 'Este funcionário já é líder de outra equipe.',
                                                                                variant: 'destructive'
                                                                            });
                                                                            return;
                                                                        }
                                                                        setFormData(p => {
                                                                            const newMembers = [...p.members];
                                                                            if (!newMembers.includes(e.id)) {
                                                                                newMembers.push(e.id);
                                                                            }
                                                                            return { ...p, supervisorId: e.id, members: newMembers };
                                                                        });
                                                                        setSupervisorSearchOpen(false);
                                                                    }}
                                                                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-800"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                                                        <span>{e.fullName}</span>
                                                                        <span className="text-[10px] text-muted-foreground uppercase">{e.functionName}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isLeadingOtherTeam && (
                                                                            <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                                                Líder de outra equipe
                                                                            </span>
                                                                        )}
                                                                        <Check
                                                                            className={cn(
                                                                                "h-4 w-4 text-primary",
                                                                                formData.supervisorId === e.id ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                    </div>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>Membros da Equipe ({formData.members.length})</Label>
                                    {!formData.siteId && (
                                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-600">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Selecione um canteiro primeiro para ver os funcionários disponíveis</span>
                                        </div>
                                    )}
                                    <div className="relative mb-2">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                        <Input
                                            placeholder="Procurar membro..."
                                            value={memberSearchTerm}
                                            onChange={e => setMemberSearchTerm(e.target.value)}
                                            className="pl-7 h-8 text-[11px] industrial-input"
                                        />
                                    </div>
                                    <ScrollArea className="h-48 border rounded-lg p-3 bg-muted/10">
                                        <div className="space-y-1">
                                            {availableEmployees
                                                .filter(e => e.fullName.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                                                .map(e => {
                                                    const employeesInOtherTeams = getEmployeesInOtherTeams();
                                                    const isInOtherTeam = employeesInOtherTeams.has(e.id);
                                                    const isDisabled = isInOtherTeam && !formData.members.includes(e.id);

                                                    return (
                                                        <div
                                                            key={e.id}
                                                            className={`flex items-center gap-3 p-2 rounded-md transition-colors ${isDisabled
                                                                ? 'opacity-50 cursor-not-allowed bg-muted/20'
                                                                : 'hover:bg-muted/50'
                                                                }`}
                                                        >
                                                            <Checkbox
                                                                id={`emp-check-${e.id}`}
                                                                checked={formData.members.includes(e.id)}
                                                                onCheckedChange={() => toggleMember(e.id)}
                                                                disabled={isDisabled}
                                                            />
                                                            <label
                                                                htmlFor={`emp-check-${e.id}`}
                                                                className="text-sm flex-1 cursor-pointer select-none py-1 flex items-center justify-between"
                                                            >
                                                                <span>{e.fullName}</span>
                                                                {isInOtherTeam && !formData.members.includes(e.id) && (
                                                                    <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                                                                        Em outra equipe
                                                                    </span>
                                                                )}
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </ScrollArea>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
                                    <Button type="submit" className="flex-1 gradient-primary text-white" disabled={isSaving}>
                                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {editingTeam ? 'Salvar Alterações' : 'Criar Equipe'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Barra de Filtros */}
            <div className="flex items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-white/5">
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar equipes..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 industrial-input h-10"
                    />
                </div>
            </div>

            {filteredTeams.length === 0 ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <ProjectEmptyState
                        type="workers"
                        title="Nenhuma Equipe Encontrada"
                        description="Você ainda não possui equipes estruturadas para suas obras atuais. Organize seus colaboradores em frentes de trabalho."
                        onAction={() => setIsDialogOpen(true)}
                        actionLabel="Criar Primeira Equipe"
                        hideAction={false}
                    />
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeams.map(team => (
                        <Card key={team.id} className="glass-card hover:shadow-strong transition-all group">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Users className="w-5 h-5 text-primary" />
                                    {team.name}
                                </CardTitle>
                                {team.supervisorName && (
                                    <CardDescription className="flex items-center gap-1.5 mt-1 font-medium text-foreground/80">
                                        <Crown className="w-3.5 h-3.5 text-yellow-500" />
                                        {team.supervisorName}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {team.members.length} {team.members.length === 1 ? 'membro cadastrado' : 'membros cadastrados'}
                                </p>
                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <Access auth="teams.update" mode="hide">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => {
                                                const site = sites.find(s => s.id === team.siteId);
                                                setEditingTeam(team);
                                                setFormData({
                                                    name: team.name,
                                                    supervisorId: team.supervisorId || '',
                                                    members: team.members,
                                                    siteId: team.siteId || '',
                                                    companyId: team.companyId || site?.companyId || '',
                                                    projectId: site?.projectId || ''
                                                });
                                                setIsDialogOpen(true);
                                            }}
                                        >
                                            <Pencil className="w-4 h-4 mr-1" />
                                            Editar
                                        </Button>
                                    </Access>
                                    <Access auth="teams.delete" mode="hide">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleDelete(team)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Excluir
                                        </Button>
                                    </Access>
                                </div>

                            </CardContent>
                        </Card>
                    ))}
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
        </div>
    );
}
