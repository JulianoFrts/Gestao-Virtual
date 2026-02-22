/**
 * StreamService - GESTÃO VIRTUAL
 * Utilitário para lidar com streams SSE via POST (Auth via JSON)
 */

export interface StreamOptions {
  url: string;
  token: string;
  onMessage: (data: any) => void;
  onError?: (error: any) => void;
  onComplete?: () => void;
  body?: Record<string, any>;
}

export class StreamService {
  /**
   * Inicia um stream persistente via POST para maior segurança (Token no Body)
   */
  static async connect({ url, token, onMessage, onError, onComplete, body = {} }: StreamOptions) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...body,
          token,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (onComplete) onComplete();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Processar eventos SSE (padrão "data: ...\n\n")
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            try {
              const jsonStr = part.replace('data: ', '').trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);
                onMessage(data);
              }
            } catch (e) {
              console.error("[StreamService] Erro ao parsear mensagem:", e);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("[StreamService] Erro fatal no stream:", err);
      if (onError) onError(err);
    }
  }
}
