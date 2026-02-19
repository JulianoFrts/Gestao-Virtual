import type { ReactNode } from 'react';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import Companies from '@/pages/Companies';
import Sites from '@/pages/Sites';
import Employees from '@/pages/Employees';
import AuditLogs from '@/pages/AuditLogs';
import Functions from '@/pages/Functions';
import Reports from '@/pages/Reports';
import Users from '@/pages/Users';
import CustomSU from '@/pages/CustomSU';
import DatabaseHub from '@/pages/DatabaseHub';
import ProductionPage from '@/modules/production/pages/ProductionPage';
import ProductionAnalyticsPage from '@/modules/production/pages/ProductionAnalyticsPage';
import { SettingsPage } from './SettingsPage';


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
    dashboard_empresa: <Companies />,
    empresa: <Companies />,
    
    // Obra Module
    obras: <Projects />, 
    towers: <ProductionPage />, 
    
    // Canteiro Module
    canteiros: <Sites />,

    // Funcionarios Module
    employees: <Employees />,
    
    // Finance Module
    finance: <div className="p-8 text-slate-400 font-bold italic">Financeiro em desenvolvimento...</div>,

    // Planning Module
    planning: <div className="p-8 text-slate-400 font-bold italic">Planejamento em desenvolvimento...</div>,

    production: <ProductionPage />,
    production_analytics: <ProductionAnalyticsPage />,

    // Auditoria
    auditoria: <AuditLogs />,

    // Configurações
    roles: <Functions />,
    settings: <SettingsPage />,

    // Administrativo Avançado
    advanced_users: <Users />,
    app_management: <CustomSU />,
    advanced_audit: <AuditLogs />,
    project_management: <ProductionPage />,
    database_hub: <DatabaseHub />,
    reports_standard: <Reports />,
    
    // Placeholders para Módulos Pendentes
    rdo: <div className="p-8 text-slate-400 font-bold italic">Diário de Obra (RDO) em desenvolvimento...</div>,
    reports_executive: <div className="p-8 text-slate-400 font-bold italic">Relatórios Executivos em desenvolvimento...</div>,
    contracts: <div className="p-8 text-slate-400 font-bold italic">Contratos & Clientes em desenvolvimento...</div>,
    inventory: <div className="p-8 text-slate-400 font-bold italic">Almoxarifado em desenvolvimento...</div>,
    builder: <div className="p-8 text-slate-400 font-bold italic">Builder View em desenvolvimento...</div>,
};
