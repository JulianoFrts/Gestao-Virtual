import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, UserCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useEmployees, Employee } from '@/hooks/useEmployees';
import { faceRecognitionService } from '@/services/faceRecognitionService';
import { useToast } from '@/hooks/use-toast';

interface FaceRegistrationDialogProps {
    employee: Employee | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FaceRegistrationDialog({ employee, open, onOpenChange }: FaceRegistrationDialogProps) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { updateEmployee } = useEmployees();
    const { toast } = useToast();

    useEffect(() => {
        if (!open) {
            stopCamera();
        }
    }, [open]);

    const startCamera = async () => {
        setError(null);
        setIsCapturing(true);
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Não foi possível acessar a câmera. Verifique as permissões.');
            setIsCapturing(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCapturing(false);
    };

    const handleCapture = async () => {
        if (!videoRef.current || !employee) return;

        setIsProcessing(true);
        setError(null);

        try {
            const descriptor = await faceRecognitionService.getDescriptor(videoRef.current);

            if (descriptor) {
                // Converter Float32Array para Array normal para salvar no JSON do db
                const descriptorArray = Array.from(descriptor);

                const result = await updateEmployee(employee.id, {
                    faceDescriptor: descriptorArray
                });

                if (result.success) {
                    toast({
                        title: 'Rosto cadastrado!',
                        description: `Identificação facial de ${employee.fullName} configurada com sucesso.`,
                    });
                    onOpenChange(false);
                } else {
                    setError(result.error || 'Erro ao salvar os dados faciais no servidor. Verifique se a tabela foi atualizada.');
                }
            } else {
                setError('Nenhum rosto detectado. Tente se posicionar melhor em frente à câmera.');
            }
        } catch (err: any) {
            console.error('Error during face registration:', err);
            if (err.message?.includes('Fetch') || err.message?.includes('model')) {
                setError('Erro ao carregar modelos de IA (Rede/Arquivos).');
            } else {
                setError('Erro técnico no processamento facial. Tente novamente.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md glass-card border-white/10">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-primary" />
                        Cadastro Facial
                    </DialogTitle>
                    <DialogDescription>
                        Registre o rosto de <strong>{employee?.fullName}</strong> para permitir o registro de ponto por biometria.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative aspect-square rounded-3xl overflow-hidden bg-black/40 border-2 border-dashed border-white/10 flex items-center justify-center">
                        {isCapturing ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover mirror"
                                    style={{ transform: 'scaleX(-1)' }} // Mirror view for user
                                />
                                <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none">
                                    <div className="w-full h-full border-2 border-primary/50 rounded-full animate-pulse shadow-[0_0_50px_rgba(59,130,246,0.5)]" />
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-8 space-y-4">
                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                    <Camera className="w-10 h-10 text-primary opacity-50" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Posicione o rosto no centro da moldura para um cadastro preciso.
                                </p>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                <p className="font-bold animate-pulse">Analisando Biometria...</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {!isCapturing ? (
                            <Button onClick={startCamera} className="w-full h-12 gradient-primary shadow-glow">
                                <Camera className="w-4 h-4 mr-2" />
                                Iniciar Câmera
                            </Button>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={handleCapture}
                                    disabled={isProcessing}
                                    className="gradient-primary shadow-glow"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                                    Mapear Rosto
                                </Button>
                                <Button variant="outline" onClick={stopCamera} disabled={isProcessing} className="border-white/10">
                                    Cancelar
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

