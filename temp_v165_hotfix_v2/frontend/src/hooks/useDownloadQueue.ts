import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ConstructionDocument } from './useConstructionDocuments';

export function useDownloadQueue(downloadFunction: (doc: ConstructionDocument) => Promise<void>) {
    const [queue, setQueue] = useState<ConstructionDocument[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentDownload, setCurrentDownload] = useState<string | null>(null);

    const addToQueue = useCallback((docs: ConstructionDocument[]) => {
        setQueue(prev => [...prev, ...docs]);
        toast.info(`${docs.length} arquivo(s) adicionado(s) à fila de download.`);
    }, []);

    const processQueue = useCallback(async () => {
        if (isProcessing || queue.length === 0) return;

        setIsProcessing(true);
        const doc = queue[0];
        const remainingQueue = queue.slice(1);
        setQueue(remainingQueue);
        setCurrentDownload(doc.name);

        try {
            await downloadFunction(doc);
            // Artificial delay to prevent browser throttling/blocking
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error("Download error:", error);
        } finally {
            setIsProcessing(false);
            setCurrentDownload(null);
        }
    }, [queue, isProcessing, downloadFunction]);

    useEffect(() => {
        if (!isProcessing && queue.length > 0) {
            processQueue();
        }
    }, [queue, isProcessing, processQueue]);

    return {
        addToQueue,
        queueLength: queue.length,
        isProcessing,
        currentDownload
    };
}
