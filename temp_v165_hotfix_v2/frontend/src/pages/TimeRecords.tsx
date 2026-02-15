import React, { useState, useMemo } from 'react';
import { useTimeRecords, TimeRecord } from '@/hooks/useTimeRecords';
import { useAuth } from '@/contexts/AuthContext';
import { useSync } from "@/contexts/SyncContext";
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar, User, Search, Eye, Clock, Filter, ImageIcon, MapPin, Plus, Pencil, Trash2, CameraOff } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { isProtectedSignal, can } from '@/signals/authSignals';

import { useSignals } from "@preact/signals-react/runtime";

export default function TimeRecords() {
    useSignals();
    const { records, isLoading, createRecord, updateRecord, bulkUpdateRecords, bulkDeleteRecords, deleteRecord, refresh } = useTimeRecords();
    const { employees } = useEmployees();
    const { profile } = useAuth();
    const { isConnected } = useSync();
    const { toast } = useToast();

    const isAdmin = isProtectedSignal.value || can('time_records.manage');
    const isWorker = !isAdmin && !!profile?.employeeId;
    const workerEmployeeId = profile?.employeeId;

    const [filterDate, setFilterDate] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [optimisticPhotoHiddenIds, setOptimisticPhotoHiddenIds] = useState<string[]>([]);
    const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'default' | 'destructive';
    }>({
        open: false,
        title: '',
        description: '',
        onConfirm: () => { },
        variant: 'default'
    });

    // Form state for manual/edit
    const [formData, setFormData] = useState({
        employeeId: '',
        recordType: 'entry' as 'entry' | 'exit',
        recordedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
    });

    const employeeMap = useMemo(() => {
        const map = new Map();
        employees.forEach(e => map.set(e.id, e));
        return map;
    }, [employees]);

    // Filter records
    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            // Se for worker, só mostra o dele
            if (isWorker && workerEmployeeId) {
                if (record.employeeId !== workerEmployeeId) return false;
            }

            // Date filter
            let matchesDate = true;
            if (filterDate) {
                const recordDateStr = new Date(record.recordedAt).toISOString().split('T')[0];
                matchesDate = recordDateStr === filterDate;
            }

            // Employee filter (desabilitado para worker)
            const matchesEmployee = (isWorker || filterEmployee === 'all') ? true : record.employeeId === filterEmployee;

            // Search filter (by employee name if not already filtered)
            const searchLower = searchTerm.toLowerCase();
            const emp = employeeMap.get(record.employeeId);
            const employeeName = record.employeeName || emp?.fullName || '';
            const registrationNumber = emp?.registrationNumber || '';
            const cpf = emp?.cpf || '';

            const matchesSearch = searchTerm
                ? employeeName.toLowerCase().includes(searchLower) ||
                registrationNumber.toLowerCase().includes(searchLower) ||
                cpf.toLowerCase().includes(searchLower)
                : true;

            return matchesDate && matchesEmployee && matchesSearch && !optimisticDeletedIds.includes(record.id);
        });
    }, [records, filterDate, filterEmployee, searchTerm, employees, isWorker, workerEmployeeId, optimisticDeletedIds]);

    const resetFilters = () => {
        setFilterDate('');
        setFilterEmployee('all');
        setSearchTerm('');
    };

    const handleOpenManualModal = () => {
        setFormData({
            employeeId: '',
            recordType: 'entry',
            recordedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm")
        });
        setIsManualModalOpen(true);
    };

    const handleOpenEditModal = (record: TimeRecord) => {
        setEditingRecord(record);
        setFormData({
            employeeId: record.employeeId,
            recordType: record.recordType,
            recordedAt: format(new Date(record.recordedAt), "yyyy-MM-dd'T'HH:mm")
        });
        setIsEditModalOpen(true);
    };

    const handleSaveManual = async () => {
        if (!formData.employeeId) {
            toast({ title: 'Erro', description: 'Selecione um funcionário', variant: 'destructive' });
            return;
        }

        const result = await createRecord({
            employeeId: formData.employeeId,
            recordType: formData.recordType,
            recordedAt: new Date(formData.recordedAt)
        });

        if (result.success) {
            toast({ title: 'Sucesso', description: 'Ponto registrado manualmente' });
            setIsManualModalOpen(false);
            refresh();
        }
    };

    const handleUpdateRecord = async () => {
        if (!editingRecord) return;

        const result = await updateRecord(editingRecord.id, {
            employeeId: formData.employeeId,
            recordType: formData.recordType,
            recordedAt: new Date(formData.recordedAt)
        });

        if (result.success) {
            toast({ title: 'Sucesso', description: 'Registro atualizado' });
            setIsEditModalOpen(false);
            refresh();
        }
    };

    const handleDeleteRecord = (id: string) => {
        setConfirmDialog({
            open: true,
            title: 'Excluir Registro',
            description: 'Tem certeza que deseja excluir este registro de ponto? Esta ação não pode ser desfeita.',
            variant: 'destructive',
            onConfirm: async () => {
                const result = await deleteRecord(id);
                if (result.success) {
                    toast({ title: 'Sucesso', description: 'Registro excluído' });
                    refresh();
                }
            }
        });
    };

    const handleRemovePhoto = () => {
        if (!editingRecord) return;
        setConfirmDialog({
            open: true,
            title: 'Remover Foto',
            description: 'Deseja remover a foto deste registro permanentemente?',
            variant: 'destructive',
            onConfirm: async () => {
                const result = await updateRecord(editingRecord.id, {
                    photoUrl: null
                });
                if (result.success) {
                    toast({ title: 'Sucesso', description: 'Foto removida' });
                    setEditingRecord(prev => prev ? { ...prev, photoUrl: null } : null);
                }
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredRecords.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredRecords.map(r => r.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        setConfirmDialog({
            open: true,
            title: 'Excluir Selecionados',
            description: `Tem certeza que deseja excluir ${selectedIds.length} registros permanentemente? Esta ação será processada em segundo plano.`,
            variant: 'destructive',
            onConfirm: () => {
                const idsToDelete = [...selectedIds];
                // Passo 1: Ocultar imediatamente no UI (Otimista)
                setOptimisticDeletedIds(prev => [...prev, ...idsToDelete]);
                setSelectedIds([]);

                toast({
                    title: 'Iniciando Exclusão',
                    description: `${idsToDelete.length} registros estão sendo removidos em segundo plano.`
                });

                // Passo 2: Rodar o processo Async em background
                bulkDeleteRecords(idsToDelete).then((res: any) => {
                    setOptimisticDeletedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
                    if (res.success) {
                        toast({ title: 'Sucesso', description: 'Registros excluídos permanentemente.' });
                        refresh();
                    } else {
                        toast({ title: 'Erro', description: 'Houve um problema ao excluir alguns registros.', variant: 'destructive' });
                    }
                });
            }
        });
    };



    const handleBulkClearPhotos = () => {
        const recordsWithPhoto = records.filter(r => selectedIds.includes(r.id) && r.photoUrl);

        if (recordsWithPhoto.length === 0) {
            toast({
                title: 'Nenhuma foto encontrada',
                description: 'Os registros selecionados já não possuem fotos para remover.',
                variant: 'destructive'
            });
            return;
        }

        const idsToClear = recordsWithPhoto.map(r => r.id);

        setConfirmDialog({
            open: true,
            title: 'Remover Fotos em Massa',
            description: `Deseja remover as fotos de ${idsToClear.length} registros? (Dos ${selectedIds.length} selecionados, ${selectedIds.length - idsToClear.length} não possuem fotos e serão ignorados).`,
            variant: 'destructive',
            onConfirm: () => {
                // Passo 1: Ocultar imediatamente no UI (Otimista)
                setOptimisticPhotoHiddenIds(prev => [...prev, ...idsToClear]);
                setSelectedIds([]);

                toast({
                    title: 'Iniciando Remoção',
                    description: `As fotos de ${idsToClear.length} registros estão sendo removidas.`
                });

                // Passo 2: Rodar o processo Async em background
                bulkUpdateRecords(idsToClear, { photoUrl: null }).then((res: any) => {
                    setOptimisticPhotoHiddenIds(prev => prev.filter(id => !idsToClear.includes(id)));
                    if (res.success) {
                        toast({ title: 'Sucesso', description: 'Fotos removidas permanentemente.' });
                        refresh();
                    } else {
                        toast({ title: 'Erro', description: 'Houve um problema ao remover algumas fotos.', variant: 'destructive' });
                    }
                });
            }
        });
    };

    const handleBulkClearLocation = () => {
        const recordsWithLocation = records.filter(r => selectedIds.includes(r.id) && (r.latitude || r.longitude));

        if (recordsWithLocation.length === 0) {
            toast({
                title: 'Sem localização',
                description: 'Os registros selecionados já não possuem dados de localização.',
                variant: 'destructive'
            });
            return;
        }

        const idsToClear = recordsWithLocation.map(r => r.id);

        setConfirmDialog({
            open: true,
            title: 'Remover Localização',
            description: `Deseja remover a localização de ${idsToClear.length} registros? (Dos ${selectedIds.length} selecionados, ${selectedIds.length - idsToClear.length} não possuem coordenadas e serão ignorados).`,
            variant: 'destructive',
            onConfirm: async () => {
                setIsBulkLoading(true);
                const res = await bulkUpdateRecords(idsToClear, { latitude: null, longitude: null });
                if (res.success) {
                    toast({ title: 'Ação Concluída', description: `Localização removida de ${idsToClear.length} registros.` });
                }
                setSelectedIds([]);
                setIsBulkLoading(false);
                refresh();
            }
        });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Ações em Massa (Aparece apenas quando há seleção) */}
            {isAdmin && selectedIds.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500 text-black font-bold px-3 py-1 rounded-full text-[10px] uppercase tracking-tighter">
                            {selectedIds.length} selecionados
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds([])}
                            className="text-amber-500 hover:text-amber-400 font-bold text-xs h-8 px-2"
                        >
                            Limpar Seleção
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkClearPhotos}
                            className="border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black gap-2 h-9"
                            disabled={isBulkLoading}
                        >
                            <CameraOff className="w-4 h-4" />
                            Limpar Fotos
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkClearLocation}
                            className="border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black gap-2 h-9"
                            disabled={isBulkLoading}
                        >
                            <MapPin className="w-4 h-4" />
                            Limpar Localização
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            className="gap-2 h-9 font-bold"
                            disabled={isBulkLoading}
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir Selecionados
                        </Button>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-col gap-4 md:flex-row md:items-end glass-card p-5 rounded-2xl border-white/5 shadow-strong">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                            <Calendar className="w-3 h-3" /> Data
                        </label>
                        <Input
                            type="date"
                            className="industrial-input h-11"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>

                    {!isWorker && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                                <User className="w-3 h-3" /> Funcionário
                            </label>
                            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                                <SelectTrigger className="industrial-input h-11">
                                    <SelectValue placeholder="Todos os funcionários" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os funcionários</SelectItem>
                                    {employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
                            <Search className="w-3 h-3" /> Busca Rápida
                        </label>
                        <Input
                            placeholder="Nome do funcionário..."
                            className="industrial-input h-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-end">
                        <Button
                            variant="outline"
                            onClick={resetFilters}
                            className="w-full h-11 border-white/10 hover:bg-white/5 transition-colors"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Limpar Filtros
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabela de Resultados */}
            <Card className="glass-card border-white/5 shadow-strong overflow-hidden">
                <CardHeader className="pb-3 px-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl">Registros Encontrados</CardTitle>
                            <CardDescription>Total de {filteredRecords.length} ponto(s)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <Button
                                    onClick={handleOpenManualModal}
                                    className="gradient-primary shadow-glow font-bold gap-2 h-10 px-4"
                                    title="Adicionar Manual"
                                >
                                    <Plus className="w-4 h-4" />
                                    Adicionar Manual
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    {isAdmin && (
                                        <TableHead className="w-[50px] px-6">
                                            <input
                                                type="checkbox"
                                                className="rounded border-white/20 bg-black/20"
                                                checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead className={isAdmin ? "px-2 font-bold py-4" : "px-6 font-bold py-4"}>Data/Hora</TableHead>
                                    <TableHead className="font-bold py-4">Matrícula</TableHead>
                                    <TableHead className="font-bold py-4">Funcionário</TableHead>
                                    <TableHead className="font-bold py-4">CPF</TableHead>
                                    <TableHead className="font-bold py-4">Tipo</TableHead>
                                    <TableHead className="font-bold py-4">Localização</TableHead>
                                    <TableHead className="font-bold py-4">Status</TableHead>
                                    <TableHead className="px-6 font-bold py-4 text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 9 : 8} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                <p className="text-muted-foreground animate-pulse">Carregando registros...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 9 : 8} className="h-48 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2 opacity-50">
                                                <Clock className="w-12 h-12 mb-2" />
                                                <p className="text-lg font-medium">Nenhum registro encontrado</p>
                                                <p className="text-sm">Tente ajustar os filtros acima</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map((record) => {
                                        const recordDate = new Date(record.recordedAt);
                                        const emp = employeeMap.get(record.employeeId);
                                        const empName = record.employeeName || emp?.fullName || 'Desconhecido';

                                        return (
                                            <TableRow key={record.id} className={`hover:bg-white/5 border-white/5 transition-colors ${selectedIds.includes(record.id) ? 'bg-primary/5' : ''}`}>
                                                {isAdmin && (
                                                    <TableCell className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-white/20 bg-black/20"
                                                            checked={selectedIds.includes(record.id)}
                                                            onChange={() => toggleSelect(record.id)}
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell className={isAdmin ? "px-2 py-4" : "px-6 py-4"}>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">
                                                            {format(recordDate, "dd 'de' MMM", { locale: ptBR })}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {format(recordDate, "HH:mm:ss")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 font-bold text-foreground">
                                                    {emp?.registrationNumber || '---'}
                                                </TableCell>
                                                <TableCell className="py-4 font-bold text-foreground">
                                                    {empName}
                                                </TableCell>
                                                <TableCell className="py-4 font-medium text-muted-foreground text-xs">
                                                    {emp?.cpf || '---'}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge
                                                        variant={record.recordType === 'entry' ? 'default' : 'destructive'}
                                                        className={`font-bold px-3 py-1 ${record.recordType === 'entry' ? 'bg-success/20 text-success border-success/30 hover:bg-success/30' : 'bg-destructive/20 text-error border-destructive/30 hover:bg-destructive/30'}`}
                                                    >
                                                        {record.recordType === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {record.latitude && record.longitude ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <MapPin className="w-3 h-3" />
                                                            Ver no Mapa
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Não disponível</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {record.syncedAt ? (
                                                        <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5">
                                                            ONLINE
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 bg-amber-500/5">
                                                            OFFLINE
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(record.photoUrl && !optimisticPhotoHiddenIds.includes(record.id)) ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 hover:bg-primary/20 transition-all"
                                                                onClick={() => setSelectedRecord(record)}
                                                                title="Ver Foto"
                                                            >
                                                                <ImageIcon className="w-4 h-4" />
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[10px] text-muted-foreground italic">
                                                                {optimisticPhotoHiddenIds.includes(record.id) ? 'Removendo...' : 'Sem foto'}
                                                            </span>
                                                        )}

                                                        {isAdmin && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 hover:bg-amber-500/20 text-amber-500 transition-all"
                                                                    onClick={() => handleOpenEditModal(record)}
                                                                    title="Editar Registro"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 hover:bg-destructive/20 text-destructive transition-all"
                                                                    onClick={() => handleDeleteRecord(record.id)}
                                                                    title="Excluir Registro"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Registro Manual */}
            <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogContent className="max-w-md glass-card border-white/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            Novo Ponto Manual
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Funcionário</Label>
                            <Select
                                value={formData.employeeId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, employeeId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o funcionário" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.fullName} ({e.registrationNumber})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Registro</Label>
                            <Select
                                value={formData.recordType}
                                onValueChange={(val: 'entry' | 'exit') => setFormData(prev => ({ ...prev, recordType: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="entry">ENTRADA</SelectItem>
                                    <SelectItem value="exit">SAÍDA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Data e Hora</Label>
                            <Input
                                type="datetime-local"
                                value={formData.recordedAt}
                                onChange={(e) => setFormData(prev => ({ ...prev, recordedAt: e.target.value }))}
                            />
                        </div>
                        <Button onClick={handleSaveManual} className="w-full gradient-primary font-bold h-12">
                            Salvar Registro
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Edição */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-md glass-card border-white/10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-amber-500" />
                            Editar Registro de Ponto
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Funcionário</Label>
                            <Input value={employeeMap.get(formData.employeeId)?.fullName || ''} disabled className="opacity-70" />
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo de Registro</Label>
                            <Select
                                value={formData.recordType}
                                onValueChange={(val: 'entry' | 'exit') => setFormData(prev => ({ ...prev, recordType: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="entry">ENTRADA</SelectItem>
                                    <SelectItem value="exit">SAÍDA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Data e Hora</Label>
                            <Input
                                type="datetime-local"
                                value={formData.recordedAt}
                                onChange={(e) => setFormData(prev => ({ ...prev, recordedAt: e.target.value }))}
                            />
                        </div>

                        {editingRecord?.photoUrl && (
                            <div className="space-y-2">
                                <Label>Foto do Registro</Label>
                                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                    <img src={editingRecord.photoUrl} alt="Ponto" className="w-full h-full object-contain" />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-2 right-2 h-8 px-2 text-[10px] font-bold"
                                        onClick={handleRemovePhoto}
                                    >
                                        <CameraOff className="w-3 h-3 mr-1" />
                                        REMOVER FOTO
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Button onClick={handleUpdateRecord} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold h-12 shadow-glow">
                            Atualizar Alterações
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Foto */}
            <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
                <DialogContent className="max-w-md bg-card border-white/10 p-0 overflow-hidden glass-card shadow-strong max-h-[90vh] flex flex-col">
                    <DialogHeader className="p-4 border-b border-white/5 bg-muted/30 shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            Foto do Registro
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Visualização detalhada da foto capturada no momento do registro de ponto.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col overflow-y-auto">
                        {/* Foto */}
                        <div className="w-full bg-black relative flex items-center justify-center shrink-0">
                            {selectedRecord?.photoUrl && (
                                <img
                                    src={selectedRecord.photoUrl}
                                    alt="Registro de Ponto"
                                    className="w-full h-auto max-h-[50vh] object-contain"
                                />
                            )}
                            <div className="absolute inset-0 pointer-events-none border-4 border-white/10 rounded-[inherit]" />
                        </div>

                        {/* Informações do Funcionário (abaixo da foto) */}
                        <div className="p-5 bg-linear-to-b from-card to-muted/30 space-y-4">
                            {/* Badge Entrada/Saída + Nome */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 flex-1">
                                    <Badge
                                        className={`font-black text-[10px] px-2 py-0.5 tracking-widest ${selectedRecord?.recordType === 'entry'
                                            ? 'bg-success text-white'
                                            : 'bg-destructive text-white'
                                            }`}
                                    >
                                        {selectedRecord?.recordType === 'entry' ? 'ENTRADA' : 'SAÍDA'}
                                    </Badge>
                                    <p className="text-xl font-black tracking-tight text-foreground">
                                        {selectedRecord?.employeeName || employees.find(e => e.id === selectedRecord?.employeeId)?.fullName}
                                    </p>
                                </div>
                            </div>

                            {/* Matrícula e CPF */}
                            <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 rounded-xl bg-muted/50 border border-white/5">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Matrícula</span>
                                    <p className="text-sm font-black text-foreground">
                                        {employees.find(e => e.id === selectedRecord?.employeeId)?.registrationNumber || '---'}
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CPF</span>
                                    <p className="text-sm font-black text-foreground">
                                        {employees.find(e => e.id === selectedRecord?.employeeId)?.cpf || '---'}
                                    </p>
                                </div>
                            </div>

                            {/* Data e Hora */}
                            <div className="space-y-1">
                                <h3 className="text-4xl font-black tracking-tighter text-foreground">
                                    {selectedRecord && format(new Date(selectedRecord.recordedAt), "HH:mm:ss")}
                                </h3>
                                <p className="text-sm font-bold text-muted-foreground capitalize tracking-wide">
                                    {selectedRecord && format(new Date(selectedRecord.recordedAt), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                </p>
                            </div>

                            {/* Localização GPS */}
                            {selectedRecord?.latitude && selectedRecord?.longitude && (
                                <a
                                    href={`https://www.google.com/maps?q=${selectedRecord.latitude},${selectedRecord.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer group"
                                >
                                    <MapPin className="w-4 h-4 group-hover:animate-bounce" />
                                    <span className="font-bold">Localização registrada via GPS</span>
                                    <span className="text-[10px] opacity-70 ml-auto">Clique para ver no mapa →</span>
                                </a>
                            )}

                            {/* Botão Fechar */}
                            <Button
                                className="w-full font-bold h-12 text-base shadow-glow gradient-primary"
                                onClick={() => setSelectedRecord(null)}
                            >
                                Fechar Visualização
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {/* Alerta de Confirmação Moderno */}
            <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="glass-card border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDialog.onConfirm}
                            className={confirmDialog.variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90 text-white' : 'gradient-primary text-white'}
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
