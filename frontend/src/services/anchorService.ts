import { Anchor } from '../types/anchor'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export const STANDARD_COMPANY_ID = '00000000-0000-0000-0000-000000000000'
export const STANDARD_PROJECT_ID = '00000000-0000-0000-0000-000000000000'
export const STANDARD_TOWER_ID = 'default-tower'

export function serializeAnchors(anchors: Anchor[]) {
    return anchors.map(a => ({
        ...a,
        position: Array.isArray(a.position) ? a.position : [a.position.x, a.position.y, a.position.z],
        normal: a.normal ? (Array.isArray(a.normal) ? a.normal : [a.normal.x, a.normal.y, a.normal.z]) : null
    }))
}

export async function loadTemplateAnchors(towerId?: string): Promise<Anchor[]> {
    // We ignore the specific towerId for now and load the global default for this model
    const result = await getAnchors({
        companyId: STANDARD_COMPANY_ID,
        projectId: STANDARD_PROJECT_ID,
        towerId: STANDARD_TOWER_ID
    })
    return result.anchors;
}

export async function saveAsTemplate(towerId: string, anchors: Anchor[]) {
    // Save to the global default ID
    return saveAnchors({
        companyId: STANDARD_COMPANY_ID,
        projectId: STANDARD_PROJECT_ID,
        towerId: STANDARD_TOWER_ID
    }, anchors)
}


export async function saveAnchors(
    context: { companyId: string, projectId: string, towerId: string },
    anchors: Anchor[],
    metadata?: { technicalKm?: number, technicalIndex?: number, circuitId?: string }
) {
    const serialized = serializeAnchors(anchors)

    const response = await fetch(`${API_URL}/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...context,
            anchors: serialized,
            ...metadata
        })
    })

    if (!response.ok) throw new Error('Failed to save anchors')
    return response.json()
}

export async function getAnchors(
    context: { companyId: string, projectId: string, towerId: string }
): Promise<{ anchors: Anchor[], technicalKm: number, technicalIndex: number, circuitId: string }> {
    const query = new URLSearchParams(context).toString()
    const response = await fetch(`${API_URL}/anchors?${query}`)
    if (!response.ok) throw new Error('Failed to fetch anchors')

    const data = await response.json()

    // Result can be the raw anchors array (legacy) or an object with metadata
    const rawAnchors = Array.isArray(data) ? data : (data.anchors || [])

    const anchors: Anchor[] = rawAnchors.map((a: any) => ({
        id: a.id,
        name: a.name || a.meshName,
        type: a.type || 'cable_attach',
        meshName: a.meshName,
        position: a.position,
        normal: a.normal,
        faceIndex: a.faceIndex,
        createdAt: a.createdAt || new Date().toISOString()
    }))

    return {
        anchors,
        technicalKm: data.technicalKm || 0,
        technicalIndex: data.technicalIndex || 0,
        circuitId: data.circuitId || 'C1'
    }
}
