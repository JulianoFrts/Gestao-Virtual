import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Camera, MapPin, Mic, Bell, X, Loader2 } from 'lucide-react';
import { storageService } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';


interface PermissionItemProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    onToggle: (checked: boolean) => void;
    checked: boolean;
    loading?: boolean;
}

const PermissionItem = ({ icon, title, description, onToggle, checked, loading }: PermissionItemProps) => {
    return (
        <div className="flex items-start gap-4 py-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                {icon}
            </div>
            <div className="flex-1 space-y-1">
                <h4 className="font-bold text-[#7C3AED] text-sm leading-none">{title}</h4>
                <p className="text-[10px] text-muted-foreground leading-snug">{description}</p>
            </div>
            <div className="flex items-center gap-2">
                {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                <Switch
                    checked={checked}
                    onCheckedChange={onToggle}
                    disabled={loading || checked}
                    className="data-[state=checked]:bg-primary"
                />
            </div>
        </div>
    );
};
export function PermissionsModal() {
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState<Record<string, boolean>>({});
    const [perms, setPerms] = React.useState({
        camera: false,
        location: false,
        mic: false,
        notifications: false
    });

    const checkCurrentPermissions = React.useCallback(async () => {
        if (navigator.permissions && navigator.permissions.query) {
            try {
                // Wrap queries in a helper to handle potential prompt-triggering behavior in some browsers
                // though query() itself shouldn't prompt.
                const [cam, loc, mic, notif] = await Promise.all([
                    navigator.permissions.query({ name: 'camera' as any }).catch(() => ({ state: 'prompt' })),
                    navigator.permissions.query({ name: 'geolocation' as any }).catch(() => ({ state: 'prompt' })),
                    navigator.permissions.query({ name: 'microphone' as any }).catch(() => ({ state: 'prompt' })),
                    navigator.permissions.query({ name: 'notifications' as any }).catch(() => ({ state: 'prompt' }))
                ]);

                setPerms({
                    camera: (cam as any).state === 'granted',
                    location: (loc as any).state === 'granted',
                    mic: (mic as any).state === 'granted',
                    notifications: (notif as any).state === 'granted'
                });
            } catch (e) {
                console.warn('Permission query not fully supported');
            }
        }
    }, []);

    React.useEffect(() => {
        const check = async () => {
            const acknowledged = await storageService.getItem(
                "permissions_acknowledged",
            );
            if (!acknowledged) {
                setOpen(true);
            }
            // Check permissions inline to avoid dependency issues
            if (navigator.permissions && navigator.permissions.query) {
                try {
                    const [cam, loc, mic, notif] = await Promise.all([
                        navigator.permissions
                            .query({ name: "camera" as any })
                            .catch(() => ({ state: "prompt" })),
                        navigator.permissions
                            .query({ name: "geolocation" as any })
                            .catch(() => ({ state: "prompt" })),
                        navigator.permissions
                            .query({ name: "microphone" as any })
                            .catch(() => ({ state: "prompt" })),
                        navigator.permissions
                            .query({ name: "notifications" as any })
                            .catch(() => ({ state: "prompt" })),
                    ]);
                    setPerms({
                        camera: (cam as any).state === "granted",
                        location: (loc as any).state === "granted",
                        mic: (mic as any).state === "granted",
                        notifications: (notif as any).state === "granted",
                    });
                } catch (e) {
                    // Silenciosamente ignora falhas na query de permissões (alguns navegadores não suportam todas)
                }
            }
        };
        check();

        // Listen for global trigger
        const handleForceOpen = () => setOpen(true);
        window.addEventListener("open-permissions-modal", handleForceOpen);
        return () =>
            window.removeEventListener("open-permissions-modal", handleForceOpen);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggle = async (type: keyof typeof perms) => {
        if (perms[type] || isLoading[type]) return;

        setIsLoading(prev => ({ ...prev, [type]: true }));
        try {
            if (type === 'camera') {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(t => t.stop());
                setPerms(prev => ({ ...prev, camera: true }));
                toast({ title: 'Câmera permitida', description: 'Acesso autorizado com sucesso.' });
            } else if (type === 'location') {
                // Use a promise with timeout for geolocation as it's the most likely to hang
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('TIMEOUT')), 10000);
                    navigator.geolocation.getCurrentPosition(
                        () => {
                            clearTimeout(timeout);
                            setPerms(prev => ({ ...prev, location: true }));
                            resolve();
                        },
                        (err) => {
                            clearTimeout(timeout);
                            reject(err);
                        },
                        { enableHighAccuracy: false, timeout: 8000 }
                    );
                });
                toast({ title: 'Localização permitida', description: 'Coordenadas autorizadas.' });
            } else if (type === 'mic') {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
                setPerms(prev => ({ ...prev, mic: true }));
                toast({ title: 'Microfone permitido', description: 'Acesso autorizado com sucesso.' });
            } else if (type === 'notifications') {
                const res = await Notification.requestPermission();
                setPerms(prev => ({ ...prev, notifications: res === 'granted' }));
                if (res === 'granted') {
                    toast({ title: 'Notificações permitidas', description: 'Você receberá alertas do app.' });
                } else {
                    throw new Error('DENIED');
                }
            }
        } catch (err: any) {
            console.error(`Error requesting ${String(type)} permission:`, err);
            let message = 'Não foi possível autorizar a permissão.';

            if (type === 'location' && err.code === 1) {
                message = 'Acesso negado no navegador. Clique no ícone de cadeado (barra de endereço) para permitir.';
            } else if (err.message === 'TIMEOUT') {
                message = 'A busca de localização demorou muito. Tente novamente em um local aberto.';
            } else if (err.name === 'NotAllowedError' || err.message === 'DENIED') {
                const label = type === 'notifications' ? 'notificações' : type === 'camera' ? 'câmera' : 'microfone';
                message = `O acesso às ${label} foi negado. Verifique as configurações do cadeado no seu navegador.`;
            }

            toast({
                title: `Acesso negado: ${type === 'location' ? 'Localização' : String(type)}`,
                description: message,
                variant: 'destructive'
            });
        } finally {
            setIsLoading(prev => ({ ...prev, [type]: false }));
            // Re-check just in case the state didn't update as expected
            await checkCurrentPermissions();
        }
    };

    const handleClose = async () => {
        await storageService.setItem('permissions_acknowledged', true);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-background rounded-[2.5rem] shadow-2xl">
                <div className="p-8 space-y-8 max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="text-center space-y-3 pt-4 relative">
                        <button
                            onClick={handleClose}
                            className="absolute right-0 top-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <DialogTitle className="text-3xl font-black tracking-tight text-foreground">Bem-vindo!</DialogTitle>
                        <p className="text-[13px] text-center text-muted-foreground font-medium px-4">
                            Antes de começar por favor conceda as seguintes permissões ao aplicativo:
                        </p>
                    </DialogHeader>

                    <div className="space-y-2 divide-y divide-white/5">
                        <PermissionItem
                            icon={<Camera className="w-5 h-5" />}
                            title="Uso da câmera"
                            description="Para registrar uma foto do colaborador ao bater ponto"
                            checked={perms.camera}
                            loading={isLoading.camera}
                            onToggle={() => handleToggle('camera')}
                        />
                        <PermissionItem
                            icon={<MapPin className="w-5 h-5" />}
                            title="Localização"
                            description="Para registrar o local exato dos pontos batidos"
                            checked={perms.location}
                            loading={isLoading.location}
                            onToggle={() => handleToggle('location')}
                        />
                        <PermissionItem
                            icon={<Mic className="w-5 h-5" />}
                            title="Uso do microfone"
                            description="Para gravar e guardar áudio dos pontos batidos"
                            checked={perms.mic}
                            loading={isLoading.mic}
                            onToggle={() => handleToggle('mic')}
                        />
                        <PermissionItem
                            icon={<Bell className="w-5 h-5" />}
                            title="Uso das notificações"
                            description="Para enviar notificações de lembrete de ponto e outras informações importantes"
                            checked={perms.notifications}
                            loading={isLoading.notifications}
                            onToggle={() => handleToggle('notifications')}
                        />
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleClose}
                            className="w-full h-16 rounded-full bg-[#F5F3F7] hover:bg-[#EBE7F0] text-[#7C3AED] font-bold text-lg shadow-none"
                        >
                            {Object.values(perms).every(p => p) ? 'Começar Agora' : 'Permitir depois'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
