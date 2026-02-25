import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    ChevronRight,
    ChevronDown,
    PanelLeftClose,
    PanelLeftOpen,
    Edit2,
    Upload,
    Plus,
    Trash2,
    Activity,
    Database,
    BarChart3,
    Link2,
    Loader2,
    Settings2,
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ProductionSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    // Gestão
    onConfigureStages: () => void;
    onImportTowers: () => void;
    onNewTower: () => void;
    // Ações em Lote
    selectedCount: number;
    totalCount: number;
    onBulkDelete: () => void;
    onDeleteAll: () => void;
    onAutoLink: () => void;
    onUnlinkAll: () => void;
    isBulkDeleting: boolean;
    isBulkLinking: boolean;
    // Navegação
    onNavigateProject: () => void;
    onNavigateAnalytics: () => void;
}

interface SidebarSectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    isCollapsed?: boolean;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
    title,
    icon,
    children,
    defaultOpen = false,
    isCollapsed = false,
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button
                    className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left",
                        "text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70",
                        "hover:bg-white/5 hover:text-muted-foreground transition-all duration-300 ease-out",
                        "group cursor-pointer select-none",
                        open && "text-primary/80 bg-primary/5"
                    )}
                >
                    <span className="shrink-0 text-primary/50 group-hover:text-primary transition-colors duration-300">
                        {icon}
                    </span>
                    {!isCollapsed && (
                        <>
                            <span className="flex-1 truncate">{title}</span>
                            <span className="shrink-0 text-muted-foreground/40 transition-transform duration-300 ease-out">
                                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </span>
                        </>
                    )}
                </button>
            </CollapsibleTrigger>

            {!isCollapsed && (
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-300">
                    <div className="flex flex-col gap-1 pl-3 pr-1 py-1.5 ml-3 border-l border-primary/10">
                        {children}
                    </div>
                </CollapsibleContent>
            )}
        </Collapsible>
    );
};

interface SidebarButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    variant?: "default" | "primary" | "danger";
    disabled?: boolean;
    isCollapsed?: boolean;
    loading?: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({
    icon,
    label,
    onClick,
    variant = "default",
    disabled = false,
    isCollapsed = false,
    loading = false,
}) => {
    const baseClasses = cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold",
        "transition-all duration-200 ease-out cursor-pointer select-none",
        "active:scale-[0.97]",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
    );

    const variantClasses = {
        default: "text-foreground/80 hover:bg-white/5 hover:text-foreground",
        primary: "text-primary hover:bg-primary/10 hover:shadow-[0_0_12px_rgba(var(--primary),0.15)]",
        danger: "text-red-400/80 hover:bg-red-500/10 hover:text-red-400",
    };

    const button = (
        <button
            className={cn(baseClasses, variantClasses[variant])}
            onClick={onClick}
            disabled={disabled}
        >
            <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
            </span>
            {!isCollapsed && <span className="truncate">{label}</span>}
        </button>
    );

    if (isCollapsed) {
        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 text-xs font-bold border-white/10">
                        {label}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return button;
};

