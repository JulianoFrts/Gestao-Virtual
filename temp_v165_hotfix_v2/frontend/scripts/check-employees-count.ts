
import { db } from './src/integrations/database';
import dotenv from 'dotenv';
dotenv.config();

async function checkCount() {
    const { count, error } = await db
        .from('employees')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Erro ao contar funcionários:', error);
    } else {
        console.log('Contagem exata de funcionários na tabela "employees":', count);
    }
}

checkCount();
