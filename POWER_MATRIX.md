/**
 * MATRIZ DE PODER - GESTÃO VIRTUAL (ORION SYSTEM)
 * Edição: v97 - Custom SU Edition
 * 
 * Este documento define a hierarquia técnica e as flags de UI/Permissões
 * controladas pelo motor de autorização no backend.
 */

export const POWER_MATRIX = {
  // ===========================================================================
  // 1. NÍVEIS DE PODER (HIERARCHY LEVEL)
  // Define quem pode editar/excluir quem (Soberania de Hierarquia).
  // ===========================================================================
  LEVELS: {
    SUPER_ADMIN_GOD: 1500, // ACESSO MESTRE: Ignora travas de segurança
    SOCIO_DIRETOR: 1000,   // GESTÃO GLOBAL: Poder de edição de dados sensíveis
    ADMIN: 950,            // GESTÃO APP: Gerencia usuários e configurações
    TI_SOFTWARE: 900,      // MANUTENÇÃO: Acesso a logs e diagnósticos
    GESTOR_PROJECT: 800,   // CORPORATIVO: Vê todas as obras da empresa
    GESTOR_CANTEIRO: 500,  // GERÊNCIA SÍTIO: Focado na execução local
    SUPERVISOR: 400,       // CAMPO: Aprova avanços e relatórios diários
    WORKER: 100,           // OPERACIONAL: Ponto e avanço de tarefas
  },

  // ===========================================================================
  // 2. FLAGS DE INTERFACE (UI Overrides)
  // O que cada "Nível" ou "Role" vê na Sidebar/Dashboard.
  // ===========================================================================
  UI_CAPABILITIES: {
    // Flag: showAdminMenu (Aba Usuários, Empresas, Obras)
    showAdminMenu: ["SUPER_ADMIN_GOD", "SOCIO_DIRETOR", "ADMIN", "TI_SOFTWARE", "GESTOR_PROJECT"],

    // Flag: showMaintenance (Aba Custom SU, Database Hub)
    showMaintenance: ["SUPER_ADMIN_GOD", "SOCIO_DIRETOR", "ADMIN", "TI_SOFTWARE"],

    // Flag: showAuditLogs (Logs de sistema e Segurança)
    showAuditLogs: ["SUPER_ADMIN_GOD", "TI_SOFTWARE", "ADMIN"],

    // Flag: canEditSensitiveData (Editar CPF, Salários, Senhas)
    canEditSensitiveData: ["SUPER_ADMIN_GOD", "SOCIO_DIRETOR"],
    
    // Flag: map.canConfigCables (Configuração técnica 3D)
    canConfigCables: ["SUPER_ADMIN_GOD", "TI_SOFTWARE", "ADMIN", "GESTOR_PROJECT"],
  },

  // ===========================================================================
  // 3. REGRAS DE OURO (Hardcoded backend rules)
  // ===========================================================================
  GOLDEN_RULES: {
    SUPER_ADMIN_GOD: "ALLACCESS (Bypass total de permissões/CORS/Bloqueios)",
    OVERRIDES: "Permissões individuais no JSON do usuário sempre ganham do cargo.",
    HIERARCHY: "Ninguém altera ou exclui um usuário de Rank maior ou igual ao seu.",
  }
};
