import { lazy } from "react";
import { ShieldCheck, History, Database } from "lucide-react";
import { RouteConfig } from "../config";
import { ADMIN_ROLES } from "@/lib/constants/roles";

const UsersPage = lazy(() => import("../../pages/Users"));
const CustomSU = lazy(() => import("../../pages/CustomSU"));
const AuditLogs = lazy(() => import("../../pages/AuditLogs"));
const PermissionsManagement = lazy(() => import("../../pages/PermissionsManagement"));
const DatabaseHub = lazy(() => import("../../pages/DatabaseHub"));

const baseAdminRoutes: RouteConfig[] = [
  {
    path: "/users",
    element: UsersPage,
    moduleId: "users.manage",
    roles: ADMIN_ROLES,
    requireConnection: true,
    layout: "app",
    label: "Usuários",
    icon: ShieldCheck,
  },
  {
    path: "/custom-su",
    element: CustomSU,
    moduleId: "custom_su.manage",
    roles: ADMIN_ROLES,
    requireConnection: true,
    layout: "app",
    label: "Custom SU",
    icon: ShieldCheck,
  },
  {
    path: "/audit-logs",
    element: AuditLogs,
    moduleId: "audit_logs.view",
    roles: ADMIN_ROLES,
    requireConnection: true,
    layout: "app",
    label: "Logs de Auditoria",
    icon: History,
  },
  {
    path: "/permissions",
    element: PermissionsManagement,
    moduleId: "permissions.manage",
    roles: ADMIN_ROLES,
    layout: "app",
    label: "Permissões",
    icon: ShieldCheck,
  },
];

export const adminRoutes: RouteConfig[] = [
  ...baseAdminRoutes,
  ...(import.meta.env.DEV ? [{
    path: "/database-hub",
    element: DatabaseHub,
    moduleId: "db_hub.manage",
    roles: ADMIN_ROLES,
    requireConnection: true,
    layout: "app" as const,
    label: "Banco de Dados",
    icon: Database,
  }] : []) as RouteConfig[]
];
