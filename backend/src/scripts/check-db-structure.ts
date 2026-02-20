import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('--- Informações da Tabela daily_reports ---');
    const columnInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'daily_reports' 
      AND column_name = 'status';
    `;
    console.log('Dados da coluna status:', JSON.stringify(columnInfo, null, 2));

    const enumInfo = await prisma.$queryRaw`
      SELECT n.nspname as enum_schema, t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'DailyReportStatus';
    `;
    console.log('Valores do Enum DailyReportStatus no DB:', JSON.stringify(enumInfo, null, 2));

    const samples = await prisma.$queryRaw`
      SELECT id, status, CAST(status AS TEXT) as status_text 
      FROM daily_reports 
      LIMIT 5;
    `;
    console.log('Amostras de dados reais:', JSON.stringify(samples, null, 2));

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
