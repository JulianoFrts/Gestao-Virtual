export interface RawImportItem {
  id?: string;
  name: string;
  description?: string;
  canLeadTeam: boolean;
  laborType: string;
  hierarchyLevel: number;
  status: 'valid' | 'invalid' | 'warning';
  errors?: string[];
}

export class JobFunctionImportService {
  private static MAX_NAME_LENGTH = 255;
  private static MIN_NAME_LENGTH = 2;

  static sanitizeCSVValue(value: string): string {
    if (!value) return '';
    return value.replace(/^[=+\-@\t\r]/g, '').trim().replace(/^["']|["']$/g, '');
  }

  static async parseCSV(content: string, companyId: string | null): Promise<RawImportItem[]> {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('nome') || firstLine.includes('funcao') || firstLine.includes('sequencia');
    const startLine = hasHeader ? 1 : 0;
    
    const results: RawImportItem[] = [];

    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const separator = line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map(s => this.sanitizeCSVValue(s));
        
        let name = '';
        let description = '';
        let leadRaw = '';
        let levelRaw = '';
        let laborRaw = '';

        // Detecção de formato baseada na quantidade de colunas e presença de header
        if (hasHeader && firstLine.includes('sequencia')) {
            // Formato Template: SEQUENCIA;Funcao;Descricao;Pode Liderar?;Nivel;Mao de Obra
            name = parts[1] || '';
            description = parts[2] || '';
            leadRaw = parts[3] || '';
            levelRaw = parts[4] || '';
            laborRaw = parts[5] || '';
        } else if (parts.length >= 4) {
            // Formato Simplificado: Nome;Descricao;Liderança;Nivel;Mao de Obra
            name = parts[0] || '';
            description = parts[1] || '';
            leadRaw = parts[2] || '';
            levelRaw = parts[3] || '';
            laborRaw = parts[4] || '';
        } else {
            // Formato Mínimo
            name = parts[0] || '';
            description = parts[1] || '';
        }

        const errors: string[] = [];
        
        // Validação de Nome
        if (!name || name.length < this.MIN_NAME_LENGTH) {
            errors.push(`Nome muito curto (mínimo ${this.MIN_NAME_LENGTH} caracteres)`);
        } else if (name.length > this.MAX_NAME_LENGTH) {
            errors.push(`Nome muito longo (máximo ${this.MAX_NAME_LENGTH} caracteres)`);
        }

        // Validação de Liderança
        const normalizedLead = leadRaw.toLowerCase();
        const canLeadTeam = ['sim', 'true', '1', 's', 'yes'].includes(normalizedLead);
        
        // Validação de Mão de Obra (MOI/MOD)
        let laborType = laborRaw.toUpperCase().trim();
        if (!laborType) {
            laborType = 'MOD'; // Padrão
        } else if (!['MOI', 'MOD'].includes(laborType)) {
            // Tenta inferir se for algo parecido
            if (laborType.includes('INDIRETA') || laborType === 'I') laborType = 'MOI';
            else laborType = 'MOD';
        }

        // Validação de Nível
        const hierarchyLevel = parseInt(levelRaw) || 0;
        if (isNaN(hierarchyLevel) || hierarchyLevel < 0) {
            errors.push('Nível hierárquico deve ser um número positivo');
        }

        results.push({
            name,
            description,
            canLeadTeam,
            hierarchyLevel,
            laborType,
            status: errors.length > 0 ? 'invalid' : 'valid',
            errors: errors.length > 0 ? errors : undefined
        });
    }

    return results;
  }
}
