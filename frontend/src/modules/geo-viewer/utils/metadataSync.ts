import { orionApi } from '@/integrations/orion/client'

/**
 * Sincroniza o progresso da produção com os metadados do mapa 3D.
 * Isso permite que o Cockpit 3D reflita as mudanças em tempo real.
 */
export async function syncTowerMetadata(
  projectId: string,
  elementId: string,
  activityName: string,
  progressPercent: number,
  status: string
) {
  try {
    // 1. Buscar a torre atual no mapa para não sobrescrever outros metadados
    const { data: tower } = await orionApi
      .from('map_elements' as any)
      .select('metadata, displaySettings')
      .eq('project_id', projectId)
      .eq('object_id', elementId)
      .maybeSingle()

    if (!tower) {
      console.warn(`[3D Sync] Torre ${elementId} não encontrada no projeto ${projectId}`)
      return
    }

    const currentMetadata = (tower.metadata as any) || {}
    const activityStatuses = (currentMetadata.activityStatuses || []) as any[]

    // 2. Atualizar ou adicionar o status da atividade nos metadados
    const normalize = (s: string) => (s || '').trim().toLowerCase()
    const targetName = normalize(activityName)
    
    const existingIndex = activityStatuses.findIndex(s => 
      normalize(s.activity?.name || '') === targetName
    )

    const newStatus = {
      activity: { name: activityName },
      progressPercent,
      status,
      updatedAt: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      activityStatuses[existingIndex] = { ...activityStatuses[existingIndex], ...newStatus }
    } else {
      activityStatuses.push(newStatus)
    }

    // 3. Persistir de volta no map_elements usando UPSERT (POST)
    const { error } = await orionApi
      .from('map_elements' as any)
      .upsert({
        ...tower,
        metadata: {
          ...currentMetadata,
          activityStatuses
        }
      } as any)

    if (error) throw error

    console.log(`[3D Sync] Progresso de "${activityName}" sincronizado para Torre ${elementId}`)
  } catch (err) {
    console.error('[3D Sync] Erro ao sincronizar metadados:', err)
  }
}
