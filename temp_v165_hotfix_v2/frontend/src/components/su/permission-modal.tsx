import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/integrations/database';
import { toast } from 'sonner';
import { Shield, Save, Plus, Trash2, Lock } from 'lucide-react';
import { ConstructionDocument } from '@/hooks/useConstructionDocuments';

interface PermissionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: ConstructionDocument;
    onSave: (docId: string, permissions: any) => Promise<void>;
}

interface PermissionRule {
    roleId: string; // The level name or ID
    canView: boolean;
    canEdit: boolean; // Upload, Rename
    canDelete: boolean;
}

export function FolderPermissionsModal({ open, onOpenChange, document, onSave }: PermissionModalProps) {
    const [permissions, setPermissions] = useState<PermissionRule[]>([]);
    const [availableRoles, setAvailableRoles] = useState<{ id: string, name: string }[]>([]);
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchRoles = async () => {
            const { data } = await db.from('permission_levels').select('id, name').order('rank');
            if (data) setAvailableRoles(data);
        };
        fetchRoles();
    }, []);

    useEffect(() => {
        if (open && document) {
            // Load existing permissions from metadata
            const existing = document.metadata?.permissions || [];
            // Ensure format
            setPermissions(Array.isArray(existing) ? existing : []);
        }
    }, [open, document]);

    const handleAddRule = () => {
        if (!selectedRole) return;
        if (permissions.some(p => p.roleId === selectedRole)) {
            toast.error("Esta regra já existe.");
            return;
        }

        setPermissions(prev => [...prev, {
            roleId: selectedRole,
            canView: true,
            canEdit: false,
            canDelete: false
        }]);
        setSelectedRole('');
    };

    const handleRemoveRule = (roleId: string) => {
        setPermissions(prev => prev.filter(p => p.roleId !== roleId));
    };

    const updateRule = (roleId: string, field: keyof PermissionRule, value: boolean) => {
        setPermissions(prev => prev.map(p =>
            p.roleId === roleId ? { ...p, [field]: value } : p
        ));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onSave(document.id, { permissions });
            onOpenChange(false);
            toast.success("Permissões atualizadas com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar permissões.");
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleName = (id: string) => availableRoles.find(r => r.name === id || r.id === id)?.name || id;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl glass-card border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="size-5 text-primary" />
                        Permissões da Pasta
                    </DialogTitle>
                    <DialogDescription>
                        Configurando acesso para: <span className="font-bold text-white">{document?.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                            <Label>Adicionar Regra para Cargo/Nível</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger className="industrial-input">
                                    <SelectValue placeholder="Selecione um nível..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoles
                                        .filter(r => !permissions.some(p => p.roleId === r.name))
                                        .map(role => (
                                            <SelectItem key={role.id} value={role.name}>
                                                {role.name}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleAddRule} disabled={!selectedRole} className="gradient-primary mb-0.5">
                            <Plus className="size-4 mr-2" /> Adicionar
                        </Button>
                    </div>

                    <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Nível</TableHead>
                                    <TableHead className="text-center w-20">Ver</TableHead>
                                    <TableHead className="text-center w-20">Editar</TableHead>
                                    <TableHead className="text-center w-20">Excluir</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                            Nenhuma regra definida. Acesso padrão do sistema.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    permissions.map((rule) => (
                                        <TableRow key={rule.roleId} className="hover:bg-white/5">
                                            <TableCell className="font-medium">
                                                <Badge variant="outline">{getRoleName(rule.roleId)}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={rule.canView}
                                                    onCheckedChange={(c) => updateRule(rule.roleId, 'canView', c as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={rule.canEdit}
                                                    onCheckedChange={(c) => updateRule(rule.roleId, 'canEdit', c as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={rule.canDelete}
                                                    onCheckedChange={(c) => updateRule(rule.roleId, 'canDelete', c as boolean)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-400" onClick={() => handleRemoveRule(rule.roleId)}>
                                                    <Trash2 className="size-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded border border-primary/10">
                        <Lock className="size-3" />
                        <span>Admins e Super Admins possuem acesso total irrestrito independente destas regras.</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isLoading} className="gradient-primary">
                        {isLoading ? <span className="animate-spin mr-2">⏳</span> : <Save className="size-4 mr-2" />}
                        Salvar Permissões
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

