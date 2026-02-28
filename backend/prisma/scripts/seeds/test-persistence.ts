import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const projectId = 'cmm41mlom000ctrpghi6qt1h0' // O ID que você me passou
  console.log(`[TEST] Iniciando teste de persistência para Projeto: ${projectId}`)

  try {
    const settings = {
      testDate: new Date().toISOString(),
      message: 'Persistent Test from Script',
      scale: 99
    }

    console.log('[TEST] Tentando UPSERT...')
    const result = await prisma.project3dCableSettings.upsert({
      where: { projectId },
      update: { settings: settings as any },
      create: {
        id: randomUUID(),
        projectId,
        settings: settings as any
      }
    })

    console.log('[TEST] Resultado do Banco:', result)
    
    // Agora tentamos ler para confirmar
    const verify = await prisma.project3dCableSettings.findUnique({
      where: { projectId }
    })

    console.log('[TEST] Verificação após leitura:', verify)

    if (JSON.stringify(verify?.settings) === JSON.stringify(settings)) {
      console.log('✅ SUCESSO: O Prisma está persistindo corretamente no banco!')
    } else {
      console.error('❌ FALHA: Os dados lidos são diferentes dos salvos.')
    }

  } catch (err) {
    console.error('❌ ERRO FATAL:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
