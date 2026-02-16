import React from 'react';
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
    title: "Produção, Planejamento e Custos",
    items: [
      {
        id: "projects.progress",
        icon: Map,
        label: "Andamento de Projetos",
        path: "/project-progress",
        requiresProject: true,
      },
      {
        id: "projects.progress",
        icon: ClipboardList,
        label: "Planejamento e Grelha",
        path: "/producao",
        requiresProject: true,
      },
      {
        id: "projects.progress",
        icon: PieChart,
        label: "Analytics da Obra",
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
        label: "Funcionários (Employers)",
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
        label: "Composição de Equipes",
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
  const [isExpanded, setIsExpanded] = React.useState(
    hasActiveChild || !isCollapsible,
  );

  if (visibleItems.length === 0) return null;

  return (
    <div
      className="space-y-2 animate-fade-in"
      style={{ animationDelay: `${groupIdx * 0.1}s` }}
    >
      <button
        onClick={() => isCollapsible && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-4 flex items-center justify-between group/title transition-all py-2 rounded-lg",
          isCollapsible
            ? "cursor-pointer hover:bg-sidebar-accent text-sidebar-foreground hover:text-white"
            : "cursor-default text-sidebar-foreground/60",
        )}
      >
        <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-0 transition-colors leading-none">
          {group.title}
          {!isCollapsible && (
            <div className="flex-1 h-px bg-sidebar-border w-24 opacity-20" />
          )}
        </h3>
        {isCollapsible && (
          <div className="flex items-center gap-2">
            <div className="h-px bg-sidebar-border w-4 opacity-20" />
            <ChevronDown
              className={cn(
                "h-3 w-3 text-sidebar-foreground/30 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                isExpanded ? "rotate-180 text-primary" : "rotate-0",
              )}
            />
          </div>
        )}
      </button>

      <div
        className={cn(
          "space-y-1 overflow-hidden transition-all duration-500 ease-in-out",
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
                "flex items-center gap-3 px-4 py-2 rounded-xl font-medium transition-all duration-300 group/nav relative overflow-hidden mx-1",
                isActive
                  ? "gradient-primary text-primary-foreground shadow-premium scale-[1.02]"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-1",
              )}
              style={{
                animation: `fadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                animationDelay: `${groupIdx * 0.1 + itemIdx * 0.05}s`,
                opacity: 0,
              }}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isActive
                    ? "scale-105"
                    : "group-hover/nav:scale-110 group-hover/nav:text-primary",
                )}
              />
              <span className="text-sm leading-tight">{item.label}</span>

              {!isActive && (
                <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-primary/5 to-transparent -translate-x-full group-hover/nav:translate-x-full transition-transform duration-1000 opacity-30" />
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
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar-background/60 backdrop-blur-2xl shadow-premium transform transition-all duration-300 ease-in-out lg:z-auto border-r border-white/5 overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
          desktopOpen ? "lg:translate-x-0 lg:w-72 lg:static" : "lg:-translate-x-full lg:w-0 lg:absolute"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-start w-full px-2 py-2">
              <Logo className="w-full max-w-[180px]" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
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
          <div className="p-4 border-t border-white/5 bg-sidebar-background/20 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0 border border-white/10 overflow-hidden">
                {profile?.image ? (
                  <img
                    src={profile.image}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-primary-foreground text-lg uppercase">
                    {displayName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p
                    className={cn(
                      "text-sm font-bold truncate leading-none",
                      isProtectedUser(profile as UserScope)
                        ? "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                        : "text-sidebar-foreground",
                    )}
                  >
                    {displayName}
                  </p>
                  {isProtectedUser(profile as UserScope) && (
                    <ShieldCheck className="w-3 h-3 text-orange-500 shrink-0" />
                  )}
                </div>
                <span
                  className={cn(
                    "inline-block w-fit mt-1 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-tighter transition-all leading-tight",
                    getRoleStyle(profile?.role || "worker"),
                  )}
                >
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
