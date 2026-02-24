import { useMemo } from 'react';
import type { KMLDocument, KMLPlacemark } from '@/types/kmz';

const LOCAL_MODEL_ID = 'local-3d-model';

export function useEnrichedPlacemarks(
    kmlDocuments: KMLDocument[],
    placemarkOverrides: Record<string, {
        name?: string,
        angle?: number,
        color?: string,
        height?: number,
        elevation?: number,
        customModelUrl?: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        customModelTransform?: any
    }>,
     
    _hiddenPlacemarkIds: Set<string> = new Set(),
    selectedProjectId: string = 'all'
) {
    return useMemo(() => {
        // let discardedCount = 0;
        // let hiddenCount = 0; // Removed as filtering based on hiddenPlacemarkIds is removed
        const combined = kmlDocuments.flatMap(doc => {
            const docProjectId = (doc as { projectId?: string; id?: string } & KMLDocument).projectId || doc.id;
            const docId = doc.id || '';

            if (!doc.placemarks) return [];

            return doc.placemarks.filter(p => {
                // 2. Identify hidden towers (Database state)
                // const ext = p.extendedData as Record<string, unknown>;
                // const isDbHidden = ext?.is_hidden === true || ext?.isHidden === true || String(ext?.is_hidden).toLowerCase() === 'true' || Number(ext?.is_hidden) === 1;

                const normalizedName = (p.name || '').trim().toUpperCase();
                // Regex seletivo: Captura formatos de torre (17/1, 10-A, 1A, A1, AP10, TORRE)
                // Relaxado para permitir números simples (1, 2, 3) e combinações alfanuméricas
                // eslint-disable-next-line no-useless-escape
                const isTowerFormat = /^(\d+[\/-]\d+[A-Za-z]*|\d+[A-Za-z]+|[A-Za-z]+[\/-]?\d+|TRIO.*|[A-Za-z]+\d+.*|.*TORRE.*|.*ESTR.*|.*AP\d+.*|.*STR.*|.*V[\/-]\d+.*|\d+)(?:\s*\/.*)?$/i.test(normalizedName);
                const isGenericPoint = /^PONTO[\s-]*\d+.*$/i.test(normalizedName);
                const isManualReference = /^(?:PE|BASE|REF|MARK)[\s-]*.*$/i.test(normalizedName);

                const hasSketchfab = p.extendedData && (p.extendedData['sketchfab_id'] || p.extendedData['SKETCHFAB_ID']);
                const hasObjectId = p.extendedData && (p.extendedData['object_id'] || p.extendedData['OBJECT_ID'] || p.extendedData['externalId'] || p.extendedData['external_id']);

                const isTechnicalPoint = p.type === 'point' && isTowerFormat && !isGenericPoint;
                const isReferencePoint = p.type === 'point' && (isGenericPoint || isManualReference);
                const isTour = /TOUR|FOTO|VISTA|CAMER|MAPA/i.test(normalizedName);

                // Ocultar elementos técnicos se nenhuma obra estiver selecionada
                if (selectedProjectId === 'all' && (isTechnicalPoint || p.type === 'linestring')) {
                    return false;
                }

                const keep = (hasSketchfab || hasObjectId || isTechnicalPoint || isReferencePoint) && !isTour;
                if (!keep && p.type === 'point' && !isTour) {
                    console.log(`🚫 [EnrichedPlacemarks] Descartando ponto "${p.name}" - ID=${p.id}. TowerFormat=${isTowerFormat}, hasObjectId=${hasObjectId}, isTechnical=${isTechnicalPoint}`);
                }
                // if (!keep) discardedCount++;
                return keep;
            }).map(p => {
                const compositeId = `${docId}:::${p.id}`;
                const override = placemarkOverrides[compositeId];

                const normalizedName = (p.name || '').trim().toUpperCase();
                const isGenericPoint = /^PONTO[\s-]*\d+.*$/i.test(normalizedName);
                const isManualReference = /^(?:PE|BASE|REF|MARK)[\s-]*.*$/i.test(normalizedName);
                const isReferencePoint = p.type === 'point' && (isGenericPoint || isManualReference);

                const skId = override?.customModelUrl || p.extendedData?.['sketchfab_id'] || p.extendedData?.['SKETCHFAB_ID'];
                const isLocal = !skId;

                const extData = p.extendedData as Record<string, string | number | undefined>;
                const deflectionValue = parseFloat(String(extData?.['deflection'] || extData?.['DEFLECTION'] || '0'));

                let heading = deflectionValue;
                if (!heading && p.coordinates.heading) {
                    heading = p.coordinates.heading;
                }

                const finalHeading = override?.angle !== undefined
                    ? override.angle % 360
                    : (heading || 0) % 360;

                const finalName = override?.name || p.name;
                const finalColor = override?.color;

                // Suporte para snake_case (KML/DB raw) e camelCase (Prisma/JS)
                const finalHeight = override?.height ||
                    parseFloat(String(extData?.['object_height'] || extData?.['objectHeight'] || 30));

                const finalElevation = override?.elevation ||
                    parseFloat(String(extData?.['object_elevation'] || extData?.['objectElevation'] || p.coordinates.altitude || 0));

                const finalSeq = parseInt(String(extData?.['object_seq'] || extData?.['OBJECT_SEQ'] || extData?.['objectSeq']));
                const circuitId = extData?.['circuit_id'] || extData?.['CIRCUIT_ID'] || extData?.['circuitId'] || extData?.['circuito'] || extData?.['CIRCUITO'];
                const towerType = extData?.['tower_type'] || extData?.['TOWER_TYPE'] || extData?.['tipo'] || extData?.['TIPO'] || extData?.['type'] || extData?.['TYPE'];

                // Technical Aliases from KML-KMZ-IMPORT Skill
                const fixConductor = parseFloat(String(extData?.['fix_conductor'] || extData?.['cabo_cond'] || extData?.['FIX_CONDUCTOR']));
                const fixParaRaio = parseFloat(String(extData?.['fix_pararaio'] || extData?.['cabo_para'] || extData?.['FIX_PARARAIO']));
                const goForward = parseFloat(String(extData?.['go_forward'] || extData?.['vao'] || extData?.['GO_FORWARD']));

                return {
                    ...p,
                    name: finalName,
                    color: finalColor || '',
                    projectId: (p as { projectId?: string } & KMLPlacemark).projectId || docProjectId,
                    document_id: docId,
                    isLocal,
                    isReferencePoint,
                    modelId: skId || LOCAL_MODEL_ID,
                    customModelTransform: override?.customModelTransform,
                    calculatedHeading: finalHeading,
                    elevation: finalElevation,
                    towerHeight: finalHeight,
                    object_seq: isNaN(finalSeq) ? undefined : finalSeq,
                    circuitId: circuitId ? String(circuitId).toUpperCase() : undefined,
                    towerType: towerType ? String(towerType).toUpperCase() : undefined,
                    fix_conductor: isNaN(fixConductor) ? undefined : fixConductor,
                    fix_pararaio: isNaN(fixParaRaio) ? undefined : fixParaRaio,
                    go_forward: isNaN(goForward) ? undefined : goForward,
                    is_hidden: false
                };
            });
        });

        // if (discardedCount > 0 || hiddenCount > 0) {
        //    console.log(`🧹 [useEnrichedPlacemarks] Filtragem: ${discardedCount} descartados (tours, etc), ${hiddenCount} ocultos pelo usuário.`);
        // }

        // Deduplicate by Site Core (e.g., "17/1") to avoid overlapping towers for dual circuits
        const uniqueMap = new Map<string, typeof combined[0] & { circuitIds?: Set<string> }>();
        combined.forEach(p => {
            const rawName = (p.name || '').toUpperCase().trim();
            // Identifica sufixos de circuito e variantes técnicas para remoção
            const circuitSuffixes = /[-_](?:C\d+|CIRCUITO\s*\d+|CIR\d+|VA|RE|VANTE|RE|V|R)$|(?:\s+)(?:C\d+|CIRCUITO\s*\d+|CIR\d+|VA|RE|VANTE|RE|V|R)$/i;

            // Remove o sufixo para extrair o núcleo da torre (siteCore)
            // Isso garante que "1/1A" e "1/1A-C1" → "1/1A", mantendo o identificador alfanumérico
            const siteCore = rawName.replace(circuitSuffixes, '').trim();

            // DEDUPLICATION FIX: Ignore projectId in the key to merge KML and DB representations of the same tower
            // Use location to differentiate if names are identical but towers are physically distinct (rare but possible)
            // Rounding to ~10m precision (3 decimal places) to catch same-tower variations
            const latKey = p.coordinates.lat.toFixed(4);
            const lngKey = p.coordinates.lng.toFixed(4);

            // Primary Key: Name + Location
            const key = `${siteCore}::${latKey}:${lngKey}`;

            const existing = uniqueMap.get(key);

            if (!existing) {
                const newPlacemark = { ...p } as typeof combined[0] & { circuitIds?: Set<string> };
                newPlacemark.circuitIds = new Set();
                if (p.circuitId) newPlacemark.circuitIds.add(p.circuitId);
                uniqueMap.set(key, newPlacemark);
            } else {
                if (p.circuitId) existing.circuitIds?.add(p.circuitId);

                // Merge metadata - prefer the one that has values
                if (!existing.object_seq && p.object_seq) existing.object_seq = p.object_seq;
                if (!existing.towerHeight && p.towerHeight) existing.towerHeight = p.towerHeight;
                if (!existing.elevation && p.elevation) existing.elevation = p.elevation;

                // If one is from the selected project (likely DB) and the other is generic, keep the specific project ID?
                // Actually, if we are merging, we might want to prefer the one with a real UUID projectId over a generic one if applicable.
                if (selectedProjectId !== 'all' && (p as { projectId?: string } & KMLPlacemark).projectId === selectedProjectId) {
                    existing.projectId = selectedProjectId;
                    existing.document_id = (p as { document_id?: string } & KMLPlacemark).document_id || '';
                }
            }
        });


        // Convert circuitIds Set to Array or keep as Set if preferred
        const result = Array.from(uniqueMap.values()).map(p => {
            if (p.circuitIds) {
                (p as { allCircuits?: string[] } & typeof p).allCircuits = Array.from(p.circuitIds);
            }
            return p;
        });

        return result;
    }, [kmlDocuments, placemarkOverrides, selectedProjectId]);
}
