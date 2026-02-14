"use client"

import * as React from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
    ChevronRight,
    Folder,
    FolderOpen,
    File,
    FileText,
    FileImage,
    FileCode,
    Settings,
    FileJson,
    Edit2,
    Trash2,
    Archive,
    ExternalLink,
    Info,
    FolderPlus,
    FilePlus,
    Star,
    Zap,
    ChevronUp,
    Eye,
    Shield
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "sonner"

export interface FileNode {
    id: string
    name: string
    type: "file" | "folder"
    children?: FileNode[]
    extension?: string
}

interface FileTreeItemProps {
    node: FileNode
    level?: number
    onSelect?: (node: FileNode) => void
    selectedId?: string
    isMultiSelect?: boolean
    isSelected?: boolean
    getIsSelected?: (id: string) => boolean
    onAction?: (action: string, node: FileNode) => void
    onMove?: (sourceId: string, targetId: string) => void
}

const getFileIcon = (extension?: string) => {
    switch (extension) {
        case "txt":
        case "md":
        case "doc":
        case "pdf":
            return FileText
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "svg":
            return FileImage
        case "ts":
        case "tsx":
        case "js":
        case "jsx":
        case "css":
        case "html":
            return FileCode
        case "json":
            return FileJson
        case "settings":
            return Settings
        default:
            return File
    }
}

export function FileTreeItem({
    node,
    level = 0,
    onSelect,
    selectedId,
    isMultiSelect,
    isSelected,
    getIsSelected,
    onAction,
    onMove
}: FileTreeItemProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [isDragOver, setIsDragOver] = React.useState(false)
    const activeSelected = isMultiSelect ? (getIsSelected?.(node.id) ?? isSelected) : selectedId === node.id
    const FileIcon = node.type === "folder" ? (isOpen ? FolderOpen : Folder) : getFileIcon(node.extension)

    const [nodeName, setNodeName] = React.useState(node.name)

    const handleAction = (action: string) => {
        if (action === "Renomear") {
            const newName = window.prompt("Digite o novo nome:", nodeName);
            if (newName && newName !== nodeName) {
                setNodeName(newName);
                onAction?.("Renomear", { ...node, name: newName });
            }
        } else {
            onAction?.(action, node);
        }
    }

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData("sourceId", node.id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (node.type === "folder") {
            e.preventDefault();
            setIsDragOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const sourceId = e.dataTransfer.getData("sourceId");
        if (sourceId && sourceId !== node.id) {
            onMove?.(sourceId, node.id);
        }
    };

    const SelectionOverlay = () => {
        if (!isMultiSelect) return null
        const selected = getIsSelected?.(node.id) ?? isSelected
        return (
            <div className={cn(
                "size-3.5 rounded border border-white/20 flex items-center justify-center transition-colors shrink-0",
                selected ? "bg-primary border-primary" : "bg-transparent"
            )}>
                {selected && <svg className="size-2.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
            </div>
        )
    }

    const MenuContent = () => (
        <ContextMenuContent className="glass-card border-white/10 w-48">
            <ContextMenuItem onClick={() => handleAction("Abrir")} className="gap-2 font-bold">
                <Eye className="size-3.5" /> Abrir / Visualizar
            </ContextMenuItem>
            {node.type === "folder" && (
                <>
                    <ContextMenuItem onClick={() => handleAction("Novo Arquivo")} className="gap-2">
                        <FilePlus className="size-3.5" /> Novo Arquivo
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleAction("Nova Pasta")} className="gap-2">
                        <FolderPlus className="size-3.5" /> Nova Pasta
                    </ContextMenuItem>
                    <ContextMenuSeparator className="bg-white/5" />
                    <ContextMenuItem onClick={() => handleAction("Permissões")} className="gap-2">
                        <Shield className="size-3.5 text-primary" /> Gerenciar Permissões
                    </ContextMenuItem>
                </>
            )}
            <ContextMenuSeparator className="bg-white/5" />
            <ContextMenuItem onClick={() => handleAction("Renomear")} className="gap-2">
                <Edit2 className="size-3.5" /> Renomear
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction("Arquivar")} className="gap-2">
                <Archive className="size-3.5 text-amber-500" /> Arquivar
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-white/5" />
            <ContextMenuItem onClick={() => handleAction("Informações")} className="gap-2">
                <Info className="size-3.5" /> Informações
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction("Excluir")} className="gap-2 text-red-500 hover:text-red-400 focus:text-red-400">
                <Trash2 className="size-3.5" /> Excluir
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-white/5" />
            <ContextMenuItem onClick={() => handleAction("Marcar como Importante")} className="gap-2">
                <Star className="size-3.5 text-amber-500" /> Marcar como Importante
            </ContextMenuItem>
            {node.type === "folder" && (
                <ContextMenuItem onClick={() => handleAction("Nova Pasta Inteligente")} className="gap-2">
                    <Zap className="size-3.5 text-primary" /> Estrutura Automática
                </ContextMenuItem>
            )}
            <ContextMenuItem onClick={() => handleAction("Mover para Raiz")} className="gap-2">
                <ChevronUp className="size-3.5" /> Mover para Raiz
            </ContextMenuItem>
        </ContextMenuContent>
    )

    if (node.type === "folder" && node.children) {
        return (
            <ContextMenu>
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <ContextMenuTrigger asChild>
                        <CollapsibleTrigger
                            className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/5",
                                activeSelected && "bg-primary/10 text-primary",
                                isDragOver && "bg-primary/20 ring-1 ring-primary/50"
                            )}
                            style={{ paddingLeft: `${level * 16 + 8}px` }}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent bubbling
                                setIsOpen(!isOpen); // Toggle collapse
                                onSelect?.(node); // Select for main view filtering
                            }}
                            onDoubleClick={() => handleAction("Abrir")}
                            draggable
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <ChevronRight
                                className={cn(
                                    "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                    isOpen && "rotate-90",
                                )}
                            />
                            <SelectionOverlay />
                            <FileIcon className="size-4 shrink-0 text-cyan-500" />
                            <span className="truncate font-medium">{nodeName}</span>
                        </CollapsibleTrigger>
                    </ContextMenuTrigger>
                    <CollapsibleContent>
                        {node.children.map((child) => (
                            <FileTreeItem
                                key={child.id}
                                node={child}
                                level={level + 1}
                                onSelect={onSelect}
                                selectedId={selectedId}
                                isMultiSelect={isMultiSelect}
                                getIsSelected={getIsSelected}
                                onAction={onAction}
                                onMove={onMove}
                            />
                        ))}
                    </CollapsibleContent>
                </Collapsible>
                <MenuContent />
            </ContextMenu>
        )
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/5",
                        activeSelected && "bg-primary/10 text-primary",
                        isDragOver && "bg-primary/20 ring-1 ring-primary/50"
                    )}
                    style={{ paddingLeft: `${level * 16 + 28}px` }}
                    onClick={() => onSelect?.(node)}
                    onDoubleClick={() => handleAction("Abrir")}
                    draggable
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <SelectionOverlay />
                    <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{nodeName}</span>
                </button>
            </ContextMenuTrigger>
            <MenuContent />
        </ContextMenu>
    )
}
