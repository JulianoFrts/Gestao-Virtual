"use client"

import * as React from "react"
import { FileExplorer, type FileNode } from "./file-explorer"
import { Files, List, Settings, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { DocumentApprovalModal } from "../document-approval-modal"
import { ConstructionDocument } from "@/hooks/useConstructionDocuments"

interface DocumentSidebarProps {
    onFileSelect?: (node: FileNode) => void
    onNewFile?: () => void
    onNewFolder?: () => void
    onRefresh?: () => void
    onAction?: (action: string, node: FileNode) => void
    onMove?: (sourceId: string, targetId: string) => void
    files?: FileNode[]
    className?: string
    // Approval Props
    documents?: ConstructionDocument[]
    isAdmin?: boolean
    onApprove?: (doc: ConstructionDocument) => void
    onReject?: (doc: ConstructionDocument) => void
}

// Mock data for document tree structure
const mockFileTree: FileNode[] = [
    {
        id: "1",
        name: "Projetos",
        type: "folder",
        children: [
            {
                id: "1-1",
                name: "Obra Centro Comercial",
                type: "folder",
                children: [
                    { id: "1-1-1", name: "Contrato Principal - Centro Comercial", type: "file", extension: "pdf" },
                    { id: "1-1-2", name: "Relatório Mensal - Janeiro 2026", type: "file", extension: "pdf" },
                ]
            },
            {
                id: "1-2",
                name: "Residencial Vista Mar",
                type: "folder",
                children: [
                    { id: "1-2-1", name: "Planta Baixa - Térreo", type: "file", extension: "pdf" },
                    { id: "1-2-2", name: "Aditivo Contratual #32", type: "file", extension: "pdf" },
                ]
            }
        ]
    },
    {
        id: "2",
        name: "Documentos Legais",
        type: "folder",
        children: [
            { id: "2-1", name: "Cronograma Físico-Financeiro", type: "file", extension: "pdf" },
        ]
    },
    {
        id: "3",
        name: "Terramaster",
        type: "folder",
        children: []
    },
    { id: "4", name: "config.json", type: "file", extension: "json" }
]

export function DocumentSidebar({
    onFileSelect,
    onNewFile,
    onNewFolder,
    onRefresh,
    onAction,
    onMove,
    files,
    className,
    documents = [],
    isAdmin = false,
    onApprove = () => { },
    onReject = () => { }
}: DocumentSidebarProps) {
    const [activeTab, setActiveTab] = React.useState("files")

    const displayFiles = files !== undefined ? files : mockFileTree;

    return (
        <div className={`flex h-full flex-col ${className || ''}`}>
            {/* Top Tabs */}
            <div className="flex border-b border-white/5 bg-black/20">
                <button
                    onClick={() => setActiveTab("files")}
                    className={`flex-1 flex justify-center py-3 transition-colors hover:bg-white/5 ${activeTab === "files" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                >
                    <Files className="size-5" />
                </button>
                <button
                    onClick={() => {
                        setActiveTab("list")
                        toast.info("Visualização de lista em desenvolvimento")
                    }}
                    className={`flex-1 flex justify-center py-3 transition-colors hover:bg-white/5 ${activeTab === "list" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                >
                    <List className="size-5" />
                </button>
                <button
                    onClick={() => {
                        setActiveTab("settings")
                        toast.info("Configurações do explorador em desenvolvimento")
                    }}
                    className={`flex-1 flex justify-center py-3 transition-colors hover:bg-white/5 ${activeTab === "settings" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
                >
                    <Settings className="size-5" />
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                {activeTab === "files" ? (
                    <FileExplorer
                        files={displayFiles}
                        onSelect={onFileSelect}
                        onNewFile={onNewFile}
                        onNewFolder={onNewFolder}
                        onRefresh={onRefresh}
                        onAction={onAction}
                        onMove={onMove}
                        title="Explorer"
                    />
                ) : (
                    <div className="flex h-full flex-col gap-4 p-4 text-center text-sm text-muted-foreground">
                        {activeTab === "settings" && isAdmin ? (
                            <div className="flex flex-col gap-4 animate-in fade-in">
                                <div className="text-xs uppercase tracking-widest font-bold text-primary flex items-center justify-center gap-2">
                                    <ShieldAlert className="size-4" /> Área Administrativa
                                </div>
                                <p className="text-xs">Gerencie a aprovação de arquivos enviados pelos usuários.</p>
                                <DocumentApprovalModal
                                    documents={documents}
                                    onApprove={onApprove}
                                    onReject={onReject}
                                />
                            </div>
                        ) : (
                            <div className="italic opacity-50">
                                {activeTab === "list" ? "Abra a aba de arquivos para navegar pelos documentos." : "Acesso restrito a administradores."}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export { type FileNode }
