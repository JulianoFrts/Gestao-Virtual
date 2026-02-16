import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getRoleStyle, getRoleLabel } from '@/utils/roleUtils';
import {
  isFieldWorker,
  isProtectedUser,
  UserScope,
} from "@/utils/permissionHelpers";
import { isProtectedSignal, can, show } from "@/signals/authSignals";
import { logoUrlSignal, logoWidthSignal, initSettings } from "@/signals/settingsSignals";
import { ShieldCheck } from "lucide-react";
import {
  Home,
  Users,
  Briefcase,
  Clock,
  FileText,
  Settings,
  UsersRound,
  Shield,
  X,
  ClipboardList,
  Building2,
  HardHat,
  Truck,
  PieChart,
  FileSpreadsheet,
  Map,
  Database,
  Box,
  Coins,
  ChevronDown,
  LucideIcon,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEmployees } from "@/hooks/useEmployees";
import { useTeams } from "@/hooks/useTeams";
import { Logo } from "@/components/common/Logo";

interface SidebarItem {
  id: string;
  icon: LucideIcon;
  label: string;
  path: string;
  requiresProject?: boolean;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  desktopOpen?: boolean;
}

const menuGroups: SidebarGroup[] = [
  {
    title: "Principal",
    items: [
      { id: "dashboard", icon: Home, label: "Início", path: "/dashboard" },
    ],
  },
  {
    title: "Corporativo",
    items: [
      {
        id: "companies.view",
        icon: Building2,
        label: "Empresas",
        path: "/companies",
      },
      { id: "projects.view", icon: HardHat, label: "Obras", path: "/projects" },
      { id: "sites.view", icon: Truck, label: "Canteiros", path: "/sites" },
    ],
  },
  {
    title: "Produção & Custos", // Encurtado para limpar visual
    items: [
      {
        id: "projects.progress",
        icon: Map,
        label: "Andamento (Mapa)",
        path: "/project-progress",
        requiresProject: true,
      },
      {
        id: "projects.progress",
        icon: ClipboardList,
        label: "Planejamento",
        path: "/producao",
        requiresProject: true,
      },
      {
        id: "projects.progress",
        icon: PieChart,
        label: "Analytics",
        path: "/producao/analytics",
        requiresProject: true,
      },
      {
        id: "costs.view",
        icon: Coins,
        label: "Gestão de Custos",
        path: "/custos",
        requiresProject: true,
      },
      {
        id: "gapo.view",
        icon: ShieldCheck,
        label: "Módulo GAPO",
        path: "/gapo",
        requiresProject: true,
      },
    ],
  },
  {
    title: "Operacional",
    items: [
      {
        id: "clock",
        icon: Clock,
        label: "Registro de Ponto",
        path: "/time-clock",
      },
      {
        id: "daily_report.create",
        icon: FileText,
        label: "Novo Relatório",
        path: "/daily-report",
      },
      {
        id: "daily_report.list",
        icon: ClipboardList,
        label: "Relatórios Diários",
        path: "/reports",
      },
      {
        id: "time_records.view",
        icon: Clock,
        label: "Espelho de Ponto",
        path: "/time-records",
      },
    ],
  },
  {
    title: "Equipes",
    items: [
      {
        id: "team_composition",
        icon: UsersRound,
        label: "Equipes",
        path: "/teams",
      },
      {
        id: "employees.manage",
        icon: Users,
        label: "Funcionários",
        path: "/employees",
      },
      {
        id: "users.manage",
        icon: Briefcase,
        label: "Funções",
        path: "/functions",
      },
      {
        id: "team_composition",
        icon: PieChart,
        label: "Composição",
        path: "/team-composition",
      },
      {
        id: "team_composition",
        icon: FileSpreadsheet,
        label: "Tabela Detalhada",
        path: "/team-composition-table",
      },
    ],
  },
  {
    title: "Administração",
    items: [
      { id: "users.manage", icon: Shield, label: "Usuários", path: "/users" },
      {
        id: "custom_su.manage",
        icon: Shield,
        label: "Custom SU",
        path: "/custom-su",
      },
      {
        id: "custom_su.manage",
        icon: Database,
        label: "Database Hub",
        path: "/database-hub",
      },
      {
        id: "projects.view",
        icon: Box,
        label: "3D Anchor Lab",
        path: "/viewer-3d",
      },
      {
        id: "audit_logs.view",
        icon: Zap,
        label: "Auditoria Master",
        path: "/audit-logs?tab=standards",
      },

      {
        id: "audit_logs.view",
        icon: ShieldCheck,
        label: "Central de Segurança",
        path: "/audit-logs",
      },
    ],
  },
  {
    title: "Geral",
    items: [
      {
        id: "settings.profile",
        icon: Settings,
        label: "Configurações",
        path: "/settings",
      },
    ],
  },
];

import { useNavigate } from "react-router-dom";
import { ProjectModuleSelectionModal } from "../shared/ProjectModuleSelectionModal";

