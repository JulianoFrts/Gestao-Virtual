"use client"

import * as React from "react"
import { FileTreeItem, type FileNode } from "./file-tree-item"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus, FolderPlus, RefreshCw, MoreHorizontal, ChevronDown, Activity, History as HistoryIcon, ShieldCheck } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FileExplorerProps {
    files: FileNode[]
    onSelect?: (node: FileNode) => void
    onNewFile?: () => void
    onNewFolder?: () => void
    onRefresh?: () => void
    onAction?: (action: string, node: FileNode) => void
    onMove?: (sourceId: string, targetId: string) => void
    title?: string
}

import { toast } from "sonner"

export function FileExplorer({
    files: initialFiles,
    onSelect,
    onNewFile,
    onNewFolder,
    onRefresh,
    onAction,
    onMove,
    title = "Explorer",
}: FileExplorerProps) {
    const [selectedId, setSelectedId] = React.useState<string>()
    const [searchQuery, setSearchQuery] = React.useState("")
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const [isMultiSelect, setIsMultiSelect] = React.useState(false)
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
    const [sortBy, setSortBy] = React.useState<"name" | "type" | "date">("type")
    const [files, setFiles] = React.useState(initialFiles)

    React.useEffect(() => {
        setFiles(initialFiles)
    }, [initialFiles])

    const handleSelect = (node: FileNode) => {
        if (isMultiSelect) {
            const newSelected = new Set(selectedIds)
            if (newSelected.has(node.id)) {
                newSelected.delete(node.id)
            } else {
                newSelected.add(node.id)
            }
            setSelectedIds(newSelected)
        } else {
            setSelectedId(node.id)
            onSelect?.(node)
        }
    }

    const handleMove = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return;

        let movedNode: FileNode | null = null;

        // Function to find and remove the node
        const findAndRemove = (nodes: FileNode[]): FileNode[] => {
            return nodes.reduce<FileNode[]>((acc, node) => {
                if (node.id === sourceId) {
                    movedNode = node;
                    return acc;
                }
                if (node.children) {
                    return [...acc, { ...node, children: findAndRemove(node.children) }];
                }
                return [...acc, node];
            }, []);
        };

        // Function to find target and add the node
        const findAndAdd = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
                if (node.id === targetId && node.type === "folder") {
                    return {
                        ...node,
                        children: [...(node.children || []), movedNode!]
                    };
                }
                if (node.children) {
                    return { ...node, children: findAndAdd(node.children) };
                }
                return node;
            });
        };

        const newFilesWithoutSource = findAndRemove(files);
        if (!movedNode) return;

        const updatedFiles = findAndAdd(newFilesWithoutSource);
        setFiles(updatedFiles);
        onMove?.(sourceId, targetId);
    }

    const sortNodes = (nodes: FileNode[]): FileNode[] => {
        return [...nodes].sort((a, b) => {
            if (sortBy === "name") return a.name.localeCompare(b.name)
            if (sortBy === "type") {
                if (a.type !== b.type) return a.type === "folder" ? -1 : 1
                return (a.extension || "").localeCompare(b.extension || "")
            }
            // Date sorting would need a date field, using ID as tie-breaker for mock
            return a.id.localeCompare(b.id)
        }).map(node => node.children ? { ...node, children: sortNodes(node.children) } : node)
    }

    const filterFiles = (nodes: FileNode[], query: string): FileNode[] => {
        if (!query) return sortNodes(nodes)

        return nodes.reduce<FileNode[]>((acc, node) => {
            if (node.name.toLowerCase().includes(query.toLowerCase())) {
                acc.push(node)
            } else if (node.children) {
                const filteredChildren = filterFiles(node.children, query)
                if (filteredChildren.length > 0) {
                    acc.push({ ...node, children: filteredChildren })
                }
            }
            return acc
        }, [])
    }

    const filteredFiles = filterFiles(files, searchQuery)

    return (
        <div className="flex h-full flex-col border-r border-white/5 bg-card/50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('text-primary');
                    }}
                    onDragLeave={(e) => {
                        e.currentTarget.classList.remove('text-primary');
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('text-primary');
                        const sourceId = e.dataTransfer.getData("sourceId");
                        if (sourceId) onMove?.(sourceId, "root");
                    }}
                    className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronDown className={`size-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    {title}
                </button>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`size-6 hover:bg-white/5 ${isMultiSelect ? "text-primary bg-primary/10" : ""}`}
                        onClick={() => setIsMultiSelect(!isMultiSelect)}
                        title="Seleção Múltipla"
                    >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="m9 12 2 2 4-4" /></svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6 hover:bg-white/5" onClick={onNewFile} title="Novo Arquivo">
                        <Plus className="size-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-6 hover:bg-white/5" title="Mais Opções de Pasta">
                                <FolderPlus className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card border-white/10 w-48">
                            <DropdownMenuItem onClick={onNewFolder}>
                                <Plus className="w-3 h-3 mr-2" /> Nova Pasta Simples
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onAction?.("Nova Pasta Inteligente", { id: 'template-obra', name: 'Obra', type: 'folder' })}>
                                <Activity className="w-3 h-3 mr-2 text-primary" /> Estrutura de Obra
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction?.("Nova Pasta Inteligente", { id: 'template-financeiro', name: 'Financeiro', type: 'folder' })}>
                                <HistoryIcon className="w-3 h-3 mr-2 text-primary" /> Pasta Financeira
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction?.("Nova Pasta Inteligente", { id: 'template-seguranca', name: 'Segurança', type: 'folder' })}>
                                <ShieldCheck className="w-3 h-3 mr-2 text-primary" /> Pasta de Segurança
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" className="size-6 hover:bg-white/5" onClick={onRefresh} title="Atualizar">
                        <RefreshCw className="size-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-6 hover:bg-white/5">
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card border-white/10">
                            <DropdownMenuItem onClick={() => toast.info("Expandindo todas as pastas...")}>Expandir Tudo</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Recolhendo todas as pastas...")}>Recolher Tudo</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSortBy("name"); toast.success("Ordenado por nome") }}>Ordenar por Nome</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSortBy("type"); toast.success("Ordenado por tipo") }}>Ordenar por Tipo</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSortBy("date"); toast.success("Ordenado por data") }}>Ordenar por Data</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Search */}
            {!isCollapsed && (
                <>
                    <div className="border-b border-white/5 p-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar arquivos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 text-sm bg-white/5 border-white/10 focus:border-primary/50"
                            />
                        </div>
                    </div>

                    {/* File Tree */}
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                            {filteredFiles.length > 0 ? (
                                filteredFiles.map((node) => (
                                    <FileTreeItem
                                        key={node.id}
                                        node={node}
                                        onSelect={handleSelect}
                                        selectedId={isMultiSelect ? undefined : selectedId}
                                        isMultiSelect={isMultiSelect}
                                        getIsSelected={(id) => selectedIds.has(id)}
                                        onAction={onAction}
                                        onMove={handleMove}
                                    />
                                ))
                            ) : (
                                <p className="py-4 text-center text-sm text-muted-foreground italic">Nenhum arquivo encontrado</p>
                            )}
                        </div>
                    </ScrollArea>

                    {isMultiSelect && selectedIds.size > 0 && (
                        <div className="p-2 border-t border-white/5 bg-primary/5">
                            <Button variant="ghost" size="sm" className="w-full text-[10px] h-7 uppercase font-bold" onClick={() => setSelectedIds(new Set())}>
                                Limpar Seleção ({selectedIds.size})
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export type { FileNode }
