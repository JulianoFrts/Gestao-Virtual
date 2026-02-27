import { read, utils } from "xlsx";

/* ============================================================
   TYPES
============================================================ */

export type ImportStatus = "valid" | "invalid" | "warning";

export interface RawTowerImportItem {
  Sequencia: number;
  Trecho: string;
  NumeroTorre: string;
  TextoTorre: string;
  Tipificacao: string;
  TramoLancamento: number;
  // Campos Técnicos (Opcionais)
  VaoVante?: number;
  VolumeConcreto?: number;
  PesoArmacao?: number;
  PesoEstrutura?: number;
  Latitude?: number;
  Longitude?: number;
  Elevacao?: number;
  status: ImportStatus;
  errors?: string[];
}

export interface TowerImportResult {
  items: RawTowerImportItem[];
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
}

/* ============================================================
   SERVICE
============================================================ */

export class TowerImportService {
  /* ============================================================
     PUBLIC API
  ============================================================ */

  static async parseFile(
    file: File,
    options?: {
      enableDebugLog?: boolean;
    }
  ): Promise<TowerImportResult> {
    const debug = options?.enableDebugLog ?? false;

    const data = await file.arrayBuffer();

    const workbook = read(data, {
      type: "array",
      raw: true,
      codepage: 65001,
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    type RawRow = Record<string, unknown>;

    const rows = utils.sheet_to_json<RawRow>(sheet, {
      raw: true,
      defval: "",
    });

    const items = rows.map((row, idx) =>
      this.mapRow(row, idx, debug)
    );

    return this.buildResult(items);
  }

  /* ============================================================
     ROW MAPPING
  ============================================================ */

  private static mapRow(
    row: Record<string, unknown>,
    idx: number,
    debug: boolean
  ): RawTowerImportItem {
    const numeroTorre = this.parseText(row["NumeroTorre"]);
    const sequencia = this.parseInteger(row["Sequencia"]);

    const item: RawTowerImportItem = {
      Sequencia: sequencia > 0 ? sequencia : idx + 1,
      Trecho: this.parseText(row["Trecho"]),
      NumeroTorre: numeroTorre,
      TextoTorre: this.parseText(row["TextoTorre"] || row["Descricao"] || row["Tipo"]),
      Tipificacao: this.parseText(row["Tipificacao"] || row["Estrutura"]),
      TramoLancamento: this.parseInteger(row["TramoLancamento"]),
      // Dados Técnicos
      VaoVante: this.parseNumber(row["VaoVante"] || row["Vao"] || row["Distancia"]),
      VolumeConcreto: this.parseNumber(row["VolumeConcreto"] || row["Volume"] || row["Concreto"]),
      PesoArmacao: this.parseNumber(row["PesoArmacao"] || row["Aco"] || row["Armacao"]),
      PesoEstrutura: this.parseNumber(row["PesoEstrutura"] || row["Peso"] || row["EstruturaMontagem"]),
      Latitude: this.parseNumber(row["Latitude"] || row["Lat"] || row["Y"] || row["COORD_Y"]),
      Longitude: this.parseNumber(row["Longitude"] || row["Lng"] || row["X"] || row["COORD_X"]),
      Elevacao: this.parseNumber(row["Elevacao"] || row["Elev"] || row["Z"] || row["ALTITUDE"]),
      status: "valid",
    };

    return this.validate(item);
  }

  /* ============================================================
     VALIDATION
  ============================================================ */

  private static validate(
    item: RawTowerImportItem
  ): RawTowerImportItem {
    const errors: string[] = [];

    if (!item.NumeroTorre) {
      errors.push("Identificador (NumeroTorre) ausente");
    }

    if (!item.Trecho) {
      errors.push("Trecho não informado");
    }

    if (item.TramoLancamento < 0) {
      errors.push("TramoLancamento inválido");
    }

    if (errors.length > 0) {
      item.status = "invalid";
      item.errors = errors;
    }

    return item;
  }

  /* ============================================================
     RESULT BUILDER
  ============================================================ */

  private static buildResult(
    items: RawTowerImportItem[]
  ): TowerImportResult {
    const total = items.length;
    const valid = items.filter(i => i.status === "valid").length;
    const invalid = items.filter(i => i.status === "invalid").length;
    const warnings = items.filter(i => i.status === "warning").length;

    return {
      items,
      total,
      valid,
      invalid,
      warnings,
    };
  }

  /* ============================================================
     PARSERS
  ============================================================ */

  private static parseNumber(value: unknown): number {
    if (typeof value === "number") return value;
    if (!value) return 0;

    const sanitized = String(value)
      .replace(/[^\d.,-]/g, "")
      .trim();

    const lastComma = sanitized.lastIndexOf(",");
    const lastDot = sanitized.lastIndexOf(".");

    let normalized = sanitized;

    if (lastComma > lastDot) {
      normalized = sanitized
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      normalized = sanitized.replace(/,/g, "");
    }

    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private static parseInteger(value: unknown): number {
    return Math.trunc(this.parseNumber(value));
  }

  private static parseText(value: unknown): string {
    if (value === null || value === undefined) return "";

    if (value instanceof Date && !isNaN(value.getTime())) {
      return `${value.getDate()}/${value.getMonth() + 1}`;
    }

    return String(value).trim();
  }
}