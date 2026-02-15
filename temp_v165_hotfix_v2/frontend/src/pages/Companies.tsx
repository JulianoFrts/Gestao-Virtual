import React, { useState } from 'react';
import { useCompanies, Company } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Search, Loader2, MapPin, Phone, Pencil, Trash2, ShieldCheck, Mail } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isProtectedSignal, can } from '@/signals/authSignals';
import { useSignals } from "@preact/signals-react/runtime";
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Lock } from 'lucide-react';

export default function Companies() {
    useSignals();
    const { companies, isLoading, createCompany, updateCompany, deleteCompany } = useCompanies();
    const { profile } = useAuth();
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
            description: `Deseja realmente excluir a empresa "${company.name}"? Esta ação não pode ser desfeita.`,
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

    const profileCompanyId = profile?.companyId;
    const isSA = isProtectedSignal.value;

    const filteredCompanies = React.useMemo(() => {
        return companies.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCompany = isSA || c.id === profileCompanyId;
            return matchesSearch && matchesCompany;
        });
    }, [companies, searchTerm, isSA, profileCompanyId]);

    if (isLoading) {
        return (
            <LoadingScreen 
                isLoading={true} 
                title="GESTÃO DE EMPRESAS" 
                message="SINCRONIZANDO DADOS"
                details={[
                    { label: "Empresas", isLoading: isLoading }
                ]}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold gradient-text">Gestão de Empresas</h1>
                    <p className="text-muted-foreground">Cadastre e gerencie as empresas do grupo</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    {(isProtectedSignal.value || can('system.is_corporate') || can('companies.create')) && (
                        <Button
                            className="gradient-primary text-white shadow-glow"
                            onClick={() => {
                                resetForm();
                                setIsDialogOpen(true);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Empresa
                        </Button>
                    )}
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                                    <Building2 className="text-white w-6 h-6" />
                                </div>
                                {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground pt-1">
                                Gerencie os dados cadastrais da empresa no grupo.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                            {/* Seção: Dados Cadastrais */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wider">
                                    <ShieldCheck className="w-4 h-4" />
                                    Dados Cadastrais
                                </div>
                                <Separator className="bg-white/10" />

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Nome da Empresa *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="industrial-input h-10"
                                        placeholder="Ex: Nono Engenharia"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">CNPJ / Identificação</Label>
                                    <Input
                                        value={formData.taxId}
                                        onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                        className="industrial-input h-10"
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>
                            </div>

                            {/* Seção: Contato */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm uppercase tracking-wider">
                                    <MapPin className="w-4 h-4" />
                                    Endereço e Contato
                                </div>
                                <Separator className="bg-white/10" />

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Endereço</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                        <Input
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="industrial-input pl-10 h-10"
                                            placeholder="Logradouro, Bairro, Cidade - UF"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Telefone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                        <Input
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="industrial-input pl-10 h-10"
                                            placeholder="(00) 0000-0000"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 h-11">
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 h-11 gradient-primary shadow-glow" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar empresas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 industrial-input"
                />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((company) => (
                    <Card key={company.id} className="glass-card group hover:shadow-strong transition-all overflow-hidden border-l-4 border-l-primary relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(() => {
                                const canEdit = isProtectedSignal.value || can('companies.update') || can('companies.edit_config');
                                const canDelete = isProtectedSignal.value || can('companies.delete');

                                if (!canEdit && !canDelete) {
                                    return (
                                        <div className="h-8 flex items-center px-2 bg-white/5 rounded text-muted-foreground/30" title="Sem permissão hierárquica">
                                            <Lock className="w-3.5 h-3.5 mr-1" />
                                            <span className="text-[10px] uppercase font-bold">Leitura</span>
                                        </div>
                                    );
                                }

                                return (
                                    <>
                                        {canEdit && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(company)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(company)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                    <Building2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{company.name}</CardTitle>
                                    <CardDescription>{company.taxId || 'CNPJ não informado'}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span className="truncate">{company.address || 'Endereço não cadastrado'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    <span>{company.phone || 'Sem telefone'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
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
