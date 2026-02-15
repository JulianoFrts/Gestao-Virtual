import React, { useState, useEffect } from 'react';
import { useConstructionDocuments } from '@/hooks/useConstructionDocuments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Upload,
  Filter,
  Download,
  History as HistoryIcon,
  ShieldCheck,
  Activity,
  Archive,
  Edit2,
  Trash2,
  Star,
  Zap,
  Eye,
  Shield,
  FolderInput,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import {
  DocumentSidebar,
  type FileNode,
} from "../gapo/file-explorer/document-sidebar";
import { toast } from "sonner";
import { db } from "@/integrations/database";
import { useDownloadQueue } from "@/hooks/useDownloadQueue";
import { FolderPermissionsModal } from "./permission-modal";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function SUDocumentHub() {
  // No projectId or siteId passed = Global SU Documents
  const {
    documents,
    isLoading,
    uploadDocument,
    updateDocument,
    downloadDocument,
    previewDocument,
    createFolder,
    deleteDocument,
    refresh,
  } = useConstructionDocuments();
  const { addToQueue, isProcessing, currentDownload, queueLength } =
    useDownloadQueue(downloadDocument);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [contextFolder, setContextFolder] = useState<any>(null);

  // Modern Dialog States
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [targetFolderPath, setTargetFolderPath] = useState("/");

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    storagePath?: string;
  } | null>(null);

  const [isBaseStructureConfirmOpen, setIsBaseStructureConfirmOpen] =
    useState(false);
  const [isOrganizeConfirmOpen, setIsOrganizeConfirmOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [infoDialogContent, setInfoDialogContent] = useState<{
    title: string;
    body: string;
  } | null>(null);

  // Manual creation of base structure
  const confirmCreateBaseStructure = async () => {
    setIsBaseStructureConfirmOpen(false);
    const structure = [
      { name: "01. Empresa", path: "/" },
      { name: "02. Obra", path: "/" },
      { name: "03. Canteiro", path: "/" },
    ];

    toast.loading("Criando estrutura base...");
    try {
      for (const item of structure) {
        const exists = documents.some(
          (d) =>
            (d.docType === "folder" || d.fileUrl?.includes("folder")) &&
            d.name === item.name &&
            d.folderPath === item.path,
        );
        if (!exists) {
          await createFolder(item.name, item.path);
        }
      }
      toast.dismiss();
      toast.success("Estrutura criada com sucesso!");
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao criar estrutura.");
    }
  };

  const confirmOrganizeRoot = async () => {
    setIsOrganizeConfirmOpen(false);
    const rootFiles = documents.filter(
      (d) =>
        d.folderPath === "/" &&
        d.docType !== "folder" &&
        !d.fileUrl?.includes("folder"),
    );
    if (rootFiles.length === 0) return;

    toast.loading("Analisando e organizando arquivos...");
    try {
      const structure = [
        { name: "03. Canteiro", match: (d: any) => !!d.siteId },
        { name: "02. Obra", match: (d: any) => !!d.projectId && !d.siteId },
        { name: "01. Empresa", match: (d: any) => !d.projectId && !d.siteId },
      ];

      let movedCount = 0;
      const processedIds = new Set<string>();

      for (const target of structure) {
        const filesToMove = rootFiles.filter(
          (d) => target.match(d) && !processedIds.has(d.id),
        );
        if (filesToMove.length === 0) continue;

        let folderNode = documents.find(
          (d) =>
            (d.docType === "folder" || d.fileUrl?.includes("folder")) &&
            d.name === target.name &&
            d.folderPath === "/",
        );
        if (!folderNode) {
          const res = await createFolder(target.name, "/");
          if (res?.data) folderNode = res.data;
        }

        if (folderNode) {
          const newPath = `/${folderNode.id}/`;
          for (const file of filesToMove) {
            await updateDocument(file.id, { folderPath: newPath });
            processedIds.add(file.id);
            movedCount++;
          }
        }
      }
      toast.dismiss();
      toast.success(`${movedCount} arquivos organizados!`);
      refresh();
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao organizar arquivos.");
    }
  };

  const handleOrganizeRoot = () => {
    const rootFiles = documents.filter(
      (d) =>
        d.folderPath === "/" &&
        d.docType !== "folder" &&
        !d.fileUrl?.includes("folder"),
    );
    if (rootFiles.length === 0) {
      toast.info("A raiz já está organizada!");
      return;
    }
    setIsOrganizeConfirmOpen(true);
  };

  const handleNewFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    toast.promise(uploadDocument(file, {}), {
      loading: "Enviando documento SU...",
      success: "Documento enviado com sucesso!",
      error: "Erro ao enviar documento",
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const MAX_EXPORT_FILES = 20;
  const MAX_EXPORT_SIZE_MB = 100;

  const handleExportAll = () => {
    const filesToExport = documents.filter((d) => d.fileUrl !== "folder");
    if (filesToExport.length === 0) {
      toast.error("Nenhum documento para exportar.");
      return;
    }

    if (filesToExport.length > MAX_EXPORT_FILES) {
      toast.error(
        `Muitos arquivos (${filesToExport.length}). Limite: ${MAX_EXPORT_FILES}`,
      );
      return;
    }

    const totalSize = filesToExport.reduce(
      (acc, d) => acc + (d.fileSize || 0),
      0,
    );
    if (totalSize / (1024 * 1024) > MAX_EXPORT_SIZE_MB) {
      toast.error("Tamanho total excede o limite de 100MB.");
      return;
    }

    // toast.success(`Exportando ${filesToExport.length} itens...`);
    addToQueue(filesToExport);
  };

  const handleBulkDownload = () => {
    const selectedDocs = documents.filter(
      (d) => selectedDocIds.includes(d.id) && d.fileUrl !== "folder",
    );
    if (selectedDocs.length === 0) return;

    if (selectedDocs.length > MAX_EXPORT_FILES) {
      toast.error(`Selecione no máximo ${MAX_EXPORT_FILES} arquivos.`);
      return;
    }

    const totalSize = selectedDocs.reduce(
      (acc, d) => acc + (d.fileSize || 0),
      0,
    );
    if (totalSize / (1024 * 1024) > MAX_EXPORT_SIZE_MB) {
      toast.error("Tamanho selecionado excede 100MB.");
      return;
    }

    // toast.success(`Baixando ${selectedDocs.length} itens...`);
    addToQueue(selectedDocs);
  };

  const handleNewFolder = (path: string | any = "/") => {
    // Fix: If called from onClick event, path is an object. Ensure it's a string.
    const actualPath = typeof path === "string" ? path : "/";
    setTargetFolderPath(actualPath);
    setNewFolderName("");
    setIsNewFolderDialogOpen(true);
  };

  const confirmNewFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsNewFolderDialogOpen(false);
    await createFolder(newFolderName, targetFolderPath);
  };

  const handleSmartFolder = async (
    parentId: string,
    templateType: string = "Padrao",
  ) => {
    // Normalize templateType to handle numbered prefixes (e.g. "02. Obra" -> "Obra")
    const normalizedType = templateType.replace(/^\d+\.\s*/, "");

    // Updated Structure to match GAPODocumentHub as requested
    const templates: Record<string, string[]> = {
      "template-obra": [
        "01. Projetos",
        "02. Torres",
        "03. Relatórios",
        "04. Fotos",
      ],
      "template-canteiro": [
        "01. Funcionários",
        "02. Documentos Funcionários",
        "03. EPIs",
        "04. Treinamentos",
      ],
      "template-su": ["01. Empresa", "02. Obra", "03. Canteiro"], // Sync with GAPO Root
      root: ["01. Empresa", "02. Obra", "03. Canteiro"],
      Obra: ["Torres", "Projetos", "Diários"],
      Canteiro: ["Funcionários", "Documentos"],
      Padrao: ["Docs", "Configs", "Backups"],
    };

    const folders =
      templates[parentId] ||
      templates[normalizedType] ||
      templates[templateType] ||
      templates["Padrao"];
    const path =
      parentId.startsWith("template-") || parentId === "root"
        ? "/"
        : `/${parentId}/`;

    toast.loading("Criando estrutura SU...");
    try {
      await Promise.all(folders.map((name) => createFolder(name, path)));
      toast.dismiss();
      toast.success("Estrutura SU sincronizada e criada!");
      refresh();
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao criar estrutura.");
    }
  };

  const handleSidebarAction = (action: string, node: FileNode) => {
    const doc = documents.find((d) => d.id === node.id);

    if (action === "Abrir") {
      if (node.type === "file") {
        setSelectedFile(node);
        if (doc) previewDocument(doc);
      } else {
        setSelectedFile(node);
        toast.info(`Nível/Pasta "${node.name}" selecionado`);
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
        const info = `Nome: ${doc.name}\nTipo: ${doc.docType}\nCaminho: ${doc.folderPath}\nModificado: ${format(new Date(doc.updatedAt), "dd/MM/yyyy HH:mm")}`;
        setInfoDialogContent({ title: "Detalhes do Arquivo", body: info });
      }
    } else if (action === "Excluir") {
      setDeleteTarget({
        id: node.id,
        name: node.name,
        storagePath: doc?.fileUrl,
      });
      setIsDeleteDialogOpen(true);
    } else if (action === "Nova Pasta Inteligente") {
      handleSmartFolder(node.id, node.name);
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
    const standardFolders = ["01. Empresa", "02. Obra", "03. Canteiro"];
    const isStandard = standardFolders.includes(contextFolder.name);
    const updates = { metadata: { ...contextFolder.metadata, ...permissions } };

    if (isStandard) {
      const confirmSync = window.confirm(
        `Esta é uma pasta padrão. Deseja aplicar estas permissões para TODAS as pastas "${contextFolder.name}" em todos os projetos?`,
      );

      if (confirmSync) {
        toast.loading(`Sincronizando permissões para ${contextFolder.name}...`);
        const { error } = await db
          .from("construction_documents" as any)
          .update(updates)
          .eq("file_url", "folder")
          .eq("name", contextFolder.name);

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

  const confirmRename = async () => {
    if (!renameTargetId || !renameValue.trim()) return;
    setIsRenameDialogOpen(false);
    toast.promise(updateDocument(renameTargetId, { name: renameValue }), {
      loading: "Renomeando...",
      success: "Renomeado com sucesso!",
      error: "Erro ao renomear",
    });
    setRenameTargetId(null);
  };

  const handleDelete = async (id: string, storagePath?: string) => {
    setIsDeleteDialogOpen(false);
    await deleteDocument(id, storagePath);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(false);
    const count = selectedDocIds.length;
    toast.loading(`Excluindo ${count} itens...`);

    try {
      await Promise.all(
        selectedDocIds.map((id) => {
          const doc = documents.find((d) => d.id === id);
          return deleteDocument(id, doc?.fileUrl);
        }),
      );
      toast.dismiss();
      toast.success(`${count} itens removidos com sucesso!`);
      setSelectedDocIds([]);
      refresh();
    } catch {
      toast.dismiss();
      toast.error("Erro ao excluir alguns itens.");
    }
  };

  const handleMove = async (sourceId: string, targetId: string) => {
    const newPath = targetId === "root" || !targetId ? "/" : `/${targetId}/`;
    toast.promise(updateDocument(sourceId, { folderPath: newPath }), {
      loading: "Movendo...",
      success: "Movido!",
      error: "Erro",
    });
  };

  const handleRowClick = (e: React.MouseEvent, docId: string) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.ctrlKey || e.metaKey) {
      setSelectedDocIds((prev) =>
        prev.includes(docId)
          ? prev.filter((id) => id !== docId)
          : [...prev, docId],
      );
      setLastSelectedId(docId);
    } else if (e.shiftKey && lastSelectedId) {
      const docList = filteredDocs;
      const currentIndex = docList.findIndex((d) => d.id === docId);
      const lastIndex = docList.findIndex((d) => d.id === lastSelectedId);
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = docList.slice(start, end + 1).map((d) => d.id);
        setSelectedDocIds((prev) =>
          Array.from(new Set([...prev, ...rangeIds])),
        );
      }
    } else {
      setSelectedDocIds([docId]);
      setLastSelectedId(docId);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (doc.docType === "folder" || doc.fileUrl?.includes("folder"))
      return false;
    const matchesSearch = doc.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    if (selectedFile) {
      if (selectedFile.type === "folder")
        return matchesSearch && doc.folderPath.includes(selectedFile.id);
      return doc.id === selectedFile.id;
    }
    return matchesSearch;
  });

  const documentsToTree = (docs: any[]): FileNode[] => {
    const tree: FileNode[] = [];
    const foldersMap: Record<string, FileNode> = {};

    docs
      .filter((d) => d.docType === "folder" || d.fileUrl?.includes("folder"))
      .sort((a, b) => a.name.localeCompare(b.name)) // Sort folders alphabetically
      .forEach((d) => {
        foldersMap[d.id] = {
          id: d.id,
          name: d.name,
          type: "folder",
          children: [],
        };
      });

    docs
      .filter((d) => d.docType === "folder" || d.fileUrl?.includes("folder"))
      .forEach((d) => {
        const node = foldersMap[d.id];
        const parentId = d.folderPath.split("/").filter(Boolean).pop();
        if (parentId && foldersMap[parentId])
          foldersMap[parentId].children?.push(node);
        else tree.push(node);
      });

    docs
      .filter((d) => d.docType !== "folder" && !d.fileUrl?.includes("folder"))
      .forEach((d) => {
        const fileNode: FileNode = {
          id: d.id,
          name: d.name,
          type: "file",
          extension: d.name.split(".").pop(),
        };
        const parentId = d.folderPath.split("/").filter(Boolean).pop();
        if (parentId && foldersMap[parentId])
          foldersMap[parentId].children?.push(fileNode);
        else tree.push(fileNode);
      });

    return tree;
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-250px)] min-h-[500px]">
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <div className="w-72 shrink-0 glass-card rounded-lg overflow-hidden border border-white/5 flex flex-col">
        {selectedFile && (
          <div className="p-2 border-b border-white/5 bg-primary/5 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setSelectedFile(null)}
            >
              Limpar Seleção
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
        />
      </div>

      <div className="flex-1 space-y-4 overflow-auto">
        {(isProcessing || queueLength > 0) && (
          <div className="flex items-center justify-between p-3 glass-card bg-emerald-500/10 rounded-lg border-emerald-500/20 animate-pulse">
            <span className="text-sm font-bold uppercase text-emerald-400 flex items-center gap-2">
              <Download className="size-4 animate-bounce" />
              Baixando: {currentDownload || "Preparando..."}
            </span>
            <Badge
              variant="outline"
              className="text-emerald-400 border-emerald-400/30"
            >
              Fila: {queueLength}
            </Badge>
          </div>
        )}

        {selectedDocIds.length > 0 && (
          <div className="flex items-center justify-between p-3 glass-card bg-primary/5 rounded-lg border-primary/20">
            <span className="text-sm font-bold uppercase">
              {selectedDocIds.length} Itens Selecionados
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="size-4 mr-2" /> Excluir Seleção
              </Button>
              <Button size="sm" variant="ghost" onClick={handleBulkDownload}>
                <Download className="size-4 mr-2" /> Baixar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedDocIds([])}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-between">
          <Input
            placeholder="Buscar arquivos de sistema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md industrial-input"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsOrganizeConfirmOpen(true)}
              title="Organizar Arquivos Soltos"
            >
              <FolderInput className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsBaseStructureConfirmOpen(true)}
              title="Gerar Estrutura Padrão"
            >
              <Zap className="size-4" />
            </Button>
            <Button variant="outline" onClick={handleExportAll}>
              <Download className="size-4 mr-2" /> Baixar Tudo
            </Button>
            <Button className="gradient-primary" onClick={handleNewFile}>
              <Upload className="size-4 mr-2" /> Upload SU
            </Button>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest font-black">
              Documentação por Nível Hierárquico
            </CardTitle>
            <CardDescription>
              Manuais, Políticas e Arquivos de Configuração do Sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-6">
                    <Checkbox
                      checked={
                        selectedDocIds.length === filteredDocs.length &&
                        filteredDocs.length > 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked)
                          setSelectedDocIds(filteredDocs.map((d) => d.id));
                        else setSelectedDocIds([]);
                      }}
                    />
                  </TableHead>
                  <TableHead className="uppercase text-[10px] font-bold">
                    Arquivo
                  </TableHead>
                  <TableHead className="uppercase text-[10px] font-bold">
                    Tipo
                  </TableHead>
                  <TableHead className="uppercase text-[10px] font-bold">
                    Data
                  </TableHead>
                  <TableHead className="text-right pr-6 uppercase text-[10px] font-bold">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-10 italic opacity-50"
                    >
                      Pasta vazia
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => (
                    <TableRow
                      key={doc.id}
                      onClick={(e) => handleRowClick(e, doc.id)}
                      className={`cursor-pointer ${selectedDocIds.includes(doc.id) ? "bg-primary/10" : "hover:bg-white/5"}`}
                    >
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedDocIds.includes(doc.id)}
                          onCheckedChange={() => {
                            setSelectedDocIds((prev) =>
                              prev.includes(doc.id)
                                ? prev.filter((id) => id !== doc.id)
                                : [...prev, doc.id],
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="size-4 text-primary" />
                          <span className="font-bold text-sm">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {doc.docType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {doc.updatedAt
                          ? // Safe date formatting
                            (() => {
                              try {
                                const date = new Date(doc.updatedAt);
                                return isNaN(date.getTime())
                                  ? "-"
                                  : format(date, "dd/MM/yyyy");
                              } catch {
                                return "-";
                              }
                            })()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => previewDocument(doc)}
                            title="Visualizar"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => downloadDocument(doc)}
                            title="Download"
                          >
                            <Download className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            onClick={() => deleteDocument(doc.id, doc.fileUrl)}
                            title="Excluir"
                          >
                            <Trash2 className="size-4" />
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

      {contextFolder && (
        <FolderPermissionsModal
          open={permissionModalOpen}
          onOpenChange={setPermissionModalOpen}
          document={contextFolder}
          onSave={handleSavePermissions}
        />
      )}

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
              <Label className="text-[10px] uppercase font-black tracking-widest opacity-60">
                Novo Nome
              </Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="industrial-input"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && confirmRename()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRenameDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="gradient-primary"
              onClick={confirmRename}
            >
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova Pasta Dialog */}
      <Dialog
        open={isNewFolderDialogOpen}
        onOpenChange={setIsNewFolderDialogOpen}
      >
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
              <Label className="text-[10px] uppercase font-black tracking-widest opacity-60">
                Nome da Pasta
              </Label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="industrial-input"
                placeholder="Ex: Relatórios Técnicos"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && confirmNewFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNewFolderDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="gradient-primary"
              onClick={confirmNewFolder}
            >
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Dialog */}
      <Dialog
        open={!!infoDialogContent}
        onOpenChange={(open) => !open && setInfoDialogContent(null)}
      >
        <DialogContent className="glass-card border-white/10 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />{" "}
              {infoDialogContent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 bg-white/2 rounded-lg p-4 border border-white/5">
            <pre className="text-xs font-mono text-white/70 whitespace-pre-wrap leading-relaxed">
              {infoDialogContent?.body}
            </pre>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10"
              onClick={() => setInfoDialogContent(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir AlertDialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Tem certeza que deseja excluir permanentemente{" "}
              <strong>"{deleteTarget?.name}"</strong>? esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 h-9">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 h-9"
              onClick={() =>
                deleteTarget &&
                handleDelete(deleteTarget.id, deleteTarget.storagePath)
              }
            >
              Excluir Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Estrutura Base AlertDialog */}
      <AlertDialog
        open={isBaseStructureConfirmOpen}
        onOpenChange={setIsBaseStructureConfirmOpen}
      >
        <AlertDialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Estrutura Base
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Deseja criar a estrutura de pastas padrão (**Empresa, Obra,
              Canteiro**)? Arquivos não serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 h-9">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="gradient-primary h-9"
              onClick={confirmCreateBaseStructure}
            >
              Confirmar Criação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Organizar AlertDialog */}
      <AlertDialog
        open={isOrganizeConfirmOpen}
        onOpenChange={setIsOrganizeConfirmOpen}
      >
        <AlertDialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FolderInput className="w-5 h-5 text-emerald-400" /> Organizar
              Raiz
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Deseja organizar automaticamente os arquivos soltos nas pastas
              apropriadas com base no contexto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 h-9">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="gradient-primary h-9"
              onClick={confirmOrganizeRoot}
            >
              Organizar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exclusão em Massa AlertDialog */}
      <AlertDialog
        open={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
      >
        <AlertDialogContent className="glass-card border-white/10 sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão em Massa
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Você selecionou <strong>{selectedDocIds.length}</strong> itens.
              Tem certeza que deseja excluí-los permanentemente? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 h-9">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 h-9"
              onClick={handleBulkDelete}
            >
              Excluir {selectedDocIds.length} Itens
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


