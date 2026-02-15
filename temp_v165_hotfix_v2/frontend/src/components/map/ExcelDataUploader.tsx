
import React, { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { read, utils } from 'xlsx';
import { useToast } from "@/hooks/use-toast";

interface TowerData {
    name: string;
    coordinates: {
        lat: number;
        lng: number;
        altitude: number;
    };
    isHidden: boolean;
    properties?: any;
}

interface ConnectionData {
    from: string;
    to: string;
}

interface ExcelDataUploaderProps {
    onLoad: (towers: TowerData[], connections: ConnectionData[]) => void;
}

export function ExcelDataUploader({ onLoad }: ExcelDataUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const parseNumber = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            return parseFloat(val.replace(',', '.'));
        }
        return 0;
    };

    const parseBoolean = (val: any) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
            const lower = val.toLowerCase().trim();
            return lower === 'true' || lower === 'verdadeiro' || lower === '1' || lower === 'yes';
        }
        return false;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = read(bstr, { type: 'binary' });

                let foundTowers: TowerData[] = [];
                let foundConnections: ConnectionData[] = [];

                // Iterate over all sheets to find data
                wb.SheetNames.forEach(sheetName => {
                    const ws = wb.Sheets[sheetName];
                    const data: any[] = utils.sheet_to_json(ws);

                    if (data.length === 0) return;

                    const firstRow = data[0];
                    const keys = Object.keys(firstRow).map(k => k.toLowerCase());

                    console.log(`📄 Checking Sheet: ${sheetName}`, keys);

                    // Check if it's a TOWER sheet (needs coordinates)
                    // Looking for: x_coordinate, y_coordinate OR lat, lng
                    const hasCoords = (keys.includes('x_coordinate') && keys.includes('y_coordinate')) ||
                        (keys.includes('lat') && keys.includes('lng')) ||
                        (keys.includes('latitude') && keys.includes('longitude'));

                    if (hasCoords) {
                        console.log(`✅ Found Tower Data in ${sheetName}`);
                        foundTowers = data.map((row: any) => {
                            // Map X/Y to Lng/Lat
                            // X = Longitude, Y = Latitude
                            const lng = parseNumber(row.x_coordinate || row.lng || row.longitude);
                            const lat = parseNumber(row.y_coordinate || row.lat || row.latitude);
                            const alt = parseNumber(row.object_height || row.object_elevation || row.altitude || row.height || 0);
                            const name = String(row.object_Id || row.name || row.id || `Tower-${Math.random()}`);
                            const isHidden = parseBoolean(row.isHidden || row.hidden || "false");

                            return {
                                name,
                                coordinates: { lat, lng, altitude: alt },
                                isHidden,
                                properties: row
                            };
                        }).filter(t => !isNaN(t.coordinates.lat) && !isNaN(t.coordinates.lng));
                    }

                    // Check if it's a CONNECTION sheet
                    // Looking for: from_tower_id, to_tower_id
                    const hasConnections = (keys.includes('from_tower_id') && keys.includes('to_tower_id')) ||
                        (keys.includes('from') && keys.includes('to'));

                    if (hasConnections) {
                        console.log(`✅ Found Connections in ${sheetName}`);
                        foundConnections = data.map((row: any) => ({
                            from: String(row.from_tower_id || row.from || row.From || ""),
                            to: String(row.to_tower_id || row.to || row.To || "")
                        })).filter(c => c.from && c.to);
                    }
                });

                if (foundTowers.length > 0) {
                    onLoad(foundTowers, foundConnections);
                    toast({
                        title: "Projeto Importado",
                        description: `${foundTowers.length} torres e ${foundConnections.length} conexões carregadas.`,
                    });
                } else {
                    toast({
                        title: "Erro na Importação",
                        description: "Não foi possível encontrar colunas de coordenadas (x_coordinate/y_coordinate) no Excel.",
                        variant: "destructive"
                    });
                }

            } catch (err) {
                console.error("Erro ao ler Excel:", err);
                toast({
                    title: "Erro ao ler arquivo",
                    description: "Certifique-se que é um arquivo .xlsx válido.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .xls, .csv"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <Button
                variant="outline"
                disabled={loading}
                className="gap-2 bg-blue-950/30 border-blue-900/50 hover:bg-blue-900/50 text-blue-400"
                onClick={() => fileInputRef.current?.click()}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Importar Projeto (Excel)
            </Button>
        </>
    );
}
