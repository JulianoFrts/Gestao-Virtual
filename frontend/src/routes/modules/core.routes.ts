import { lazy } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Settings,
  MessageSquare,
  Building2,
  Layers,
  MapPin
} from "lucide-react";
import { RouteConfig } from "../config";
import { ADMIN_ROLES, MANAGEMENT_ROLES, VIEWER_ROLES } from "@/lib/constants/roles";

const Dashboard = lazy(() => import("../../pages/Dashboard"));
const Functions = lazy(() => import("../../pages/Functions"));
const SettingsPage = lazy(() => import("../../pages/Settings"));
const Messages = lazy(() => import("../../pages/Messages"));
const Companies = lazy(() => import("../../pages/Companies"));
const Projects = lazy(() => import("../../pages/Projects"));
const Sites = lazy(() => import("../../pages/Sites"));

export const coreRoutes: RouteConfig[] = [
  {
    path: "/dashboard",
    element: Dashboard,
    moduleId: "dashboard",
    roles: VIEWER_ROLES,
    layout: "app",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/functions",
    element: Functions,
    moduleId: "functions.manage",
    roles: ADMIN_ROLES,
    requireConnection: true,
    layout: "app",
    label: "Funções",
    icon: Briefcase,
  },
  {
    path: "/settings",
    element: SettingsPage,
    moduleId: "settings.view",
    roles: VIEWER_ROLES,
    layout: "app",
    label: "Configurações",
    icon: Settings,
  },
  {
    path: "/messages",
    element: Messages,
    moduleId: "messages.view",
    roles: VIEWER_ROLES,
    layout: "app",
    label: "Mensagens",
    icon: MessageSquare,
  },
  {
    path: "/companies",
    element: Companies,
    moduleId: "companies.view",
    roles: ADMIN_ROLES,
    layout: "app",
    label: "Empresas",
    icon: Building2,
  },
  {
    path: "/projects",
    element: Projects,
    moduleId: "projects.view",
    roles: MANAGEMENT_ROLES,
    layout: "app",
    label: "Projetos",
    icon: Layers,
  },
  {
    path: "/sites",
    element: Sites,
    moduleId: "sites.view",
    roles: MANAGEMENT_ROLES,
    layout: "app",
    label: "Canteiros",
    icon: MapPin,
  },
];
