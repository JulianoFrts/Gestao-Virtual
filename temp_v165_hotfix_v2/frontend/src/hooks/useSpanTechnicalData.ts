import { useState, useEffect } from 'react';
import { orionApi } from '@/integrations/orion/client';

export interface SpanTechnicalData {
    id: string;
    project_id: string;
    tower_start_id: string;
    tower_end_id: string;
    span_name: string;
    span_length: number;
    height_start: number;
    height_end: number;
    elevation_start: number;
    elevation_end: number;
    sag: number;
    tension: number;
    weight_per_meter: number;
    catenary_constant: number;
    arc_length: number;
    cable_color: string;
    cable_phases: number;
    cable_spacing?: number;
    voltage_kv?: number;
    cable_type?: string;
    geometry?: any; // PostGIS Geometry (GeoJSON)
    sourceTable?: 'segments' | 'span_technical_data' | 'synthesized';
}

export function useSpanTechnicalData(projectId?: string, companyId?: string) {
    const [spans, setSpans] = useState<SpanTechnicalData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchSpans = async () => {
        if (!projectId && !companyId) {
            setSpans([]);
            return;
        }

        setLoading(true);
        try {
            let combinedResult: SpanTechnicalData[] = [];

            // 1. Tentar buscar da nova tabela de SEGMENTS
            let segmentQuery = orionApi.from('segments')
                .select('*, conductors(*)')
                .order('created_at', { ascending: false });

            if (projectId && projectId !== 'all') {
                segmentQuery = segmentQuery.eq('project_id', projectId);
            }

            const { data: segments, error: segError } = await segmentQuery;

            if (!segError && segments && segments.length > 0) {
                const mappedFromSegments = segments.map((seg: any) => {
                    const conductors = seg.conductors || [];
                    const phases = conductors.length;
                    const primaryColor = conductors[0]?.color || '#0ea5e9';
                    const voltage = conductors[0]?.voltageKv || 0;

                    return {
                        id: seg.id,
                        project_id: seg.projectId || seg.project_id,
                        tower_start_id: seg.fromTowerId || seg.from_tower_id || seg.towerStartId || seg.tower_start_id,
                        tower_end_id: seg.toTowerId || seg.to_tower_id || seg.towerEndId || seg.tower_end_id,
                        span_name: `${seg.fromTowerId} - ${seg.toTowerId}`,
                        span_length: Number(seg.length) || 0,
                        height_start: 30, // Fallback height
                        height_end: 30,
                        elevation_start: 0,
                        elevation_end: 0,
                        sag: Number(conductors[0]?.sag) || 0,
                        tension: Number(conductors[0]?.tension) || 0,
                        weight_per_meter: 0,
                        catenary_constant: 0,
                        arc_length: 0,
                        cable_color: primaryColor,
                        cable_phases: phases > 0 ? phases : 3,
                        cable_spacing: 0.5,
                        voltage_kv: Number(voltage),
                        cable_type: conductors[0]?.cableType || 'Segment',
                        geometry: null,
                        sourceTable: 'segments' as const,
                        _conductors: conductors
                    };
                });
                combinedResult = [...mappedFromSegments];
            }

            // 2. Fallback/Add: Buscar da tabela antiga SPAN_TECHNICAL_DATA
            let query = orionApi.from('span_technical_data').select('*');
            if (projectId && projectId !== 'all') {
                query = query.eq('project_id', projectId);
            } else if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data, error: apiError } = await query;
            if (!apiError && data && data.length > 0) {
                const mapped = data.map((s: any) => ({
                    id: s.id,
                    project_id: s.project_id || s.projectId,
                    tower_start_id: s.tower_start_id || s.towerStartId,
                    tower_end_id: s.tower_end_id || s.towerEndId,
                    span_name: s.span_name || s.spanName,
                    span_length: s.span_length || s.spanLength,
                    height_start: s.height_start || s.heightStart,
                    height_end: s.height_end || s.heightEnd,
                    elevation_start: s.elevation_start || s.elevationStart,
                    elevation_end: s.elevation_end || s.elevationEnd,
                    sag: s.sag,
                    tension: s.tension,
                    weight_per_meter: s.weight_per_meter || s.weightPerMeter,
                    catenary_constant: s.catenary_constant || s.catenaryConstant,
                    arc_length: s.arc_length || s.arcLength,
                    cable_color: s.cable_color || s.cableColor,
                    cable_phases: s.cable_phases || s.cablePhases,
                    cable_spacing: s.cable_spacing || s.cableSpacing,
                    voltage_kv: s.voltage_kv || s.voltageKv,
                    cable_type: s.cable_type || s.cableType,
                    geometry: s.geometry || s.geometryData,
                    sourceTable: 'span_technical_data' as const
                }));

                // Add to result if not already matched
                mapped.forEach(s => {
                    const exists = combinedResult.some(cr =>
                        (cr.tower_start_id === s.tower_start_id && cr.tower_end_id === s.tower_end_id)
                    );
                    if (!exists) combinedResult.push(s);
                });
            }

            // 3. Synthesis: Always attempt to synthesize if we have towers, to fill gaps.
            let towerQuery = orionApi.from('tower_technical_data')
                .select('*')
                .order('object_seq', { ascending: true });

            if (projectId && projectId !== 'all') {
                towerQuery = towerQuery.eq('project_id', projectId);
            }

            const { data: towers, error: towerError } = await towerQuery;

            if (towers && towers.length > 0) {
                const projectGroups = new Map<string, any[]>();
                towers.forEach(t => {
                    const pid = t.project_id || t.projectId || 'default';
                    if (!projectGroups.has(pid)) projectGroups.set(pid, []);
                    projectGroups.get(pid)?.push(t);
                });

                projectGroups.forEach((groupTowers, pid) => {
                    const sortedTowers = groupTowers.sort((a, b) => (a.object_seq || 0) - (b.object_seq || 0));

                    for (let i = 0; i < sortedTowers.length - 1; i++) {
                        const current = sortedTowers[i];
                        const next = sortedTowers[i + 1];

                        const dist = Number(current.distance || current.go_forward || 0);
                        const weight = Math.max(Number(current.weight || 1200), 1000);
                        const currentName = current.object_id || current.objectId || current.name;
                        const nextName = next.object_id || next.objectId || next.name;

                        if (next && currentName && nextName) {
                            // Only add synthetic if no manual span connects these two towers
                            const exists = combinedResult.some(s =>
                                (s.tower_start_id === currentName && s.tower_end_id === nextName) ||
                                (s.tower_start_id === current.id && s.tower_end_id === next.id)
                            );

                            if (!exists) {
                                combinedResult.push({
                                    id: `synth-${pid}-${current.id}-${next.id}`,
                                    project_id: pid,
                                    tower_start_id: currentName,
                                    tower_end_id: nextName,
                                    span_name: `${currentName} - ${nextName}`,
                                    span_length: dist || 0,
                                    height_start: Number(current.object_height || current.objectHeight || 30),
                                    height_end: Number(next.object_height || next.objectHeight || 30),
                                    elevation_start: Number(current.object_elevation || current.objectElevation || 0),
                                    elevation_end: Number(next.object_elevation || next.objectElevation || 0),
                                    sag: 0,
                                    tension: weight,
                                    weight_per_meter: 1.5,
                                    catenary_constant: 1000,
                                    arc_length: 0,
                                    cable_color: '#0ea5e9',
                                    cable_phases: 3,
                                    cable_spacing: 0.5,
                                    voltage_kv: 138,
                                    cable_type: 'Synthesized',
                                    geometry: null,
                                    sourceTable: 'synthesized'
                                });
                            }
                        }
                    }
                });
            }

            console.log(`✅ [useSpanTechnicalData] Final spans: ${combinedResult.length}`);
            setSpans(combinedResult);
        } catch (err: any) {
            console.error('Error fetching span technical data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpans();
    }, [projectId, companyId]);

    return { spans, loading, error, refetchSpans: fetchSpans };
}
