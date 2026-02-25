import React, { useState, useMemo } from 'react';
import { Access } from '@/components/auth/Access';
import { useCompanies, Company } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Search, Loader2, MapPin, Phone, Pencil, Trash2, ShieldCheck, Mail, Lock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Companies() {
    const { companies, isLoading, createCompany, updateCompany, deleteCompany } = useCompanies();
    const { profile, isProtected, can } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        address: '',
        phone: '',
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

    const isSA = isProtected;
    const profileCompanyId = profile?.companyId;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSaving(true);
        try {
            if (editingCompany) {
                const result = await updateCompany(editingCompany.id, formData);
                if (result.success) {
                    toast({ title: 'Empresa atualizada!' });
                    resetForm();
                }
            } else {
                const result = await createCompany(formData);
                if (result.success) {
                    toast({ title: 'Empresa cadastrada!' });
                    resetForm();
                }
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (company: Company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name,
            taxId: company.taxId || '',
            address: company.address || '',
            phone: company.phone || '',
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (company: Company) => {
        setConfirmModal({
            open: true,
            title: 'Excluir Empresa',
            description: `Deseja realmente excluir a empresa "${company.name}"? Esta ação não pode ser desfeita e removerá todos os registros associados.`,
            variant: 'destructive',
            onConfirm: async () => {
                const result = await deleteCompany(company.id);
                if (result.success) {
                    toast({ title: 'Empresa excluída!' });
                }
            }
        });
    };

    const resetForm = () => {
        setFormData({ name: '', taxId: '', address: '', phone: '' });
        setEditingCompany(null);
        setIsDialogOpen(false);
    };

    const filteredCompanies = useMemo(() => {
        return companies.filter(company => {
            const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (company.taxId && company.taxId.includes(searchTerm));
            
            const matchesCompany = isSA || company.id === profileCompanyId;
            
            return matchesSearch && matchesCompany;
        });
    }, [companies, searchTerm, isSA, profileCompanyId]);

    return (
        <div className="space-y-6 animate-fade-in view-adaptive-container h-full flex flex-col py-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-display font-bold gradient-text uppercase italic tracking-tighter">Gestão de Empresas</h1>
                    <p className="text-muted-foreground mt-1 font-medium text-sm">Cadastre e gerencie as empresas do grupo e parceiros.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <Access auth="companies.create" mode="hide">
                            <DialogTrigger asChild>
                                <Button className="gradient-primary text-white shadow-glow px-6 font-bold uppercase tracking-widest text-[10px]">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nova Empresa
                                </Button>
                            </DialogTrigger>
                        </Access>
                        <DialogContent className="max-w-md glass-card border-white/10 shadow-2xl overflow-hidden p-0">
                            <div className="absolute top-0 inset-x-0 h-1 gradient-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                            <DialogHeader className="p-6">
                                <DialogTitle className="flex items-center gap-3 text-2xl font-black italic tracking-tighter uppercase">
                                    <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                                        <Building2 className="text-white w-7 h-7" />
                                    </div>
                                    {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground font-medium pl-15">
                                    Preencha os dados cadastrais da empresa no sistema.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-5">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">Nome da Empresa / Razão Social *</Label>
                                        <div className="relative">
                                            <Access auth="companies.edit" mode="read-only">
                                                <Input
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl pr-10"
                                                    required
                                                    placeholder="Ex: Construtora Exemplo Ltda"
                                                />
                                            </Access>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">CNPJ / CPF</Label>
                                            <Input
                                                value={formData.taxId}
                                                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                                className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl"
                                                placeholder="00.000.000/0001-00"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">Telefone</Label>
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl"
                                                placeholder="(00) 0000-0000"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black tracking-widest text-primary/70 pl-1">Endereço Completo</Label>
                                        <div className="relative">
                                            <Input
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                className="industrial-input h-11 bg-black/20 border-white/5 rounded-xl pr-10"
                                                placeholder="Rua, Número, Cidade - UF"
                                            />
                                            <MapPin className="absolute right-3.5 top-3.5 w-4 h-4 text-white/20" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 border-t border-white/5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={resetForm}
                                        className="flex-1 h-12 rounded-2xl hover:bg-white/5 text-muted-foreground font-bold"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 h-12 rounded-2xl gradient-primary shadow-glow font-black uppercase tracking-widest text-xs"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa')}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest text-primary/60">Sincronizando Empresas...</p>
                </div>
            ) : (
                <div className="flex-1 overflow-auto pb-10 scrollbar-thin scrollbar-thumb-primary/20">
                    <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 mb-8">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar empresa por nome ou CNPJ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 industrial-input h-10"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map((company) => (
                            <Card key={company.id} className="glass-card group hover:shadow-strong transition-all overflow-hidden border-l-4 border-l-primary relative">
                                <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                                    <Access auth="companies.edit" mode="hide">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary bg-black/20 backdrop-blur-sm" onClick={() => handleEdit(company)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    </Access>
                                    <Access auth="companies.delete" mode="hide">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive bg-black/20 backdrop-blur-sm" onClick={() => handleDelete(company)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </Access>
                                </div>

                                <CardHeader className="pb-3 pt-6 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <Building2 className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold tracking-tight">{company.name}</CardTitle>
                                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{company.taxId || 'CNPJ não informado'}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 px-6 pb-6">
                                    <div className="space-y-2 text-sm text-muted-foreground font-medium">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-primary/40" />
                                            <span className="truncate italic">{company.address || 'Endereço não cadastrado'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4 text-primary/40" />
                                            <span>{company.phone || 'Sem telefone'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
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
