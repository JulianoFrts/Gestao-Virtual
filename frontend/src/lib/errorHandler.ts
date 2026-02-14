/**
 * Maps database/API error messages to user-friendly Portuguese messages
 * Prevents exposing internal database schema details to users
 */
export const mapDatabaseError = (error: any): string => {
  const message = error?.message?.toLowerCase() || '';
  
  // RLS policy violations
  if (message.includes('row-level security') || message.includes('permission denied') || message.includes('rls')) {
    return 'Você não tem permissão para realizar esta ação.';
  }
  
  // Unique constraint violations
  if (message.includes('duplicate key') || message.includes('unique constraint') || message.includes('already exists')) {
    if (message.includes('email')) return 'Este email já está cadastrado.';
    if (message.includes('registration_number')) return 'Este número de registro já existe.';
    if (message.includes('name')) return 'Já existe um registro com este nome.';
    return 'Já existe um registro com estas informações.';
  }
  
  // NOT NULL violations
  if (message.includes('null value') || message.includes('not-null') || message.includes('violates not-null')) {
    return 'Preencha todos os campos obrigatórios.';
  }
  
  // Foreign key violations
  if (message.includes('foreign key') || message.includes('fkey') || message.includes('references')) {
    return 'Não é possível realizar esta operação devido a dependências existentes.';
  }
  
  // Check constraint violations  
  if (message.includes('check constraint') || message.includes('violates check')) {
    return 'Os dados fornecidos não atendem aos requisitos.';
  }
  
  // Type conversion errors
  if (message.includes('invalid input syntax') || message.includes('type')) {
    return 'Formato de dados inválido.';
  }
  
  // Network/connection errors
  if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  
  // Generic database/db errors
  if (message.includes('postgresql') || message.includes('pgrst') || message.includes('db')) {
    return 'Erro ao processar sua solicitação. Tente novamente.';
  }
  
  // Default safe message
  return 'Ocorreu um erro inesperado. Entre em contato com o suporte se persistir.';
};

/**
 * Logs errors to console only in development mode
 */
export const logError = (context: string, error: any): void => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
};

