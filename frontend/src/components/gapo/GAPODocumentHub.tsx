import React, { useState } from 'react';
import { useConstructionDocuments } from '@/hooks/useConstructionDocuments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Archive, Edit2, Filter, FolderPlus, Info, Plus, Search, Trash2, Download, Eye, Upload, FileText, History, ShieldCheck, FolderInput, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { DocumentSidebar, type FileNode } from './file-explorer/document-sidebar';

import { toast } from 'sonner';
import { useDownloadQueue } from '@/hooks/useDownloadQueue';
import { useAuth } from '@/contexts/AuthContext';
import { isGestaoGlobal, isCorporateRole } from '@/utils/permissionHelpers';
import { FolderPermissionsModal } from '../su/permission-modal';
import { db } from '@/integrations/database';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface GAPODocumentHubProps {
    projectId?: string;
    siteId?: string;
}

export default function GAPODocumentHub({ projectId, siteId }: GAPODocumentHubProps) {
    const { documents, isLoading, uploadDocument, updateDocument, downloadDocument, previewDocument, createFolder, deleteDocument, refresh } = useConstructionDocuments(projectId, siteId);

    // Download Queue
    const { addToQueue, isProcessing, currentDownload, queueLength } = useDownloadQueue(downloadDocument);
    const { profile } = useAuth();
    const isAdmin = isGestaoGlobal(profile) || isCorporateRole(profile?.role);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Modern Dialog States
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [targetFolderPath, setTargetFolderPath] = useState('/');

    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [renameTargetId, setRenameTargetId] = useState<string | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; storagePath?: string } | null>(null);

    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [infoDialogContent, setInfoDialogContent] = useState<{ title: string; body: string } | null>(null);

    const [permissionModalOpen, setPermissionModalOpen] = useState(false);
    const [contextFolder, setContextFolder] = useState<any>(null);

    const handleNewFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        toast.promise(uploadDocument(file, { projectId, siteId }), {
            loading: 'Enviando documento...',
            success: 'Documento enviado com sucesso!',
            error: 'Erro ao enviar documento'
        });

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleNewFolder = (path: string = '/') => {
        setTargetFolderPath(path);
        setNewFolderName('');
        setIsNewFolderDialogOpen(true);
    };

    const confirmNewFolder = async () => {
        if (!newFolderName.trim()) return;
        setIsNewFolderDialogOpen(false);
        await createFolder(newFolderName, targetFolderPath);
    };

    const handleRefresh = async () => {
        await refresh();
        toast.success('Arquivos atualizados');
    };

    const MAX_EXPORT_FILES = 20;
    const MAX_EXPORT_SIZE_MB = 100;

    const handleExportAll = () => {
        const filesToExport = documents.filter(d => d.docType !== 'folder' && !d.fileUrl?.includes('folder'));

        if (filesToExport.length === 0) {
            toast.error("Nenhum documento para exportar.");
            return;
        }

        if (filesToExport.length > MAX_EXPORT_FILES) {
            toast.error(`Limite de exportação excedido. Máximo ${MAX_EXPORT_FILES} arquivos por vez (atual: ${filesToExport.length}).`);
            return;
        }

        const totalSize = filesToExport.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

        if (parseFloat(totalSizeMB) > MAX_EXPORT_SIZE_MB) {
            toast.error(`O tamanho total (${totalSizeMB}MB) excede o limite de ${MAX_EXPORT_SIZE_MB}MB.`);
            return;
        }

        toast.success(`Exportando ${filesToExport.length} arquivos (${totalSizeMB}MB)...`);
        filesToExport.forEach(doc => downloadDocument(doc));
    };

    const handleArchive = (docId: string) => {
        toast.promise(updateDocument(docId, { status: 'archived' }), {
            loading: 'Arquivando...',
            success: 'Documento arquivado',
            error: 'Erro ao arquivar'
        });
    };

    const handleValidate = (docId: string) => {
        toast.promise(updateDocument(docId, { status: 'valid' }), {
            loading: 'Validando...',
            success: 'Documento validado',
            error: 'Erro ao validar'
        });
    };

    const handleSidebarAction = (action: string, node: FileNode) => {
        const doc = documents.find(d => d.id === node.id);

        if (action === "Abrir") {
            if (node.type === 'file') {
                setSelectedFile(node);
                if (doc) previewDocument(doc);
            } else {
                setSelectedFile(node);
                toast.info(`Pasta "${node.name}" selecionada`);
            }
        } else if (action === "Visualizar") {
            if (doc) previewDocument(doc);
        } else if (action === "Renomear") {
            if (doc) {
                setRenameTargetId(doc.id);
                setRenameValue(doc.name);
                setIsRenameDialogOpen(true);
            }
        } else if (action === "Informações") {
            if (doc) {
                const infoBody = `Tipo: ${doc.docType}\nVersão: v${doc.version}\nStatus: ${doc.status}\nCaminho: ${doc.folderPath}\nModificado: ${doc.updatedAt ? format(new Date(doc.updatedAt), 'dd/MM/yyyy HH:mm') : '-'}`;
                setInfoDialogContent({ title: `Detalhes: ${doc.name}`, body: infoBody });
            } else {
                setInfoDialogContent({ title: 'Informações da Pasta', body: `Pasta: ${node.name}\nID: ${node.id}` });
            }
        } else if (action === "Excluir") {
            setDeleteTarget({ id: node.id, name: node.name, storagePath: doc?.fileUrl });
            setIsDeleteDialogOpen(true);
        } else if (action === "Nova Pasta") {
            handleNewFolder(node.type === 'folder' ? `${node.id}/` : '/');
        } else if (action === "Novo Arquivo") {
            handleNewFile();
        } else if (action === "Nova Pasta Inteligente") {
            handleSmartFolder(node.id, node.name);
        } else if (action === "Marcar como Importante") {
            if (doc) {
                toast.promise(updateDocument(doc.id, { metadata: { ...doc.metadata, priority: 'high' } }), {
                    loading: 'Marcando...',
                    success: 'Marcado como Importante',
                    error: 'Erro ao marcar'
                });
            }
        } else if (action === "Mover para Raiz") {
            handleMove(node.id, "root");
        } else if (action === "Permissões") {
            if (doc) {
                setContextFolder(doc);
                setPermissionModalOpen(true);
            }
        }
    };

    const handleSavePermissions = async (docId: string, permissions: any) => {
        const standardFolders = ['01. Empresa', '02. Obra', '03. Canteiro'];
        const isStandard = standardFolders.includes(contextFolder.name);
        const updates = { metadata: { ...contextFolder.metadata, ...permissions } };

        if (isStandard) {
            const confirmSync = window.confirm(`Esta é uma pasta padrão. Deseja aplicar estas permissões para TODAS as pastas "${contextFolder.name}" em todos os projetos?`);

            if (confirmSync) {
                toast.loading(`Sincronizando permissões para ${contextFolder.name}...`);
                const { error } = await db
                    .from('construction_documents' as any)
                    .update(updates)
                    .eq('file_url', 'folder')
                    .eq('name', contextFolder.name);

                if (error) {
                    toast.dismiss();
                    toast.error("Erro ao sincronizar permissões.");
                } else {
                    toast.dismiss();
                    toast.success("Permissões sincronizadas globalmente!");
                    refresh();
                }
                return;
            }
        }

        await updateDocument(docId, updates);
    };

    const handleSmartFolder = async (parentId: string, templateType: string = 'Obra') => {
        // Updated Structure as per User Request
        // Empresa/Obra (Side by side) | Canteiro
        // Obra -> Torres
        // Canteiro -> Funcionários, Documentos Funcionários
        const templates: Record<string, string[]> = {
            'template-obra': ['01. Projetos', '02. Torres', '03. Relatórios', '04. Fotos'],
            'template-canteiro': ['01. Funcionários', '02. Documentos Funcionários', '03. EPIs', '04. Treinamentos'],
            'root': ['01. Empresa', '02. Obra', '03. Canteiro'], // Root structure
            'Obra': ['Torres', 'Projetos', 'Diários'], // Context menu on 'Obra' folder
            'Canteiro': ['Funcionários', 'Documentos'] // Context menu on 'Canteiro' folder
        };

        const folders = templates[parentId] || templates[templateType] || templates['root'];
        
        // If creating root structure, ensure path is root. Otherwise, use parentId.
        const path = (parentId === 'root' || parentId.startsWith('template-')) ? '/' : `/${parentId}/`;

        toast.loading("Criando estrutura inteligente...");
        
        try {
             // Sequential creation to ensure order if needed, or parallel for speed
            await Promise.all(folders.map(name => createFolder(name, path)));
            toast.dismiss();
            toast.success("Estrutura criada com sucesso!");
            await refresh(); // Force refresh to see new folders
        } catch (error) {
            toast.dismiss();
            toast.error("Erro ao criar estrutura.");
        }
    };

    const handleDelete = async (id: string, storagePath?: string) => {
        await deleteDocument(id, storagePath);
    };

    const handleMove = async (sourceId: string, targetId: string) => {
        const sourceDoc = documents.find(d => d.id === sourceId);
        if (!sourceDoc) return;

        // Path is simply the ID of the folder for now (as used in tree logic)
        const newPath = targetId === 'root' || !targetId ? '/' : `/${targetId}/`;

        toast.promise(updateDocument(sourceId, { folderPath: newPath }), {
            loading: 'Movendo...',
            success: 'Movido com sucesso!',
            error: 'Erro ao mover'
        });
    };

    const handleBulkDownload = () => {
        const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id) && d.docType !== 'folder' && !d.fileUrl?.includes('folder'));

        if (selectedDocs.length === 0) return;

        if (selectedDocs.length > MAX_EXPORT_FILES) {
            toast.error(`Limite de download excedido. Selecione no máximo ${MAX_EXPORT_FILES} arquivos.`);
            return;
        }

        const totalSize = selectedDocs.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

        if (parseFloat(totalSizeMB) > MAX_EXPORT_SIZE_MB) {
            toast.error(`O tamanho total (${totalSizeMB}MB) excede o limite de ${MAX_EXPORT_SIZE_MB}MB.`);
            return;
        }

        // Use Queue System
        addToQueue(selectedDocs);
    };

    const handleApprove = async (doc: any) => {
        toast.promise(updateDocument(doc.id, { status: 'valid' }), {
            loading: 'Aprovando...',
            success: 'Documento aprovado!',
            error: 'Erro ao aprovar'
        });
    };

    const handleReject = async (doc: any) => {
        toast.promise(updateDocument(doc.id, { status: 'rejected' }), {
            loading: 'Rejeitando...',
            success: 'Documento rejeitado!',
            error: 'Erro ao rejeitar'
        });
    };

    const handleBulkArchive = async () => {
        toast.loading(`Arquivando ${selectedDocIds.length} itens...`);
        try {
            await Promise.all(selectedDocIds.map(id => updateDocument(id, { status: 'archived' })));
            setSelectedDocIds([]);
            toast.dismiss();
            toast.success("Itens arquivados com sucesso");
        } catch (error) {
            toast.dismiss();
            toast.error("Erro ao arquivar alguns itens");
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleteDialogOpen(false);
        toast.loading(`Excluindo ${selectedDocIds.length} itens...`);
        try {
            await Promise.all(selectedDocIds.map(id => {
                const doc = documents.find(d => d.id === id);
                return deleteDocument(id, doc?.fileUrl);
            }));
            setSelectedDocIds([]);
            toast.dismiss();
            toast.success("Itens excluídos");
        } catch (error) {
            toast.dismiss();
            toast.error("Erro ao excluir alguns itens");
        }
    };

    const confirmRename = async () => {
        if (!renameTargetId || !renameValue.trim()) return;
        setIsRenameDialogOpen(false);
        
        toast.promise(updateDocument(renameTargetId, { name: renameValue }), {
            loading: 'Renomeando...',
            success: 'Renomeado com sucesso!',
            error: 'Erro ao renomear'
        });
        
        setRenameTargetId(null);
    };

    const handleRename = (doc: any) => {
        setRenameTargetId(doc.id);
        setRenameValue(doc.name);
        setIsRenameDialogOpen(true);
    };

    const filteredDocs = documents.filter(doc => {
        // Ignorar registros que representam pastas na listagem da tabela
        if (doc.docType === 'folder' || doc.fileUrl?.includes('folder')) return false;

        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.docType.toLowerCase().includes(searchTerm.toLowerCase());

        // Filtragem por seleção na Sidebar
        if (selectedFile) {
            if (selectedFile.type === 'folder') {
                // Mostrar arquivos que estão dentro desta pasta
                return matchesSearch && doc.folderPath.includes(selectedFile.id);
            } else {
                // Mostrar apenas o arquivo selecionado
                return doc.id === selectedFile.id;
            }
        }

        return matchesSearch;
    });

    const handleRowClick = (e: React.MouseEvent, docId: string) => {
        // Ignorar se o clique foi em botões de ação
        if ((e.target as HTMLElement).closest('button')) return;

        if (e.ctrlKey || e.metaKey) {
            // CTRL + Click: Adiciona/Remove individualmente
            setSelectedDocIds(prev =>
                prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
            );
            setLastSelectedId(docId);
        } else if (e.shiftKey && lastSelectedId) {
            // SHIFT + Click: Seleção em range
            const docList = filteredDocs.filter(d => d.docType !== 'folder' && !d.fileUrl?.includes('folder'));
            const currentIndex = docList.findIndex(d => d.id === docId);
            const lastIndex = docList.findIndex(d => d.id === lastSelectedId);

            if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                const rangeIds = docList.slice(start, end + 1).map(d => d.id);
                setSelectedDocIds(prev => Array.from(new Set([...prev, ...rangeIds])));
            }
        } else {
            // Click Normal: Seleciona apenas um
            setSelectedDocIds([docId]);
            setLastSelectedId(docId);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'expired': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'archived': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
            case 'superseded': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'rejected': return 'bg-gray-500/10 text-gray-500 border-gray-500/20 font-bold'; // GRAY BOLD as requested
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        }
    };

    const documentsToTree = (docs: any[]): FileNode[] => {
        const tree: FileNode[] = [];
        const foldersMap: Record<string, FileNode> = {};

        // 1. Passar primeiro para mapear todas as pastas e ordenar
        docs.filter(d => d.docType === 'folder' || d.fileUrl?.includes('folder'))
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(d => {
                foldersMap[d.id] = {
                    id: d.id,
                    name: d.name,
                    type: 'folder',
                    children: []
                };
            });

        // 2. Segunda passagem para construir a hierarquia
        docs.filter(d => d.docType === 'folder' || d.fileUrl?.includes('folder')).forEach(d => {
            const node = foldersMap[d.id];
            // Encontrar o ID da pasta pai no final do caminho (ex: "/id-pai/")
            const parentId = d.folderPath.split('/').filter(Boolean).pop();

            if (parentId && foldersMap[parentId]) {
                foldersMap[parentId].children?.push(node);
            } else {
                tree.push(node);
            }
        });

        // 3. Terceira passagem para adicionar os arquivos
        docs.filter(d => d.docType !== 'folder' && !d.fileUrl?.includes('folder')).forEach(d => {
            const fileNode: FileNode = {
                id: d.id,
                name: d.name,
                type: 'file',
                extension: d.name.split('.').pop()
            };

            const parentId = d.folderPath.split('/').filter(Boolean).pop();
            if (parentId && foldersMap[parentId]) {
                foldersMap[parentId].children?.push(fileNode);
            } else {
                tree.push(fileNode);
            }
        });

        return tree;
    };

    const treeData = documentsToTree(documents);


    return (
        <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />
            {/* Sidebar - File Explorer */}
            <div className="w-72 shrink-0 glass-card rounded-lg overflow-hidden border border-white/5 flex flex-col">
                {selectedFile && (
                    <div className="p-2 border-b border-white/5 bg-primary/5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-[10px] h-7 uppercase font-bold gap-2"
                            onClick={() => setSelectedFile(null)}
                        >
                            <Filter className="w-3 h-3" /> Limpar Seleção
                        </Button>
                    </div>
                )}
                <DocumentSidebar
                    onFileSelect={(n) => setSelectedFile(n)}
                    onNewFile={handleNewFile}
                    onNewFolder={handleNewFolder}
                    onRefresh={refresh}
                    onAction={handleSidebarAction}
                    onMove={handleMove}
                    files={documentsToTree(documents)}
                    // Props for Approval and Settings
                    documents={documents}
                    isAdmin={isAdmin}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            </div>

            <div className="flex-1 space-y-4 overflow-auto">
                {(isProcessing || queueLength > 0) && (
                    <div className="flex items-center justify-between p-3 glass-card bg-emerald-500/10 rounded-lg border-emerald-500/20 animate-pulse">
                        <span className="text-sm font-bold uppercase text-emerald-400 flex items-center gap-2">
                            <Download className="size-4 animate-bounce" />
                            Baixando: {currentDownload || 'Preparando...'}
                        </span>
                        <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                            Fila: {queueLength}
                        </Badge>
                    </div>
                )}

                {selectedDocIds.length > 0 && (
                    <div className="flex items-center justify-between p-3 glass-card border-primary/20 bg-primary/5 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {selectedDocIds.length}
                            </div>
                            <span className="text-sm font-bold uppercase tracking-wider">Itens Selecionados</span>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="h-8 gap-2 hover:bg-emerald-500/20" onClick={handleBulkDownload}>
                                <Download className="w-4 h-4" /> Baixar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 gap-2 hover:bg-amber-500/20" onClick={handleBulkArchive}>
                                <Archive className="w-4 h-4" /> Arquivar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 gap-2 hover:bg-red-500/20 text-red-400" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                                <Trash2 className="w-4 h-4" /> Excluir
                            </Button>
                            <div className="w-px h-8 bg-white/10 mx-1" />
                            <Button size="sm" variant="ghost" className="h-8 text-xs opacity-50 hover:opacity-100" onClick={() => setSelectedDocIds([])}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar documentos, contratos, projetos..."
                            className="industrial-input pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="glass-card border-white/5 font-bold gap-2 text-[10px] uppercase tracking-widest"
                            onClick={handleExportAll}
                        >
                            <Download className="w-4 h-4" /> Exportar Tudo
                        </Button>
                        <Button
                            className="gradient-primary font-bold gap-2"
                            onClick={handleNewFile}
                        >
                            <Upload className="w-4 h-4" /> Novo Documento
                        </Button>
                    </div>
                </div>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Repositório de Documentos
                        </CardTitle>
                        <CardDescription>Gestão versionada e segura de arquivos da obra.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-white/5 bg-white/2">
                                    <TableHead className="w-10 pl-6">
                                        <Checkbox
                                            checked={selectedDocIds.length === filteredDocs.filter(d => d.docType !== 'folder' && !d.fileUrl?.includes('folder')).length && filteredDocs.filter(d => d.docType !== 'folder' && !d.fileUrl?.includes('folder')).length > 0}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedDocIds(filteredDocs.filter(d => d.docType !== 'folder' && !d.fileUrl?.includes('folder')).map(d => d.id));
                                                else setSelectedDocIds([]);
                                            }}
                                        />
                                    </TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Nome do Arquivo</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Tipo</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Versão</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Última Modificação</TableHead>
                                    <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-widest">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10">Carregando documentos...</TableCell>
                                    </TableRow>
                                ) : filteredDocs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 italic text-muted-foreground">Nenhum documento encontrado.</TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDocs.filter(d => d.docType !== 'folder' && !d.fileUrl?.includes('folder')).map((doc) => (
                                        <TableRow
                                            key={doc.id}
                                            className={`
                                                cursor-pointer transition-colors group border-white/5
                                                ${selectedDocIds.includes(doc.id) ? 'bg-primary/15 hover:bg-primary/20' : 'hover:bg-white/2'}
                                            `}
                                            onClick={(e) => handleRowClick(e, doc.id)}
                                        >
                                            <TableCell className="pl-6">
                                                <Checkbox
                                                    checked={selectedDocIds.includes(doc.id)}
                                                    onCheckedChange={() => {
                                                        setSelectedDocIds(prev =>
                                                            prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                                                        );
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-primary/10">
                                                        <FileText className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm">{doc.name}</span>
                                                        <span className="text-[10px] opacity-50 font-mono italic">UUID: {doc.id.substring(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tight">
                                                    {doc.docType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-bold text-xs">
                                                    <History className="w-3 h-3 text-muted-foreground" />
                                                    v{doc.version}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(doc.status) + " text-[10px] font-black uppercase"}>
                                                    {doc.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                                {doc.updatedAt && !isNaN(new Date(doc.updatedAt).getTime())
                                                    ? format(new Date(doc.updatedAt), 'dd/MM/yyyy HH:mm')
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                                                        title="Visualizar"
                                                        onClick={() => previewDocument(doc)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-500"
                                                        title="Download"
                                                        onClick={() => downloadDocument(doc)}
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-amber-500/20 hover:text-amber-500" title="Arquivar" onClick={() => handleArchive(doc.id)}>
                                                        <Archive className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-500" title="Renomear" onClick={() => handleRename(doc)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 hover:text-primary" title="Validar" onClick={() => handleValidate(doc.id)}>
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
             {/* Renomear Dialog */}
            <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-primary" /> Renomear Item
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Digite o novo nome para o arquivo ou pasta.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black tracking-widest opacity-60">Novo Nome</Label>
                            <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="industrial-input"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" onClick={() => setIsRenameDialogOpen(false)}>Cancelar</Button>
                        <Button size="sm" className="gradient-primary" onClick={confirmRename}>Salvar Alteração</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Nova Pasta Dialog */}
            <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
                <DialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Archive className="w-5 h-5 text-primary" /> Criar Nova Pasta
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Crie uma nova pasta para organizar seus documentos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-black tracking-widest opacity-60">Nome da Pasta</Label>
                            <Input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="industrial-input"
                                placeholder="Ex: Relatórios Técnicos"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && confirmNewFolder()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" size="sm" onClick={() => setIsNewFolderDialogOpen(false)}>Cancelar</Button>
                        <Button size="sm" className="gradient-primary" onClick={confirmNewFolder}>Criar Pasta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Info Dialog */}
            <Dialog open={!!infoDialogContent} onOpenChange={(open) => !open && setInfoDialogContent(null)}>
                <DialogContent className="glass-card border-white/10 sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-400" /> {infoDialogContent?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 bg-white/2 rounded-lg p-4 border border-white/5">
                        <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed">
                            {infoDialogContent?.body}
                        </pre>
                    </div>
                    <DialogFooter>
                        <Button size="sm" variant="outline" className="border-white/10" onClick={() => setInfoDialogContent(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Excluir AlertDialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                            <Trash2 className="w-5 h-5" /> Confirmar Exclusão
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs leading-relaxed">
                            Tem certeza que deseja excluir permanentemente <strong>"{deleteTarget?.name}"</strong>? esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 h-9">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600 h-9"
                            onClick={() => deleteTarget && handleDelete(deleteTarget.id, deleteTarget.storagePath)}
                        >
                            Excluir Agora
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Excluir AlertDialog */}
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <AlertDialogContent className="glass-card border-white/10 sm:max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                            <Trash2 className="w-5 h-5" /> Excluir Múltiplos Itens
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs leading-relaxed">
                            Você solicitou a exclusão de <strong>{selectedDocIds.length}</strong> itens. Eles serão removidos permanentemente do sistema e do armazenamento.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 h-9">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-500 hover:bg-red-600 h-9"
                            onClick={handleBulkDelete}
                        >
                            Confirmar Exclusão em Massa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {contextFolder && (
                <FolderPermissionsModal
                    open={permissionModalOpen}
                    onOpenChange={setPermissionModalOpen}
                    document={contextFolder}
                    onSave={handleSavePermissions}
                />
            )}
        </div>
    );
}
