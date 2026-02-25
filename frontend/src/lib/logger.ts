/**
 * Logger Padronizado - GESTÃO VIRTUAL Frontend
 */

const COLORS = {
  reset: "",
  bold: "font-weight: bold",
  red: "color: #ff5555",
  green: "color: #50fa7b",
  yellow: "color: #f1fa8c",
  cyan: "color: #8be9fd",
  white: "color: #f8f8f2",
  bgRed: "background-color: #ff5555; color: white; padding: 2px 4px; border-radius: 4px",
};

export const logger = {
  standard(
    statusCode: number,
    method: string,
    path: string,
    error?: any,
    source?: string
  ): void {
    if (!import.meta.env.DEV) return;

    let color = COLORS.white;
    if (statusCode >= 500) color = COLORS.red;
    else if (statusCode >= 400) color = COLORS.yellow;
    else if (statusCode >= 300) color = COLORS.cyan;
    else if (statusCode >= 200) color = COLORS.green;

    const tag = "%c[FRONTEND]";
    const statusText = `%cStatus(${statusCode})`;
    const methodText = `%c[${method}]`;
    const pathText = `%c${path}`;

    let logFormat = `${tag} ${statusText} ${methodText} ${pathText}`;
    const styles = [
      `${COLORS.bold}; ${COLORS.cyan}`,
      `${color}; ${COLORS.bold}`,
      COLORS.bold,
      "",
    ];

    if (error) {
      const errorDetail = error instanceof Error ? error.message : String(error);
      const sourceDetail = source ? ` at ${source}` : "";
      logFormat += ` | %c ERROR %c ${errorDetail}${sourceDetail}`;
      styles.push(COLORS.bgRed, COLORS.red);
    }

    console.log(logFormat, ...styles);
  },

  error(message: string, source?: string, error?: any): void {
    this.standard(500, "ERROR", source || "APP", error || message, source);
  },

  warn(message: string, source?: string): void {
    this.standard(400, "WARN", source || "APP", message, source);
  },

  info(message: string, source?: string): void {
    this.standard(200, "INFO", source || "APP", message, source);
  }
};

export default logger;
