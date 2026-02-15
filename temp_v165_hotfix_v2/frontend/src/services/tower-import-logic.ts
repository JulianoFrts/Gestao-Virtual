import { read, utils } from 'xlsx';
import { utmToLatLon, getZoneFromState } from '../utils/convert-utm';

export interface CreateTowerDto {
    code: number;
    tower_number: string;
    type: string;
    coordinates: {
        lat: number;
        lng: number;
        altitude: number;
    };
    distance?: number;
    height?: number;
    weight?: number;
    work_id: string;
}

export const TowerImportLogic = {
    parseTowerFile: async (file: File, workState: string, workId: string): Promise<CreateTowerDto[]> => {
        const defaultZone = getZoneFromState(workState);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e: any) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    const rows: any[][] = utils.sheet_to_json(worksheet, { header: 1 });

                    if (rows.length < 2) {
                        throw new Error('O arquivo parece estar vazio ou sem cabeçalho.');
                    }

                    const rawHeaders = rows[0] as string[];
                    const headers = rawHeaders.map(h =>
                        h ? h.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '_') : ''
                    );

                    const projectRows = rows.slice(1);
                    const towers: CreateTowerDto[] = [];

                    projectRows.forEach((row) => {
                        const rowMap: any = {};
                        headers.forEach((h, index) => {
                            if (h) rowMap[h] = row[index];
                        });

                        const parseNumber = (val: any): number => {
                            if (typeof val === 'number') return val;
                            if (!val) return 0;
                            const str = String(val).replace(',', '.');
                            return parseFloat(str) || 0;
                        };

                        const code = rowMap['code'] || rowMap['codigo'] || rowMap['torre_id'];
                        const towerNum = rowMap['tower'] || rowMap['tower_number'] || rowMap['tower_numb'] || rowMap['torre'] || rowMap['numero'];
                        const type = rowMap['type'] || rowMap['tipo'];
                        const height = parseNumber(rowMap['height'] || rowMap['altura']);
                        const weight = parseNumber(rowMap['weight'] || rowMap['peso']);
                        const distance = parseNumber(rowMap['distance'] || rowMap['distancia'] || rowMap['vao']);

                        const inputLat = parseNumber(rowMap['lat'] || rowMap['latitude']);
                        const inputLng = parseNumber(rowMap['lng'] || rowMap['longitude'] || rowMap['long']);

                        let finalLat = 0;
                        let finalLng = 0;
                        const altitude = parseNumber(rowMap['altitude'] || rowMap['alt']);

                        const isExplicitUtm = (rowMap['utm_easting'] || rowMap['easting'] || rowMap['x']) && (rowMap['utm_northing'] || rowMap['northing'] || rowMap['y']);

                        if (isExplicitUtm) {
                            const easting = parseNumber(rowMap['utm_easting'] || rowMap['easting'] || rowMap['x']);
                            const northing = parseNumber(rowMap['utm_northing'] || rowMap['northing'] || rowMap['y']);
                            const zone = rowMap['utm_zone'] || rowMap['zone'] || rowMap['zona'] || defaultZone;
                            const band = rowMap['utm_band'] || rowMap['band'] || 'K';

                            const conversion = utmToLatLon(easting, northing, zone, band);
                            finalLat = conversion.lat;
                            finalLng = conversion.lng;
                        } else {
                            const lookLikeUtm = Math.abs(inputLat) > 180 || Math.abs(inputLng) > 180;

                            if (lookLikeUtm) {
                                let easting = 0;
                                let northing = 0;

                                if (Math.abs(inputLat) > Math.abs(inputLng)) {
                                    northing = inputLat;
                                    easting = inputLng;
                                } else {
                                    northing = inputLng;
                                    easting = inputLat;
                                }

                                const zone = rowMap['utm_zone'] || rowMap['zone'] || rowMap['zona'] || defaultZone;
                                const band = rowMap['utm_band'] || rowMap['band'] || 'K';

                                const conversion = utmToLatLon(easting, northing, zone, band);
                                finalLat = conversion.lat;
                                finalLng = conversion.lng;
                            } else {
                                finalLat = inputLat;
                                finalLng = inputLng;
                            }
                        }

                        if (code && towerNum) {
                            towers.push({
                                code: Number(code),
                                tower_number: String(towerNum),
                                type: type ? String(type) : '',
                                coordinates: {
                                    lat: finalLat,
                                    lng: finalLng,
                                    altitude: altitude
                                },
                                distance: distance,
                                height: height,
                                weight: weight,
                                work_id: workId
                            });
                        }
                    });

                    if (towers.length === 0) {
                        throw new Error('Nenhuma torre válida encontrada.');
                    }

                    resolve(towers);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }
};
