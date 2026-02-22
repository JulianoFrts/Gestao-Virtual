/**
 * ForensicService - GESTÃO VIRTUAL
 * Coleta dados avançados do dispositivo, rede e localização para auditoria forense.
 */

export interface ForensicData {
  hwid: string;
  ip: string;
  location?: {
    lat: number;
    lng: number;
    city?: string;
    region?: string;
    country?: string;
  };
  network: {
    type: string; // wifi, 4g, etc
    downlink?: number;
    rtt?: number;
    isp?: string;
  };
  device: {
    model: string;
    os: string;
    browser: string;
    version: string;
    isMobile: boolean;
  };
  timestamp: string;
}

export class ForensicService {
  private static hwidCache: string | null = null;

  /**
   * Obtém ou gera um Hardware ID único para o navegador
   */
  static async getHWID(): Promise<string> {
    if (this.hwidCache) return this.hwidCache;
    
    // Tenta recuperar do localStorage
    const stored = localStorage.getItem('gv_forensic_hwid');
    if (stored) {
      this.hwidCache = stored;
      return stored;
    }

    // Gera um novo baseado em fingerprint básico (UUID simulado)
    // Em produção, usaríamos @fingerprintjs/fingerprintjs
    const newHwid = 'HWID-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('gv_forensic_hwid', newHwid);
    this.hwidCache = newHwid;
    return newHwid;
  }

  /**
   * Coleta todos os dados forenses disponíveis
   */
  static async collect(): Promise<ForensicData> {
    const hwid = await this.getHWID();
    
    // Dados de Conexão
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    // Dados de Localização (Opcional - Requer permissão)
    let location: any = undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
      });
      location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
    } catch {
      // Falha silenciosa se recusado ou timeout
    }

    // Dados de Dispositivo
    const ua = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    
    return {
      hwid,
      ip: 'CAPTURING_BY_BACKEND', // O backend resolve o IP real
      location,
      network: {
        type: conn?.effectiveType || 'unknown',
        downlink: conn?.downlink,
        rtt: conn?.rtt
      },
      device: {
        model: isMobile ? 'Mobile Device' : 'Desktop',
        os: this.getOS(ua),
        browser: this.getBrowser(ua),
        version: '1.0',
        isMobile
      },
      timestamp: new Date().toISOString()
    };
  }

  private static getOS(ua: string): string {
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "MacOS";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    if (ua.indexOf("Android") !== -1) return "Android";
    if (ua.indexOf("like Mac") !== -1) return "iOS";
    return "Unknown";
  }

  private static getBrowser(ua: string): string {
    if (ua.indexOf("Chrome") !== -1) return "Chrome";
    if (ua.indexOf("Firefox") !== -1) return "Firefox";
    if (ua.indexOf("Safari") !== -1) return "Safari";
    if (ua.indexOf("Edge") !== -1) return "Edge";
    return "Unknown";
  }
}
