import { lazy } from "react";
import {
  Users,
  Clock,
  ClipboardList,
  CalendarClock,
  FileCheck,
  History,
  HardHat,
  BarChart3,
  Coins,
  Database
} from "lucide-react";
import { RouteConfig } from "../config";

const Employees = lazy(() => import("../../pages/Employees"));
const Teams = lazy(() => import("../../pages/Teams"));
const TimeClock = lazy(() => import("../../pages/TimeClock"));
const DailyReport = lazy(() => import("../../pages/DailyReport"));
const RDOScheduling = lazy(() => import("../../pages/RDOScheduling"));
const RDOAudit = lazy(() => import("../../pages/RDOAudit"));
const RDOHistory = lazy(() => import("../../pages/RDOHistory"));
const Reports = lazy(() => import("../../pages/Reports"));
const TimeRecords = lazy(() => import("../../pages/TimeRecords"));
const TeamComposition = lazy(
  () =>
    import("../../pages/TeamComposition") as unknown as Promise<{
      default: React.ComponentType<unknown>;
    }>,
);
const TeamCompositionTable = lazy(() => import("../../pages/TeamCompositionTable"));
const GAPO = lazy(() => import("../../pages/GAPO"));
const ProductionPage = lazy(() => import("../../modules/production/pages/ProductionPage"));
const ProductionAnalyticsPage = lazy(() => import("../../modules/production/pages/ProductionAnalyticsPage"));
const CostsPage = lazy(() => import("../../modules/costs/pages/CostsPage"));
const DataIngestionPage = lazy(() => import("../../modules/ingestion/pages/DataIngestionPage"));

export const operationsRoutes: RouteConfig[] = [
  {
    path: "/employees",
    element: Employees,
    moduleId: "employees.manage",
    layout: "app",
    label: "Funcionários",
    icon: Users,
  },
  {
    path: "/teams",
    element: Teams,
    moduleId: "team_composition",
    layout: "app",
    label: "Equipes",
    icon: Users,
  },
  {
    path: "/time-clock",
    element: TimeClock,
    moduleId: "clock",
    layout: "app",
    label: "Registro de Ponto",
    icon: Clock,
  },
  {
    path: "/daily-report",
    element: DailyReport,
    moduleId: "daily_report.create",
    layout: "app",
    label: "RDO",
    icon: ClipboardList,
  },
  {
    path: "/rdo/scheduling",
    element: RDOScheduling,
    moduleId: "daily_report.schedule",
    layout: "app",
    label: "Programação RDO",
    icon: CalendarClock,
  },
  {
    path: "/rdo/audit",
    element: RDOAudit,
    moduleId: "daily_report.audit",
    layout: "app",
    label: "Auditoria RDO",
    icon: FileCheck,
  },
  {
    path: "/rdo/history",
    element: RDOHistory,
    moduleId: "daily_report.list",
    layout: "app",
    label: "Meus RDOs",
    icon: History,
  },
  {
    path: "/reports",
    element: Reports,
    moduleId: "daily_report.list",
    layout: "app",
    label: "Relatórios",
    icon: ClipboardList,
  },
  {
    path: "/time-records",
    element: TimeRecords,
    moduleId: "time_records.view",
    layout: "app",
    label: "Registros de Ponto",
    icon: History,
  },
  {
    path: "/team-composition",
    element: TeamComposition,
    moduleId: "team_composition",
    layout: "app",
    label: "Composição de Equipe",
    icon: Users,
  },
  {
    path: "/team-composition-table",
    element: TeamCompositionTable,
    moduleId: "team_composition",
    layout: "app",
  },
  {
    path: "/gapo",
    element: GAPO,
    moduleId: "gapo.view",
    layout: "app",
    label: "GAPO",
    icon: HardHat,
  },
  {
    path: "/producao",
    element: ProductionPage,
    moduleId: "production.planning",
    layout: "app",
    label: "Produção",
    icon: HardHat,
  },
  {
    path: "/producao/analytics",
    element: ProductionAnalyticsPage,
    moduleId: "production.analytics",
    layout: "app",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    path: "/custos",
    element: CostsPage,
    moduleId: "costs.view",
    layout: "app",
    label: "Custos",
    icon: Coins,
  },
  {
    path: "/ingestion",
    element: DataIngestionPage,
    moduleId: "data_ingestion",
    layout: "app",
    label: "Ingestão de Dados",
    icon: Database,
  },
];
