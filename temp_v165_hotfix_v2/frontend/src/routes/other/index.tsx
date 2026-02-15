import type { ReactNode } from 'react';
import { Dashboard } from '../views/dashboard/Dashboard';
import { ObraListPage } from '../modules/obra/pages/ObraListPage'; 
import { EmpresaListPage } from '../modules/empresa/pages/EmpresaListPage';
import { CanteiroListPage } from '../modules/canteiro/pages/CanteiroListPage';
import { FuncionarioListPage } from '../modules/funcionario/pages/FuncionarioListPage';
import { ProductionListPage } from '../modules/production/pages/ProductionListPage';
import { FinanceDashboard } from '../modules/finance/pages/FinanceDashboard';
import { PlanningDashboard } from '../modules/planning/pages/PlanningDashboard';
import AuditDashboard from '../modules/auditoria/pages/AuditDashboard';
import RolesPage from '../modules/funcionario/pages/RolesPage';
import { SettingsPage } from './SettingsPage'; 
import { AdvancedUsersPage } from '../modules/admin/pages/AdvancedUsersPage';
import { AppManagementPage } from '../modules/admin/pages/AppManagementPage';
import { AdvancedAuditPage } from '../modules/auditoria/pages/AdvancedAuditPage';
import { ProjectManagementPage } from '../modules/production/pages/ProjectManagementPage';
import { BuilderView } from '../views/builder/BuilderView';


// Definição de Tipos de Rota
export interface RouteConfig {
  path: string;
  component: ReactNode;
  roles?: string[]; // Para controle de acesso futuro
}

// Por enquanto, o App.tsx gerencia o estado `activeView`, então não estamos usando React Router DOM completo ainda.
// Mas vamos preparar a estrutura para quando migrarmos.

export const routes = {
    // Mapeamento View -> Componente
    dashboard: <Dashboard />,
    global: <div className="p-8 text-white">Módulo Global (Em breve)</div>,
    
    // Empresa Module
    dashboard_empresa: <EmpresaListPage />,
    empresa: <EmpresaListPage />,
    
    // Obra Module
    obras: <ObraListPage />, 
    towers: <ProjectManagementPage />, 
    
    // Canteiro Module
    canteiros: <CanteiroListPage />,

    // Funcionarios Module
    employees: <FuncionarioListPage />,
    
    // Finance Module
    finance: <FinanceDashboard />,

    // Planning Module
    planning: <PlanningDashboard />,

    production: <ProductionListPage />,

    // Auditoria
    auditoria: <AuditDashboard />,

    // Configurações
    roles: <RolesPage />,
    settings: <SettingsPage />,

    // Administrativo Avançado
    advanced_users: <AdvancedUsersPage />,
    app_management: <AppManagementPage />,
    advanced_audit: <AdvancedAuditPage />,
    project_management: <ProjectManagementPage />,
    
    // Placeholders para Módulos Pendentes
    rdo: <div className="p-8 text-slate-400 font-bold italic">Diário de Obra (RDO) em desenvolvimento...</div>,
    reports_executive: <div className="p-8 text-slate-400 font-bold italic">Relatórios Executivos em desenvolvimento...</div>,
    contracts: <div className="p-8 text-slate-400 font-bold italic">Contratos & Clientes em desenvolvimento...</div>,
    inventory: <div className="p-8 text-slate-400 font-bold italic">Almoxarifado em desenvolvimento...</div>,
    builder: <BuilderView />,
};
