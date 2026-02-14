/**
 * Labor classification utility.
 * Categorizes job functions into Direct Labor (MOD) and Indirect Labor (MOI).
 * Replicated from frontend to ensure consistency.
 */

export const DIRECT_LABOR_FUNCTIONS = [
  "PEDREIRO",
  "SERVENTE",
  "CARPINTEIRO",
  "ARMADOR",
  "ELETRICISTA",
  "ENCANADOR",
  "PINTOR",
  "AZULEJISTA",
  "MESTRE DE OBRAS",
  "ENCARREGADO DE OBRAS",
  "AUXILIAR DE SERVIÇOS GERAIS",
  "OPERADOR DE MÁQUINAS",
  "MOTORISTA",
  "AJUDANTE",
];

export const INDIRECT_LABOR_FUNCTIONS = [
  "ENGENHEIRO CIVIL",
  "ENGENHEIRO",
  "ARQUITETO",
  "TÉCNICO EM SEGURANÇA DO TRABALHO",
  "TECNICO SEGURANÇA",
  "ALMOXARIFE",
  "APONTADOR",
  "ADMINISTRATIVO",
  "RH",
  "GESTOR",
  "SUPERVISOR",
  "COORDENADOR",
  "DIRETOR",
  "ESTAGIÁRIO",
  "DESIGNER",
  "COMMUNITY MANAGER",
];

/**
 * Returns true if the function name matches a Direct Labor (MOD) category.
 */
export const isDirectLabor = (functionName?: string): boolean => {
  if (!functionName) return true; // Default to MOD
  const name = functionName.toUpperCase();

  // Check if it's explicitly MOD
  if (DIRECT_LABOR_FUNCTIONS.some((f) => name.includes(f))) return true;

  // Check if it's explicitly MOI
  if (INDIRECT_LABOR_FUNCTIONS.some((f) => name.includes(f))) return false;

  // Fallback: if it's not clearly MOI, we assume MOD for workers
  return true;
};

/**
 * Returns the classification string for the employee.
 */
export const getLaborClassification = (
  functionName?: string,
): "MOD" | "MOI" => {
  return isDirectLabor(functionName) ? "MOD" : "MOI";
};
