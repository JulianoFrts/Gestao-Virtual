import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { useProjects } from '@/hooks/useProjects'
import { db } from '@/integrations/database';
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { utmToLatLng, parseUTMZone } from '@/lib/geo-utils'

interface CSVUploaderProps {
    projectId?: string
    onUploadSuccess?: () => void
}

interface TowerRow {
    object_seq: number
    object_id: string
    tower_type: string
    object_height: number
    go_forward: number
    deflection: string
    object_elevation: number
    fuso_object: string
    x_coordinate: number
    y_coordinate: number
    fix_conductor: number
    fix_pararaio?: number
    tipificacao_estrutura?: string
    is_hidden?: boolean
    distance?: number
    weight?: number
    metadata?: any
}

export function CSVUploader({ projectId: externalProjectId, onUploadSuccess }: CSVUploaderProps) {
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(externalProjectId || null)
    const [defaultFuso, setDefaultFuso] = useState<string>('23S')
    const inputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()
    const { profile } = useAuth()
    const { projects } = useProjects()

    const getNumericId = (name: string) => {
        const upper = (name || '').trim().toUpperCase();
        // Support suffixes like 1/1A, 1/1B
        // Logic: (Structure * 1000 + Tower) * 10 + SuffixWeight
        const parts = upper.match(/(\d+)\/(\d+)([A-Z])?/);
        if (parts) {
            let val = (parseInt(parts[1]) * 1000 + parseInt(parts[2])) * 10;
            if (parts[3]) {
                // Adds weight for suffixes: A=1, B=2, etc.
                val += (parts[3].charCodeAt(0) - 64);
            }
            return val;
        }
        const simple = upper.match(/\d+/);
        return simple ? parseInt(simple[0]) * 10 : 0;
    };

    function parseCSV(text: string): TowerRow[] {
        // Remove Byte Order Mark (BOM) if present
        const cleanText = text.replace(/^\uFEFF/, '')
        const lines = cleanText.trim().split(/\r?\n/)
        if (lines.length < 2) {
            console.error('CSV: Fewer than 2 lines found')
            return []
        }

        // Detect delimiter (comma, semicolon, or tab)
        const firstLine = lines[0]
        const delimiter = firstLine.includes(';') ? ';' : (firstLine.includes('\t') ? '\t' : ',')
        console.log('CSV: Detected delimiter:', delimiter === '\t' ? 'TAB' : delimiter)

        // Helper to split line by delimiter while respecting quotes
        const splitLine = (line: string) => {
            const result = []
            let start = 0
            let inQuotes = false
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '"') inQuotes = !inQuotes
                else if (line[i] === delimiter && !inQuotes) {
                    result.push(line.substring(start, i).replace(/^"|"$/g, '').trim())
                    start = i + 1
                }
            }
            result.push(line.substring(start).replace(/^"|"$/g, '').trim())
            return result
        }

        const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''))
        console.log('CSV: Normalized Headers:', headers)

        const rows: TowerRow[] = []

        const parseNumber = (val: string): number => {
            if (!val || val.trim() === '' || val === '0') return 0

            // Check if it's a DMS string (e.g. 9°33'27"E)
            if (val.includes('°') || val.includes("'")) {
                return dmsToDecimal(val)
            }

            const normalized = val.replace(',', '.')
            const num = parseFloat(normalized)
            return isNaN(num) ? 0 : num
        }

        for (let i = 1; i < lines.length; i++) {
            const values = splitLine(lines[i])
            if (values.length < headers.length) continue

            const row: Record<string, string> = {}
            headers.forEach((header, idx) => {
                row[header] = values[idx] || ''
            })

            const objId = row['object_id'] || row['objectid'] || row['id'] || '';
            const seqFromRow = parseNumber(row['object_seq'] || row['objectseq'] || row['seq'] || row['ordem'] || row['num'] || row['n'] || '0');

            rows.push({
                object_seq: seqFromRow || getNumericId(objId),
                object_id: objId,
                tower_type: row['tower_type'] || row['towertype'] || row['type'] || row['tipo'] || row['structure'] || '',
                object_height: parseNumber(row['object_height'] || row['objectheight'] || row['altura'] || '0'),
                go_forward: parseNumber(row['go_forward'] || row['goforward'] || row['vao_vante'] || '0'),
                deflection: row['deflection'] || row['deflexao'] || row['angulo'] || '',
                object_elevation: parseNumber(row['object_elevation'] || row['objectelevation'] || row['cota'] || row['elevacao'] || row['altitude'] || '0'),
                fuso_object: row['fuso_object'] || row['fusoobject'] || row['fuso'] || row['zone'] || row['utmzone'] || row['utm_zone'] || '',
                x_coordinate: parseNumber(row['x_coordinate'] || row['x_cord_object'] || row['coord_x'] || row['x'] || '0'),
                y_coordinate: parseNumber(row['y_coordinate'] || row['y_cord_object'] || row['coord_y'] || row['y'] || '0'),
                fix_conductor: parseNumber(row['fix_conductor'] || row['fixconductor'] || row['cabo_condutor'] || '0')
            })
        }

        console.log(`CSV: Parsed ${rows.length} rows successfully`)
        return rows
    }

    // Helper to convert DMS (9°33'27"E) to decimal
    const dmsToDecimal = (dms: string): number => {
        if (!dms || dms === '0') return 0
        try {
            const parts = dms.match(/(\d+)[°|\s](\d+)['|\s](\d+)"?([NSEW])?/i)
            if (!parts) {
                // Try simple decimal parse
                const normalized = dms.replace(',', '.')
                const num = parseFloat(normalized)
                return isNaN(num) ? 0 : num
            }

            const degrees = parseInt(parts[1])
            const minutes = parseInt(parts[2])
            const seconds = parseInt(parts[3])
            const direction = parts[4]?.toUpperCase()

            let dd = degrees + (minutes / 60) + (seconds / 3600)
            if (direction === 'S' || direction === 'W') dd = dd * -1
            return dd
        } catch (e) {
            return 0
        }
    }

    // Helper to convert boolean-like values
    const parseBoolean = (val: any): boolean => {
        if (!val) return false;
        const s = String(val).toLowerCase().trim();
        return s === 'true' || s === 'verdadeiro' || s === 'sim' || s === 'yes' || s === '1' || s === 'hidden';
    };

    // Parse Excel file to TowerRow array
    function parseExcel(buffer: ArrayBuffer): TowerRow[] {
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON with raw header values
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

        if (jsonData.length === 0) {
            console.error('Excel: No data rows found')
            return []
        }

        console.log('Excel: First row sample:', jsonData[0])
        console.log('Excel: Total rows:', jsonData.length)

        const parseNumber = (val: any): number => {
            if (val === undefined || val === null || val === '') return 0
            if (typeof val === 'number') return val
            const str = String(val)
            if (str.includes('°') || str.includes("'")) {
                return dmsToDecimal(str)
            }
            const normalized = str.replace(',', '.')
            const num = parseFloat(normalized)
            return isNaN(num) ? 0 : num
        }

        const rows: TowerRow[] = jsonData.map((row: any) => {
            // Normalize keys to lowercase
            const normalizedRow: Record<string, any> = {}
            Object.keys(row).forEach(key => {
                normalizedRow[key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')] = row[key]
            })

            // Combine UTM Zone + Band if separated (e.g. 23 + K -> 23K)
            let parsedFuso = String(normalizedRow['fuso_object'] || normalizedRow['fusoobject'] || normalizedRow['fuso'] || normalizedRow['zone'] || normalizedRow['utmzone'] || normalizedRow['utm_zone'] || '');
            const utmBand = String(normalizedRow['utm_band'] || normalizedRow['utmband'] || normalizedRow['band'] || '');
            if (parsedFuso && utmBand && !parsedFuso.includes(utmBand)) {
                parsedFuso = `${parsedFuso}${utmBand}`;
            }

            const objId = String(normalizedRow['object_id'] || normalizedRow['objectid'] || normalizedRow['id'] || '');
            const seqFromRow = parseNumber(normalizedRow['object_seq'] || normalizedRow['objectseq'] || normalizedRow['seq'] || normalizedRow['ordem'] || normalizedRow['num'] || normalizedRow['n'] || 0);

            // New Columns Mapping
            const structureType = String(normalizedRow['structuretype'] || normalizedRow['structure_type'] || normalizedRow['tipificacao_estrutura'] || normalizedRow['tipificacao'] || '');
            const isHidden = parseBoolean(normalizedRow['ishidden'] || normalizedRow['is_hidden'] || normalizedRow['hidden'] || normalizedRow['ocultar']);
            const dist = parseNumber(normalizedRow['distance'] || normalizedRow['distancia'] || normalizedRow['dist'] || 0);
            const wgt = parseNumber(normalizedRow['weight'] || normalizedRow['peso'] || normalizedRow['cable_tension'] || 0);
            // distance used to replace go_forward in logic, but we map both for safety
            const goForward = parseNumber(normalizedRow['go_forward'] || normalizedRow['goforward'] || normalizedRow['vao_vante'] || 0) || dist;

            return {
                object_seq: seqFromRow || getNumericId(objId),
                object_id: objId,
                tower_type: String(normalizedRow['tower_type'] || normalizedRow['towertype'] || normalizedRow['type'] || normalizedRow['tipo'] || normalizedRow['structure'] || ''),
                object_height: parseNumber(normalizedRow['object_height'] || normalizedRow['objectheight'] || normalizedRow['altura'] || 0),
                go_forward: goForward,
                deflection: String(normalizedRow['deflection'] || normalizedRow['deflexao'] || normalizedRow['angulo'] || ''),
                object_elevation: parseNumber(normalizedRow['object_elevation'] || normalizedRow['objectelevation'] || normalizedRow['cota'] || normalizedRow['elevacao'] || normalizedRow['altitude'] || 0),
                fuso_object: parsedFuso,
                x_coordinate: parseNumber(normalizedRow['x_coordinate'] || normalizedRow['x_cord_object'] || normalizedRow['coord_x'] || normalizedRow['x'] || 0),
                y_coordinate: parseNumber(normalizedRow['y_coordinate'] || normalizedRow['y_cord_object'] || normalizedRow['coord_y'] || normalizedRow['y'] || 0),
                fix_conductor: parseNumber(normalizedRow['fix_conductor'] || normalizedRow['fixconductor'] || normalizedRow['cabo_condutor'] || 0),
                fix_pararaio: parseNumber(normalizedRow['fix_pararaio'] || normalizedRow['fixpararaio'] || normalizedRow['cabo_pararaio'] || 0),
                tipificacao_estrutura: structureType,
                is_hidden: isHidden,
                distance: dist,
                weight: wgt,
                metadata: {
                    original_utm_zone: normalizedRow['utm_zone'],
                    original_utm_band: normalizedRow['utm_band']
                }
            }
        })

        console.log(`Excel: Parsed ${rows.length} rows successfully`)
        return rows
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const targetProjectId = selectedProjectId || externalProjectId
        if (!targetProjectId || targetProjectId === 'all') {
            toast({
                title: 'Selecione uma Obra',
                description: 'É necessário selecionar uma obra para vincular os dados.',
                variant: 'destructive'
            })
            return
        }

        setLoading(true)

        try {
            console.log('File: Starting file process:', file.name, 'Type:', file.type)

            let rows: TowerRow[] = []

            // Detect file type by extension
            const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')

            if (isExcel) {
                const buffer = await file.arrayBuffer()
                rows = parseExcel(buffer)
            } else {
                const text = await file.text()
                rows = parseCSV(text)
            }

            if (rows.length === 0) {
                throw new Error('Arquivo vazio ou colunas não reconhecidas. Verifique se o arquivo segue o padrão: object_id, type, object_height...')
            }

            // Check if coordinates look like UTM (very large numbers)
            const utmPoints = rows.filter(r => Math.abs(r.x_coordinate) > 180 || Math.abs(r.y_coordinate) > 90);
            if (utmPoints.length > 0) {
                console.log(`CSV: Detected ${utmPoints.length} points that look like UTM. Attempting conversion...`);

                let convertedCount = 0;
                rows = rows.map(row => {
                    let finalX = row.x_coordinate;
                    let finalY = row.y_coordinate;

                    // AUTO-FIX: Detect and fix millimeter scaling (e.g., 626596228 -> 626596.228)
                    // Logic: UTM X is usually < 1,000,000. UTM Y is < 10,000,000 (Southern Hemisphere).
                    // If values are massive (e.g. > 100,000,000), they are likely in millimeters or missing decimal separator.

                    if (Math.abs(finalX) > 10000000) {
                        // Try dividing by 1000 iteratively
                        while (Math.abs(finalX) > 10000000) finalX /= 1000;
                        console.log(`CSV: Auto-scaled X from ${row.x_coordinate} to ${finalX}`);
                    }
                    if (Math.abs(finalY) > 20000000) {
                        while (Math.abs(finalY) > 20000000) finalY /= 1000;
                        console.log(`CSV: Auto-scaled Y from ${row.y_coordinate} to ${finalY}`);
                    }

                    const isUTM = Math.abs(finalX) > 180 || Math.abs(finalY) > 90;
                    if (isUTM) {
                        const zoneData = parseUTMZone(row.fuso_object || defaultFuso);
                        if (zoneData) {
                            const { lat, lng } = utmToLatLng(finalX, finalY, zoneData.zone, zoneData.southHemi);
                            convertedCount++;
                            return {
                                ...row,
                                x_coordinate: lng,
                                y_coordinate: lat,
                                fuso_object: row.fuso_object || defaultFuso,
                                metadata: {
                                    ...(row.metadata as any || {}),
                                    original_utm_x: finalX,
                                    original_utm_y: finalY,
                                    raw_excel_x: row.x_coordinate, // Keep track of raw bad data
                                    raw_excel_y: row.y_coordinate,
                                    original_fuso: row.fuso_object || defaultFuso,
                                    converted_from_utm: true
                                }
                            };
                        }
                    }
                    else {
                        // If not UTM after scaling, still use the scaled values if they were scaled
                        return {
                            ...row,
                            x_coordinate: finalX,
                            y_coordinate: finalY
                        };
                    }
                    return row;
                });

                if (convertedCount > 0) {
                    toast({
                        title: 'Conversão UTM Ativa',
                        description: `Detectamos coordenadas UTM. ${convertedCount} pontos foram convertidos para WGS84 usando o fuso "${defaultFuso}".`
                    });
                } else {
                    throw new Error(`As coordenadas detectadas parecem ser UTM (valores altos), mas o fuso "${defaultFuso}" é inválido. Verifique o Fuso Padrão no painel.`);
                }
            }

            const projectCompanyId = projects.find(p => p.id === targetProjectId)?.companyId;
            const effectiveCompanyId = profile?.companyId || projectCompanyId;

            if (!effectiveCompanyId) {
                console.error('CSV: Missing companyId in profile and project:', profile)
                throw new Error('Empresa não identificada. Verifique se a obra selecionada está vinculada a uma empresa.')
            }

            // Deduplicate
            const uniqueRowsMap = new Map<string, TowerRow>();
            rows.forEach(row => {
                const key = `${row.object_id}:::${row.object_seq}`;
                uniqueRowsMap.set(key, row);
            });
            const uniqueRows = Array.from(uniqueRowsMap.values());
            console.log(`CSV: Deduplicated ${rows.length} rows to ${uniqueRows.length} unique records`);

            // Validate Numeric Limits to prevent "Numeric Field Overflow"
            const MAX_DECIMAL_VALUE = 999999999999; // 1 trillion safe limit for Decimal(30,10)
            const hugeNumbers = uniqueRows.find(row => {
                return [row.go_forward, row.object_height, row.object_elevation, row.distance, row.weight, row.x_coordinate, row.y_coordinate]
                    .some(val => val && Math.abs(val) > MAX_DECIMAL_VALUE);
            });

            if (hugeNumbers) {
                const offender = Object.entries(hugeNumbers).find(([k, v]) => typeof v === 'number' && Math.abs(v) > MAX_DECIMAL_VALUE);
                console.error("CSV: Found huge number:", offender, "in row", hugeNumbers);
                throw new Error(`Detectado valor numérico muito alto na torre ${hugeNumbers.object_id} (Campo: ${offender?.[0]} = ${offender?.[1]}). Verifique se há erro de digitação ou notação científica.`);
            }

            // Prepare data for insert
            const dataToInsert = uniqueRows.map(row => ({
                project_id: targetProjectId,
                company_id: effectiveCompanyId,
                ...row,
                // Explicitly map new fields
                tipificacao_estrutura: row.tipificacao_estrutura,
                is_hidden: row.is_hidden,
                distance: row.distance,
                weight: row.weight,
                metadata: {
                    ...(row.metadata as any || {}),
                    deflection_decimal: 0
                }
            }))


            console.log('CSV: Attempting upsert to db...', dataToInsert.length, 'rows')

            // Upsert to handle duplicates
            const { error, data } = await db
                .from('map_elements' as any)
                .upsert(dataToInsert.map(d => ({ ...d, type: 'TOWER' })), {
                    onConflict: 'projectId,objectId',
                    ignoreDuplicates: false
                })
                .select()

            if (error) {
                console.error('CSV: db error:', error)
                throw error
            }

            console.log('CSV: Upsert successful:', data?.length, 'records processed')

            const projectName = projects.find(p => p.id === targetProjectId)?.name || 'Obra'
            toast({
                title: 'CSV Importado',
                description: `${rows.length} torres importadas para "${projectName}".`
            })

            if (onUploadSuccess) onUploadSuccess()

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao processar CSV'
            console.error('CSV: Error:', message)
            toast({
                title: 'Erro na Importação',
                description: message,
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
            setIsOpen(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    function handleSelectProject(projectId: string) {
        setSelectedProjectId(projectId)
        inputRef.current?.click()
    }

    return (
        <div className="flex items-center">
            <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
            />

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={loading}
                        className="glass-card gap-2 text-[10px] font-black uppercase tracking-widest border-white/5 h-10 shadow-glow active:scale-95 transition-all"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                        )}
                        {loading ? 'Importando...' : 'Importar CSV/Excel'}
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-2 glass-card border-white/10" align="end">
                    <div className="space-y-1">
                        <div className="px-2 py-3 border-b border-white/5 space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-primary/70">
                                Fuso Padrão (UTM fallback)
                            </label>
                            <input
                                type="text"
                                value={defaultFuso}
                                onChange={(e) => setDefaultFuso(e.target.value.toUpperCase())}
                                placeholder="Ex: 23S"
                                className="industrial-input h-8 text-[10px] w-full bg-white/5 border-white/10"
                            />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1">
                            Selecione a Obra para vincular os dados
                        </p>
                        <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                            {projects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectProject(p.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-all",
                                        "hover:bg-white/5 active:scale-[0.98]"
                                    )}
                                >
                                    <span className="truncate font-medium">{p.name}</span>
                                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground/30" />
                                </button>
                            ))}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}


