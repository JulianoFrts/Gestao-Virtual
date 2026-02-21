import { lazy } from "react";
import { ShieldCheck, History, Database } from "lucide-react";
import { RouteConfig } from "../config";

const UsersPage = lazy(() => import("../../pages/Users"));
const CustomSU = lazy(() => import("../../pages/CustomSU"));
const AuditLogs = lazy(() => import("../../pages/AuditLogs"));
const PermissionsManagement = lazy(() => import("../../pages/PermissionsManagement"));
const DatabaseHub = lazy(() => import("../../pages/DatabaseHub"));

export const adminRoutes: RouteConfig[] = [
  {
    path: "/users",
    element: UsersPage,
    moduleId: "users.manage",
    requireConnection: true,
    layout: "app",
    label: "Usuários",
    icon: ShieldCheck,
  },
  {
    path: "/custom-su",
    element: CustomSU,
    moduleId: "custom_su.manage",
    requireConnection: true,
    layout: "app",
    label: "Custom SU",
    icon: ShieldCheck,
  },
  {
    path: "/audit-logs",
    element: AuditLogs,
    moduleId: "audit_logs.view",
    requireConnection: true,
    layout: "app",
    label: "Logs de Auditoria",
    icon: History,
  },
  {
    path: "/permissions",
    element: PermissionsManagement,
    moduleId: "permissions.manage",
    layout: "app",
    label: "Permissões",
    icon: ShieldCheck,
  },
  {
    path: "/database-hub",
    element: DatabaseHub,
    moduleId: "db_hub.manage",
    requireConnection: true,
    layout: "app",
    label: "Banco de Dados",
    icon: Database,
  },
];
