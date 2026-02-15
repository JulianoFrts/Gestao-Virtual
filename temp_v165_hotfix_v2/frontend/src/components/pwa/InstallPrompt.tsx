import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share, Smartphone, CheckCircle2, MoreVertical, PlusSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null); // beforeinstallprompt event is hard to type precisely without extra libs
    const [isInstallable, setIsInstallable] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isOpera, setIsOpera] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone) {
            setIsStandalone(true);
        }

        // Detect browser/OS
        const ua = navigator.userAgent;
        setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream: any }).MSStream);
        setIsOpera(/OPR/i.test(ua) || /Opera/i.test(ua));

        const handler = (e: Event & { preventDefault: () => void; prompt: () => void; userChoice: Promise<{ outcome: string }> }) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            toast({
                title: "Instalando...",
                description: "O aplicativo está sendo instalado no seu dispositivo.",
            });
            setIsInstallable(false);
        }
        setDeferredPrompt(null);
    };

    if (isStandalone) {
        return (
            <div className="flex items-center gap-2 text-success bg-success/10 p-3 rounded-lg border border-success/20 w-full">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Aplicativo já instalado</span>
            </div>
        );
    }

    if (isIOS && !isStandalone) {
        return (
            <div className="space-y-3 bg-secondary/30 p-4 rounded-xl border border-white/10 w-full">
                <p className="text-sm font-medium flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Instalar no iPhone / iPad
                </p>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Toque no botão de compartilhar <Share className="h-3 w-3 inline" /> abaixo</li>
                    <li>Role para baixo e selecione "Adicionar à Tela de Início"</li>
                </ol>
            </div>
        );
    }

    // Caso não seja instalável automaticamente (comum no Opera)
    if (!isInstallable) {
        return (
            <div className="space-y-3 bg-secondary/30 p-4 rounded-xl border border-white/10 w-full animate-fade-in">
                <div className="flex items-center gap-2 text-primary font-medium">
                    <Download className="h-4 w-4" />
                    <span>Instalar Aplicativo</span>
                </div>

                <div className="text-xs text-muted-foreground space-y-2">
                    <p>O navegador (Opera) pode exigir a instalação manual. Siga os passos:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Procure o ícone de <strong>Adicionar</strong> <PlusSquare className="h-3 w-3 inline" /> na barra de endereços (lado direito).</li>
                        <li>Ou abra o menu <MoreVertical className="h-3 w-3 inline" /> e selecione <strong>"Instalar Aplicativo"</strong>.</li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <Button
            onClick={handleInstallClick}
            disabled={!isInstallable}
            className="w-full gap-2 gradient-primary text-white shadow-glow hover:opacity-90 transition-all h-11"
        >
            <Download className="h-5 w-5" />
            {isInstallable ? 'Instalar Aplicativo' : 'Verificando Compatibilidade...'}
        </Button>
    );
}