const ProductionSidebar: React.FC<ProductionSidebarProps> = ({
    isOpen,
    onToggle,
    onConfigureStages,
    onImportTowers,
    onNewTower,
    selectedCount,
    totalCount,
    onBulkDelete,
    onDeleteAll,
    onAutoLink,
    onUnlinkAll,
    isBulkDeleting,
    isBulkLinking,
    onNavigateProject,
    onNavigateAnalytics,
}) => {
    const isCollapsed = !isOpen;

    return (
        <div
            className={cn(
                "shrink-0 flex flex-col h-full bg-[#0a0806]/80 backdrop-blur-xl",
                "border-r border-amber-900/15 transition-all duration-500 ease-out",
                "shadow-[2px_0_20px_rgba(0,0,0,0.3)]",
                isOpen ? "w-[220px]" : "w-[52px]"
            )}
        >
            {/* Toggle Button */}
            <div className="flex items-center justify-end p-2 border-b border-white/5">
                <button
                    onClick={onToggle}
                    className={cn(
                        "p-2 rounded-lg text-muted-foreground/50 hover:text-primary",
                        "hover:bg-primary/10 transition-all duration-300 ease-out",
                        "active:scale-90",
                        !isOpen && "mx-auto"
                    )}
                    title={isOpen ? "Recolher painel" : "Expandir painel"}
                >
                    {isOpen ? (
                        <PanelLeftClose className="w-4 h-4" />
                    ) : (
                        <PanelLeftOpen className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent py-2 px-1.5 space-y-1">
                {/* Seção: Gestão */}
                <SidebarSection
                    title="Gestão"
                    icon={<Settings2 className="w-3.5 h-3.5" />}
                    defaultOpen={true}
                    isCollapsed={isCollapsed}
                >
                    <SidebarButton
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                        label="Configurar Etapas"
                        onClick={onConfigureStages}
                        isCollapsed={isCollapsed}
                    />
                    <SidebarButton
                        icon={<Upload className="w-3.5 h-3.5" />}
                        label="Importar Torres"
                        onClick={onImportTowers}
                        isCollapsed={isCollapsed}
                    />
                    <SidebarButton
                        icon={<Plus className="w-3.5 h-3.5" />}
                        label="Nova Torre"
                        onClick={onNewTower}
                        variant="primary"
                        isCollapsed={isCollapsed}
                    />
                </SidebarSection>

                {/* Seção: Ações em Lote */}
                <SidebarSection
                    title="Ações"
                    icon={<Activity className="w-3.5 h-3.5" />}
                    defaultOpen={false}
                    isCollapsed={isCollapsed}
                >
                    <SidebarButton
                        icon={<Link2 className="w-3.5 h-3.5" />}
                        label="Auto-Vincular Todas"
                        onClick={onAutoLink}
                        loading={isBulkLinking}
                        disabled={isBulkLinking}
                        isCollapsed={isCollapsed}
                    />
                    <SidebarButton
                        icon={<Activity className="w-3.5 h-3.5" />}
                        label="Desvincular Todas"
                        onClick={onUnlinkAll}
                        variant="danger"
                        isCollapsed={isCollapsed}
                    />

                    {selectedCount > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div>
                                    <SidebarButton
                                        icon={<Trash2 className="w-3.5 h-3.5" />}
                                        label={`Excluir (${selectedCount})`}
                                        onClick={() => {}}
                                        variant="danger"
                                        loading={isBulkDeleting}
                                        disabled={isBulkDeleting}
                                        isCollapsed={isCollapsed}
                                    />
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tem certeza que deseja excluir <b>{selectedCount}</b> torres selecionadas?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={onBulkDelete} className="bg-destructive hover:bg-destructive/90">
                                        Excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {selectedCount === 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <div>
                                    <SidebarButton
                                        icon={<Trash2 className="w-3.5 h-3.5" />}
                                        label="Excluir Tudo"
                                        onClick={() => {}}
                                        variant="danger"
                                        disabled={isBulkDeleting || totalCount === 0}
                                        isCollapsed={isCollapsed}
                                    />
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-destructive">PERIGO: Excluir TODO o Projeto?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Você está prestes a excluir <b>TODAS AS TORRES</b> deste projeto.<br /><br />
                                        Quantidade: <b>{totalCount} torres</b>.<br /><br />
                                        Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDeleteAll} className="bg-destructive hover:bg-destructive/90">
                                        Sim, Excluir TUDO
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </SidebarSection>

                {/* Separador */}
                <div className="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

                {/* Seção: Navegação */}
                <SidebarSection
                    title="Módulos"
                    icon={<Database className="w-3.5 h-3.5" />}
                    defaultOpen={true}
                    isCollapsed={isCollapsed}
                >
                    <SidebarButton
                        icon={<Database className="w-3.5 h-3.5" />}
                        label="Dados Técnicos"
                        onClick={onNavigateProject}
                        variant="primary"
                        isCollapsed={isCollapsed}
                    />
                    <SidebarButton
                        icon={<BarChart3 className="w-3.5 h-3.5" />}
                        label="Analytics & Custos"
                        onClick={onNavigateAnalytics}
                        isCollapsed={isCollapsed}
                    />
                </SidebarSection>
            </div>

            {/* Footer deco */}
            <div className="shrink-0 p-2 border-t border-white/5">
                <div className={cn(
                    "rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 transition-all duration-300",
                    isCollapsed && "px-1.5 py-1.5"
                )}>
                    {isOpen ? (
                        <div className="text-center">
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest">
                                Painel de Controle
                            </span>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <Settings2 className="w-3 h-3 text-primary/40" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductionSidebar;
