import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projectId = 'cmm41mlom000ctrpghi6qt1h0'
  console.log(`[CLEANUP] Verificando duplicados para: ${projectId}`)

  try {
    const all = await prisma.project3dCableSettings.findMany({
      where: { projectId }
    })

    console.log(`[CLEANUP] Encontrados ${all.length} registros.`)

    if (all.length > 1) {
      console.log('[CLEANUP] Removendo duplicados...')
      const toDelete = all.slice(1).map(r => r.id)
      await prisma.project3dCableSettings.deleteMany({
        where: { id: { in: toDelete } }
      })
      console.log('✅ Duplicados removidos!')
    } else {
      console.log('✅ Nenhum duplicado encontrado.')
    }

  } catch (err) {
    console.error('❌ ERRO:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
