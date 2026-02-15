/**
 * Utilitário para compressão de imagens antes do upload
 */

export type CompressionLevel = 'none' | 'light' | 'moderate' | 'aggressive';

interface CompressionConfig {
    maxWidth: number;
    quality: number;
    label: string;
}

const COMPRESSION_CONFIGS: Record<CompressionLevel, CompressionConfig> = {
    none: { maxWidth: 1920, quality: 0.95, label: 'Original (95%)' },
    light: { maxWidth: 800, quality: 0.80, label: 'Leve (800px, 80%)' },
    moderate: { maxWidth: 640, quality: 0.70, label: 'Moderada (640px, 70%)' },
    aggressive: { maxWidth: 480, quality: 0.65, label: 'Agressiva (480px, 65%)' }
};

/**
 * Comprime uma imagem base64 para um tamanho menor
 */
export async function compressImage(
    imageDataUrl: string,
    level: CompressionLevel = 'moderate'
): Promise<{ dataUrl: string; sizeKB: number; config: CompressionConfig }> {
    const config = COMPRESSION_CONFIGS[level];

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');

            // Calcular novas dimensões mantendo proporção
            let width = img.width;
            let height = img.height;

            if (width > config.maxWidth) {
                height = (height * config.maxWidth) / width;
                width = config.maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Não foi possível criar contexto canvas'));
                return;
            }

            // Desenhar imagem redimensionada
            ctx.drawImage(img, 0, 0, width, height);

            // Exportar com qualidade especificada
            const dataUrl = canvas.toDataURL('image/jpeg', config.quality);

            // Calcular tamanho aproximado em KB
            const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length;
            const sizeKB = Math.round((base64Length * 0.75) / 1024);

            resolve({ dataUrl, sizeKB, config });
        };

        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = imageDataUrl;
    });
}

/**
 * Gera todas as versões comprimidas para comparação
 */
export async function generateCompressionComparison(
    imageDataUrl: string
): Promise<Array<{ level: CompressionLevel; dataUrl: string; sizeKB: number; label: string }>> {
    const levels: CompressionLevel[] = ['none', 'light', 'moderate', 'aggressive'];

    const results = await Promise.all(
        levels.map(async (level) => {
            const { dataUrl, sizeKB, config } = await compressImage(imageDataUrl, level);
            return { level, dataUrl, sizeKB, label: config.label };
        })
    );

    return results;
}

/**
 * Retorna configuração de compressão por nível
 */
export function getCompressionConfig(level: CompressionLevel): CompressionConfig {
    return COMPRESSION_CONFIGS[level];
}
