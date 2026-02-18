
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FolderUp, Loader2, ChevronDown, FileJson } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { db } from "@/integrations/database";
import { cn } from "@/lib/utils";
import JSZip from "jszip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CatenaryCalculator } from "@/services/catenary-calculator";

interface KMLUploaderProps {
  projectId?: string;
  onUploadSuccess?: () => void;
}

export function KMLUploader({
  projectId: externalProjectId,
  onUploadSuccess,
}: KMLUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    externalProjectId || null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { projects } = useProjects();

  const getNumericId = (name: string) => {
    const upper = (name || "").trim().toUpperCase();
    // Regex para capturar padrões comuns de torres: Num/Seq+Sufixo
    // Ex: 202/1, 202/1A, 0/1B, 22/3
    const parts = upper.match(/(\d+)\/(\d+)([A-Z])?/);
    if (parts) {
      const structure = parseInt(parts[1]);
      const seq = parseInt(parts[2]);
      const suffix = parts[3];

      // Peso base para a estrutura (ex: km ou número da torre principal)
      // Multiplicamos por 10000 para ter espaço para sequências e sufixos
      let val = structure * 10000;

      // Adiciona a sequência (ex: 1, 2, 3...)
      val += seq * 100;

      // Adiciona peso para sufixos (A=1, B=2...)
      // Torres sem sufixo ficam com 0 (ex: 1/1 vem antes de 1/1A? Depende da lógica)
      // Geralmente 1/1 é a torre base. 1/1A seria uma intermediária ou variante.
      // Se 1/1A deve vir DEPOIS de 1/1, então sufixo soma.
      if (suffix) {
        val += suffix.charCodeAt(0) - 64; // A=1, B=2...
      }

      return val;
    }

    // Fallback para apenas números
    const simple = upper.match(/\d+/);
    return simple ? parseInt(simple[0]) * 100 : 0;
  };

  const parseKML = async (kmlText: string) => {
    const towerMap = new Map();
    const spans: Array<{
      tower_start_id?: string;
      tower_end_id?: string;
      span_name?: string;
      voltage_kv: number;
      cable_type?: string;
      catenary_constant: number;
      metadata: Record<string, unknown>;
      raw_points: [number, number, number][];
    }> = [];

    // 1. Extract Styles (BalloonStyle text contains technical data in PLS-CADD export)
    const towerStyles = new Map();
    const spanStyles = new Map();

    const styleRegex =
      /<Style id="([^"]+)">[\s\S]*?<text><!\[CDATA\[([\s\S]*?)\]\]><\/text>/g;
    let match;
    while ((match = styleRegex.exec(kmlText)) !== null) {
      const id = match[1];
      const content = match[2];

      if (content.includes("From Str.")) {
        // Span Style
        const voltage = content.match(/Voltage:\s*(.*?)<br>/)?.[1];
        const cable = content.match(/Cable:\s*(.*?)<br>/)?.[1];
        const fromRaw = content.match(/From Str\.:\s*(.*?)<br>/)?.[1];
        const toRaw = content.match(/To Str\.:\s*(.*?)<br>/)?.[1];
        const catenary = content.match(/Catenary \(m\)\s*([\d.]+)/)?.[1];

        // Extract common PLS-CADD extra fields
        const numCond = content.match(/Num\. Cond\.:\s*(\d+)/)?.[1];
        const phases = content.match(/Phases:\s*(\d+)/)?.[1];

        // Extract all technical fields from span style table
        const metadataExtra: Record<string, unknown> = {
          num_conductors: parseInt(numCond || "1"),
          phases: parseInt(phases || "3"),
        };

        const technicalMatches = content.matchAll(
          /<td>([^<]+)=([^<]+)<\/td>|<td>([^<]+):([^<]+)<\/td>/g,
        );
        for (const tMatch of technicalMatches) {
          const key = (tMatch[1] || tMatch[3])?.trim()?.replace(/\./g, "");
          const val = (tMatch[2] || tMatch[4])?.trim();
          if (
            key &&
            val &&
            ![
              "Voltage",
              "Cable",
              "From Str",
              "To Str",
              "Catenary (m)",
            ].includes(key)
          ) {
            metadataExtra[key.toLowerCase().replace(/\s+/g, "_")] = val;
          }
        }

        spanStyles.set(id, {
          voltage: parseFloat(voltage) || 500,
          cable: cable?.replace(/'/g, ""),
          from: fromRaw?.split(" Set ")[0]?.trim(),
          to: toRaw?.split(" Set ")[0]?.trim(),
          catenary: catenary ? parseFloat(catenary) : 1200,
          metadata: metadataExtra,
        });
      } else if (content.includes("HT=")) {
        // Tower Style
        const name = content.match(/<h3>(.*?)<\/h3>/)?.[1];
        const height = content.match(/HT=([\d.]+)/)?.[1];
        const elevation = content.match(/ELE=([\d.]+)/)?.[1];

        // Extract additional technical fields (VM, VPTMIN, VPTMAX, etc)
        const metadata: Record<string, unknown> = {};
        const technicalMatches = content.matchAll(
          /<td>([^<]+)=([^<]+)<\/td>|<td>([^<]+):([^<]+)<\/td>/g,
        );
        for (const tMatch of technicalMatches) {
          const key = (tMatch[1] || tMatch[3])?.trim()?.replace(/\./g, "");
          const val = (tMatch[2] || tMatch[4])?.trim();
          if (key && val && !["HT", "ELE", "X", "Y"].includes(key)) {
            metadata[key.toLowerCase()] = val;
          }
        }

        // Capture special descriptions (OBS)
        const obsMatches = content.matchAll(/<td>OBS(\d+):([^<]+)<\/td>/g);
        for (const oMatch of obsMatches) {
          metadata[`obs${oMatch[1]}`] = oMatch[2]?.trim();
        }

        towerStyles.set(id, {
          name: name?.trim(),
          height: height ? parseFloat(height) : 30,
          elevation: elevation ? parseFloat(elevation) : 0,
          metadata,
        });
      }
    }

    // 2. Extract Placemarks
    const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
    let genericCounter = 1;

    while ((match = placemarkRegex.exec(kmlText)) !== null) {
      const content = match[1];
      const styleUrl = content.match(/<styleUrl>#([^<]+)<\/styleUrl>/)?.[1];
      let handled = false;

      // Try PLS-CADD specific styles first
      if (styleUrl) {
        if (towerStyles.has(styleUrl)) {
          const style = towerStyles.get(styleUrl);
          const coordsMatch = content.match(
            /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/,
          );
          if (coordsMatch) {
            const parts = coordsMatch[1].trim().split(",");
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            towerMap.set(style.name, {
              object_id: style.name,
              object_seq: null, // Limpa a sequência para evitar conflitos (será preenchida pelo CSV)
              object_height: style.height,
              object_elevation: style.elevation,
              x_cord_object: lng,
              y_cord_object: lat,
              name: style.name,
              externalId: style.name,
              metadata: style.metadata || {},
            });
            handled = true;
          }
        } else if (spanStyles.has(styleUrl)) {
          const style = spanStyles.get(styleUrl);
          const coordsMatch = content.match(
            /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/,
          );
          if (coordsMatch) {
            const points = coordsMatch[1]
              .trim()
              .split(/\s+/)
              .map((p) => {
                const parts = p.split(",");
                return [
                  parseFloat(parts[0]),
                  parseFloat(parts[1]),
                  parseFloat(parts[2]) || 0,
                ];
              });
            spans.push({
              tower_start_id: style.from,
              tower_end_id: style.to,
              voltage_kv: style.voltage,
              cable_type: style.cable,
              catenary_constant: style.catenary,
              metadata: style.metadata || {},
              raw_points: points,
            });
            handled = true;
          }
        }
      }

      // Fallback for generic KML (Point support)
      if (!handled) {
        const nameMatch = content.match(/<name>([\s\S]*?)<\/name>/);
        const coordsMatch = content.match(
          /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/,
        );

        if (coordsMatch) {
          let name = nameMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
          const parts = coordsMatch[1].trim().split(/\s+/)[0].split(",");

          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);

            if (!isNaN(lng) && !isNaN(lat)) {
              if (!name) name = `PONTO_${genericCounter++}`;

              // Support for Technical Tours (LineStrings)
              const isLine = content.includes("<LineString>");
              const normName = (name || "").toUpperCase();
              const isTour = /ALIGNMENT|CENTERLINE|OFFSET/i.test(normName);

              if (isLine && isTour) {
                const points = coordsMatch[1]
                  .trim()
                  .split(/\s+/)
                  .map((p) => {
                    const c = p.split(",");
                    return [
                      parseFloat(c[0]),
                      parseFloat(c[1]),
                      parseFloat(c[2]) || 0,
                    ];
                  });
                spans.push({
                  tower_start_id: `TOUR_START_${normName.replace(/\s+/g, "_")}`,
                  tower_end_id: `TOUR_END_${normName.replace(/\s+/g, "_")}`,
                  span_name: name,
                  voltage_kv: 0,
                  cable_type: "Tour Técnico",
                  catenary_constant: 1000,
                  metadata: { is_tour: true, tour_type: normName },
                  raw_points: points,
                });
                handled = true;
              }

              // Only add if it's a single Point (not a long line segment being caught as a point)
              const isPoint = content.includes("<Point>");
              if (
                !handled &&
                isPoint &&
                !towerMap.has(name) &&
                !/TOUR|ROUTE/i.test(name)
              ) {
                towerMap.set(name, {
                  object_id: name,
                  object_seq: null,
                  object_height: 30, // Default height
                  object_elevation: 0,
                  x_cord_object: lng,
                  y_cord_object: lat,
                  name: name,
                  externalId: name,
                  metadata: {},
                });
              }
            }
          }
        }
      }
    }

    return { towers: Array.from(towerMap.values()), spans };
  };

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetProjectId = selectedProjectId || externalProjectId;
    if (!targetProjectId || targetProjectId === "all") {
      toast({
        title: "Selecione uma Obra",
        description: "É necessário selecionar uma obra para vincular os dados.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let kmlText = "";
      if (file.name.toLowerCase().endsWith(".kmz")) {
        const zip = await JSZip.loadAsync(file);
        const kmlFile = Object.keys(zip.files).find((f) =>
          f.toLowerCase().endsWith(".kml"),
        );
        if (!kmlFile)
          throw new Error(
            "Não foi possível encontrar o arquivo KML dentro do KMZ.",
          );
        kmlText = await zip.files[kmlFile].async("string");
      } else {
        kmlText = await file.text();
      }

      const { towers, spans } = await parseKML(kmlText);

      if (towers.length === 0) {
        throw new Error(
          "Nenhuma torre identificada no KML. Verifique o formato PLS-CADD.",
        );
      }

      // 1. Sync Towers in batches - DEDUPLICATE FIRST
      const towerDataToInsert = Array.from(
        new Map(
          towers.map((t) => [
            `${targetProjectId}:::${t.object_id}`,
            {
              project_id: targetProjectId,
              company_id: profile?.companyId,
              ...t,
            },
          ]),
        ).values(),
      );

      const BATCH_SIZE = 50;
      console.log(
        `📦 Sincronizando ${towerDataToInsert.length} torres únicas em lotes...`,
      );

      for (let i = 0; i < towerDataToInsert.length; i += BATCH_SIZE) {
        const batch = towerDataToInsert.slice(i, i + BATCH_SIZE).map(t => ({
          ...t,
          projectId: targetProjectId,
          companyId: profile?.companyId,
          type: 'TOWER'
        }));
        const { error: tErr } = await db
          .from("map_elements" as any)
          .upsert(batch, { onConflict: "projectId,objectId" });

        if (tErr) {
          console.error("❌ Erro no lote de torres:", tErr);
          throw new Error(
            `Erro ao salvar torres (Lote ${Math.floor(i / BATCH_SIZE) + 1}): ${tErr.message}`,
          );
        }
      }

      // 2. Process and DEDUPLICATE Spans
      const uniqueSpansMap = new Map();
      spans.forEach((span) => {
        // Ensure unique key for the span based on the constraint (project_id, tower_start, tower_end)
        const key = `${targetProjectId}:::${span.tower_start_id}:::${span.tower_end_id}`;

        // If we already have this span in the map, we skip it to avoid SQL 21000 error
        if (uniqueSpansMap.has(key)) return;

        const t1 = towers.find((t) => t.object_id === span.tower_start_id);
        const t2 = towers.find((t) => t.object_id === span.tower_end_id);

        let geometry: any = null;
        if (t1 && t2) {
          const start = {
            x: t1.x_cord_object,
            y: t1.y_cord_object,
            z: t1.object_height,
          };
          const end = {
            x: t2.x_cord_object,
            y: t2.y_cord_object,
            z: t2.object_height,
          };
          const points = CatenaryCalculator.generateCatenaryPoints(
            start,
            end,
            span.catenary_constant,
            80,
          );
          geometry = {
            type: "LineString",
            coordinates: points.map((p) => [p.x, p.y, p.z]),
          };
        } else {
          geometry = {
            type: "LineString",
            coordinates: span.raw_points,
          };
        }

        uniqueSpansMap.set(key, {
          project_id: targetProjectId,
          company_id: profile?.companyId,
          tower_start_id: span.tower_start_id,
          tower_end_id: span.tower_end_id,
          voltage_kv: span.voltage_kv,
          cable_type: span.cable_type,
          catenary_constant: span.catenary_constant,
          metadata: span.metadata,
          name: span.span_name || `${span.tower_start_id} - ${span.tower_end_id}`,
          externalId: `${span.tower_start_id} - ${span.tower_end_id}`,
          geometry,
        });
      });

      const processedSpans = Array.from(uniqueSpansMap.values());

      // 2. Sync Spans in batches
      console.log(
        `📦 Sincronizando ${processedSpans.length} vãos únicos em lotes...`,
      );
      for (let i = 0; i < processedSpans.length; i += BATCH_SIZE) {
        const batch = processedSpans.slice(i, i + BATCH_SIZE).map(s => ({
          ...s,
          projectId: targetProjectId,
          companyId: profile?.companyId,
          type: 'SPAN'
        }));
        const { error: sErr } = await db
          .from("map_elements" as any)
          .upsert(batch, {
            onConflict: "projectId,towerStartId,towerEndId",
          });

        if (sErr) {
          console.error("❌ Erro no lote de vãos:", sErr);
          throw new Error(
            `Erro ao salvar vãos (Lote ${Math.floor(i / BATCH_SIZE) + 1}): ${sErr.message}`,
          );
        }
      }

      toast({
        title: "Importação Concluída",
        description: `${towers.length} torres e ${spans.length} vãos sincronizados com sucesso.`,
      });

      if (onUploadSuccess) onUploadSuccess();
    } catch (error: any) {
      console.error("❌ KML Import Error Details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error,
      });
      toast({
        title: "Erro na Importação",
        description: error.message || "Erro desconhecido ao processar KML.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsOpen(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    inputRef.current?.click();
  }

  return (
    <div className="flex items-center">
      <input
        ref={inputRef}
        type="file"
        accept=".kml,.kmz"
        onChange={handleFileChange}
        className="hidden"
        id="kml-upload"
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
              <FileJson className="w-4 h-4" />
            )}
            {loading ? "Importando..." : "Importar KML/KMZ"}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-96 p-2 glass-card border-white/10"
          align="end"
        >
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1">
              Selecione a Obra para vincular os dados do Google Earth
            </p>
            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProject(p.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-all",
                    "hover:bg-white/5 active:scale-[0.98]",
                  )}
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <FileJson className="w-4 h-4 text-muted-foreground/30" />
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}


