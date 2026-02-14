import React, { lazy } from "react";
import {
  BarChart3,
  Building2,
  Clock,
  Coins,
  Database,
  HardHat,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  MapPin,
  ClipboardList,
  History,
  Briefcase,
} from "lucide-react";

// Lazy-loaded components for better split and initial load
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Functions = lazy(() => import("../pages/Functions"));
const Employees = lazy(() => import("../pages/Employees"));
const Teams = lazy(() => import("../pages/Teams"));
const TimeClock = lazy(() => import("../pages/TimeClock"));
const DailyReport = lazy(() => import("../pages/DailyReport"));

const SettingsPage = lazy(() => import("../pages/Settings"));
const UsersPage = lazy(() => import("../pages/Users"));
const Reports = lazy(() => import("../pages/Reports"));
const TimeRecords = lazy(() => import("../pages/TimeRecords"));
const Companies = lazy(() => import("../pages/Companies"));
const Projects = lazy(() => import("../pages/Projects"));
const Sites = lazy(() => import("../pages/Sites"));
const TeamComposition = lazy(
  () =>
    import("../pages/TeamComposition") as unknown as Promise<{
      default: React.ComponentType<unknown>;
    }>,
);
const TeamCompositionTable = lazy(() => {
  return import("../pages/TeamCompositionTable");
});
const Messages = lazy(() => import("../pages/Messages"));
const CustomSU = lazy(() => import("../pages/CustomSU"));
const AuditLogs = lazy(() => import("../pages/AuditLogs"));
const GAPO = lazy(() => import("../pages/GAPO"));
const ProjectProgress = lazy(() => import("../pages/ProjectProgress"));
const DatabaseHub = lazy(() => import("../pages/DatabaseHub"));
const Viewer3D = lazy(() => import("../pages/Viewer3D"));
const GeoViewerPage = lazy(
  () => import("../modules/geo-viewer/pages/GeoViewerPage"),
);
const ProductionPage = lazy(
  () => import("../modules/production/pages/ProductionPage"),
);
const ProductionAnalyticsPage = lazy(
  () => import("../modules/production/pages/ProductionAnalyticsPage"),
);
const CostsPage = lazy(() => import("../modules/costs/pages/CostsPage"));
const Auth = lazy(() => import("../pages/Auth"));

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  moduleId?: string;
  requireConnection?: boolean;
  layout?: "app" | "fullscreen" | "desktop" | "none";
  label?: string;
  icon?: React.ElementType;
}

export const routes: RouteConfig[] = [
  // Authentication
  {
    path: "/auth",
    element: <Auth />,
    layout: "desktop",
  },

  // App Layout Routes
  {
    path: "/dashboard",
    element: <Dashboard />,
    moduleId: "dashboard",
    layout: "app",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/functions",
    element: <Functions />,
    moduleId: "users.manage",
    requireConnection: true,
    layout: "app",
    label: "Funções",
    icon: Briefcase,
  },
  {
    path: "/employees",
    element: <Employees />,
    moduleId: "employees.manage",
    layout: "app",
    label: "Funcionários",
    icon: Users,
  },
  {
    path: "/teams",
    element: <Teams />,
    moduleId: "team_composition",
    layout: "app",
    label: "Equipes",
    icon: Users,
  },
  {
    path: "/time-clock",
    element: <TimeClock />,
    moduleId: "clock",
    layout: "app",
    label: "Registro de Ponto",
    icon: Clock,
  },
  {
    path: "/daily-report",
    element: <DailyReport />,
    moduleId: "daily_reports",
    layout: "app",
    label: "RDO",
    icon: ClipboardList,
  },
  {
    path: "/users",
    element: <UsersPage />,
    moduleId: "users.manage",
    requireConnection: true,
    layout: "app",
    label: "Usuários",
    icon: ShieldCheck,
  },
  {
    path: "/custom-su",
    element: <CustomSU />,
    moduleId: "custom_su.manage",
    requireConnection: true,
    layout: "app",
    label: "Custom SU",
    icon: ShieldCheck,
  },
  {
    path: "/audit-logs",
    element: <AuditLogs />,
    moduleId: "audit_logs.view",
    requireConnection: true,
    layout: "app",
    label: "Logs de Auditoria",
    icon: History,
  },
  {
    path: "/settings",
    element: <SettingsPage />,
    moduleId: "settings.profile",
    layout: "app",
    label: "Configurações",
    icon: Settings,
  },
  {
    path: "/messages",
    element: <Messages />,
    moduleId: "dashboard",
    layout: "app",
    label: "Mensagens",
    icon: MessageSquare,
  },
  {
    path: "/companies",
    element: <Companies />,
    moduleId: "companies.view",
    layout: "app",
    label: "Empresas",
    icon: Building2,
  },
  {
    path: "/projects",
    element: <Projects />,
    moduleId: "projects.view",
    layout: "app",
    label: "Projetos",
    icon: Layers,
  },
  {
    path: "/sites",
    element: <Sites />,
    moduleId: "sites.view",
    layout: "app",
    label: "Canteiros",
    icon: MapPin,
  },
  {
    path: "/reports",
    element: <Reports />,
    moduleId: "daily_reports",
    layout: "app",
    label: "Relatórios",
    icon: ClipboardList,
  },
  {
    path: "/time-records",
    element: <TimeRecords />,
    moduleId: "time_records.view",
    layout: "app",
    label: "Registros de Ponto",
    icon: History,
  },
  {
    path: "/team-composition",
    element: <TeamComposition />,
    moduleId: "team_composition",
    layout: "app",
    label: "Composição de Equipe",
    icon: Users,
  },
  {
    path: "/team-composition-table",
    element: <TeamCompositionTable />,
    moduleId: "team_composition",
    layout: "app",
  },
  {
    path: "/gapo",
    element: <GAPO />,
    moduleId: "gapo.view",
    layout: "app",
    label: "GAPO",
    icon: HardHat,
  },
  {
    path: "/database-hub",
    element: <DatabaseHub />,
    moduleId: "custom_su.manage",
    requireConnection: true,
    layout: "app",
    label: "Banco de Dados",
    icon: Database,
  },
  {
    path: "/producao",
    element: <ProductionPage />,
    moduleId: "projects.progress",
    layout: "app",
    label: "Produção",
    icon: HardHat,
  },
  {
    path: "/producao/analytics",
    element: <ProductionAnalyticsPage />,
    moduleId: "projects.progress",
    layout: "app",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    path: "/custos",
    element: <CostsPage />,
    moduleId: "costs.view",
    layout: "app",
    label: "Custos",
    icon: Coins,
  },

  // Fullscreen Routes
  {
    path: "/viewer-3d",
    element: <Viewer3D />,
    moduleId: "projects.view",
    layout: "fullscreen",
  },
  {
    path: "/geo-viewer",
    element: <GeoViewerPage />,
    moduleId: "projects.view",
    layout: "fullscreen",
  },
  {
    path: "/project-progress",
    element: <ProjectProgress />,
    moduleId: "projects.progress",
    layout: "fullscreen",
  },
];