function SidebarGroupItem({
  group,
  groupIdx,
  location,
  profile,
  isTeamLeader,
  handleNavClick,
}: {
  group: SidebarGroup;
  groupIdx: number;
  location: any;
  profile: any;
  isTeamLeader: boolean;
  handleNavClick: (e: React.MouseEvent, item: SidebarItem) => void;
}) {
  const isCollapsible = group.title !== "Principal"; // Agora quase todos são colapsáveis
  const visibleItems = group.items.filter((item) => {
    if (isProtectedSignal.value || show("showAdminMenu")) return true;
    const moduleId = item.id;
    if (moduleId === "dashboard" || moduleId === "settings.profile")
      return true;
    if (
      can(moduleId) ||
      can(`${moduleId}.read`) ||
      can(`${moduleId}.view`) ||
      show(moduleId)
    )
      return true;
    if (
      moduleId === "clock" ||
      moduleId === "time_records.view" ||
      moduleId === "daily_report.create"
    ) {
      if (isFieldWorker(profile?.role)) {
        if (
          moduleId === "daily_report.create" &&
          (isTeamLeader || can("daily_report.create"))
        )
          return true;
        return true;
      }
    }
    return false;
  });

  const hasActiveChild = visibleItems.some(
    (item) => location.pathname === item.path,
  );
  const [isExpanded, setIsExpanded] = React.useState(true); 

  if (visibleItems.length === 0) return null;

  return (
    <div
      className="space-y-1 animate-fade-in mb-4" 
      style={{ animationDelay: `${groupIdx * 0.05}s` }}
    >
      <div
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-4 flex items-center justify-between group/title transition-all py-1.5 select-none",
          isCollapsible
            ? "cursor-pointer text-sidebar-foreground/50 hover:text-sidebar-foreground"
            : "cursor-default text-sidebar-foreground/50",
        )}
      >
        <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors leading-none">
          {group.title}
        </h3>
        {isCollapsible && (
          <ChevronDown
            className={cn(
              "h-3 w-3 text-sidebar-foreground/20 transition-transform duration-300",
              isExpanded ? "rotate-180" : "rotate-0",
            )}
          />
        )}
      </div>

      <div
        className={cn(
          "space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsible && !isExpanded
            ? "max-h-0 opacity-0"
            : "max-h-[800px] opacity-100",
        )}
      >
        {visibleItems.map((item, itemIdx) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                "flex items-center gap-3 px-4 py-2 mx-2 rounded-lg font-medium text-sm transition-all duration-200 group/nav relative overflow-hidden",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-300",
                   isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover/nav:text-sidebar-foreground"
                )}
              />
              <span className="truncate">{item.label}</span>
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 bg-primary rounded-r-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ isOpen, onClose, desktopOpen = true }: SidebarProps) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { employees } = useEmployees();
  const { teams } = useTeams();

  // Initialize Settings (Logo, etc)
  useEffect(() => {
    if (profile?.companyId) {
        initSettings(profile.companyId);
    } else {
        initSettings(); // Local load only
    }
  }, [profile?.companyId]);

  // Project Selection Modal State
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    path: string;
    label: string;
  }>({
    isOpen: false,
    path: "",
    label: "",
  });

  const displayName =
    profile?.fullName || user?.email?.split("@")[0] || "Usuário";
  //Verificar se o worker é líder de equipe (canLeadTeam + é supervisorId de alguma equipe)
  const workerEmployeeId = profile?.employeeId;
  const loggedEmployee = employees.find((e) => e.id === workerEmployeeId);
  const isTeamLeader =
    loggedEmployee?.canLeadTeam &&
    teams.some((t) => t.supervisorId === workerEmployeeId);

  const handleNavClick = (e: React.MouseEvent, item: SidebarItem) => {
    // 1. Check if item requires project
    if (item.requiresProject) {
      // 2. Exception: Gestão Global (isProtectedSignal or UI Admin access)
      const isGlobalManagement =
        isProtectedSignal.value || show("ui.admin_access");

      if (!isGlobalManagement) {
        // 3. User must select project
        e.preventDefault();
        setModalState({
          isOpen: true,
          path: item.path,
          label: item.label,
        });
        return;
      }
    }

    // Normal navigation
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar-background/80 backdrop-blur-2xl shadow-2xl transform transition-all duration-300 ease-in-out lg:z-auto border-r border-white/5 overflow-hidden flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          desktopOpen ? "lg:translate-x-0 lg:w-64 lg:static" : "lg:-translate-x-full lg:w-0 lg:absolute"
        )}
      >
        {/* Header containing Logo */}
        <div className="flex-none p-6 border-b border-white/5 flex flex-col items-center justify-center min-h-[100px] relative">
            {logoUrlSignal.value ? (
                <img 
                    src={logoUrlSignal.value} 
                    alt="Logo" 
                    className="object-contain transition-all duration-500"
                    style={{ 
                        width: `${logoWidthSignal.value}px`,
                        maxWidth: '100%',
                        maxHeight: '80px'
                    }}
                />
            ) : (
                // Fallback Text Logo if no image -> USANDO A ORIGINAL COM A TORRE
                <div style={{ transform: `scale(${Math.min(logoWidthSignal.value / 180, 1.3)})` }} className="transition-transform duration-300">
                    <Logo />
                </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 lg:hidden text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 space-y-2 scrollbar-hide px-2">
            {menuGroups.map((group, groupIdx) => (
              <SidebarGroupItem
                key={groupIdx}
                group={group}
                groupIdx={groupIdx}
                location={location}
                profile={profile}
                isTeamLeader={isTeamLeader}
                handleNavClick={handleNavClick}
              />
            ))}
        </nav>

        {/* Footer */}
        <div className="flex-none p-4 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shrink-0 border border-white/10 overflow-hidden">
                {profile?.image ? (
                  <img
                    src={profile.image}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-white text-sm">
                    {displayName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold truncate text-white leading-tight">
                    {displayName}
                  </p>
                  {isProtectedUser(profile as UserScope) && (
                    <ShieldCheck className="w-3 h-3 text-orange-400 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide leading-none",
                        getRoleStyle(profile?.role || "worker")
                    )}>
                        {getRoleLabel(profile?.role || "worker")}
                    </span>
                </div>
              </div>
            </div>
        </div>
      </aside>

      <ProjectModuleSelectionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
        onSelection={(_) => {
          navigate(modalState.path);
          onClose();
        }}
        moduleName={modalState.label}
      />
    </>
  );
}
