import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { useEmployees } from '@/hooks/useEmployees';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Camera, Clock, CheckCircle2, LogIn, LogOut, AlertOctagon, Upload, Loader2, RefreshCw, Fingerprint, MapPin, History, Map, ChevronRight, X, User, AlertTriangle, ScanFace, Search, Check } from 'lucide-react';
import { faceRecognitionService } from '@/services/faceRecognitionService';
import { storageService } from '@/services/storageService';
import { format, differenceInSeconds, startOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaceRegistrationDialog } from '@/components/employees/FaceRegistrationDialog';
import { compressImage } from '@/utils/imageCompression';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isFieldWorker, isCorporateRole } from '@/utils/permissionHelpers';

const formatCPF = (cpf: string | null) => {
    if (!cpf) return '---';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return clean;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

export default function TimeClock() {
    const { user, profile } = useAuth();
    const isWorker = isFieldWorker(profile?.role);
    const workerEmployeeId = profile?.employeeId;
    const { teams } = useTeams();
    const { employees } = useEmployees();
    const { createRecord } = useTimeRecords();
    const [selectedTeam, setSelectedTeam] = React.useState('');
    const [selectedEmployee, setSelectedEmployee] = React.useState('');
    const [recordType, setRecordType] = React.useState<'entry' | 'exit'>('entry');
    const [photoData, setPhotoData] = React.useState<string | null>(null);
    const [isCapturing, setIsCapturing] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [cameraError, setCameraError] = React.useState<string | null>(null);
    const [currentTime, setCurrentTime] = React.useState(new Date());
    const [cameras, setCameras] = React.useState<MediaDeviceInfo[]>([]);
    const [selectedCameraId, setSelectedCameraId] = React.useState<string>('');
    const [stream, setStream] = React.useState<MediaStream | null>(null);
    const [faceMatchDistance, setFaceMatchDistance] = React.useState<number | null>(null);
    const [view, setView] = React.useState<'home' | 'capturing' | 'permissions'>('home');
    const [activeTab, setActiveTab] = React.useState<'ponto' | 'checkin' | 'historico'>('ponto');
    const [stabilityRef, setStabilityRef] = React.useState(0);
    const [lastLoc, setLastLoc] = React.useState<any>(null);
    const [dailyRecords, setDailyRecords] = React.useState<any[]>([]);
    const [countdown, setCountdown] = React.useState(30);
    const [isManualMode, setIsManualMode] = React.useState(false);
    const [manualCpf, setManualCpf] = React.useState('');

    // Estados para validação de biometria e localização
    const [showBiometryModal, setShowBiometryModal] = React.useState(false);
    const [showFaceRegistration, setShowFaceRegistration] = React.useState(false);
    const [pendingRecordType, setPendingRecordType] = React.useState<'entry' | 'exit'>('entry');
    const [showLocationWarning, setShowLocationWarning] = React.useState(false);
    const [employeeSearch, setEmployeeSearch] = React.useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = React.useState(false);

    // Auto-switch to manual mode when countdown hits 0
    React.useEffect(() => {
        if (countdown === 0 && view === 'capturing' && !isManualMode) {
            setIsManualMode(true);
        }
    }, [countdown, view, isManualMode]);

    const { records: allRecords } = useTimeRecords();
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const lastDetectionTimeRef = React.useRef<number>(0);
    const { toast } = useToast();

    const activeEmployees = employees.filter(e => e.isActive);

    // Listar câmeras disponíveis
    React.useEffect(() => {
        const getCameras = async () => {
            try {
                // Solicita permissão e para IMEDIATAMENTE para liberar a câmera
                const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
                initialStream.getTracks().forEach(track => track.stop());

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setCameras(videoDevices);
                if (videoDevices.length > 0) {
                    setSelectedCameraId(videoDevices[0].deviceId);
                }
            } catch (err) {
                console.error('Erro ao listar câmeras:', err);
                setCameraError("Permissão de câmera negada ou dispositivo não encontrado.");
            }
        };
        getCameras();
    }, []);

    React.useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);

        // Carrega localização do storage
        storageService.getItem('last_known_location').then(setLastLoc);

        return () => clearInterval(interval);
    }, []);

    // Pré-buscar localização assim que a tela de captura abrir
    React.useEffect(() => {
        if (view === 'capturing' && !isManualMode) {
            const fetchLoc = async () => {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 30000
                        })
                    );
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setLastLoc(coords);
                    await storageService.setItem('last_known_location', coords);
                } catch (err) {
                    console.warn('Falha no pre-fetch de localização:', err);
                }
            };
            fetchLoc();
        }
    }, [view, isManualMode]);

    // Filter today's records and calculate worked hours
    const workedData = React.useMemo(() => {
        const todayRecs = allRecords
            .filter(r => isToday(new Date(r.recordedAt)) && r.employeeId === (isWorker ? workerEmployeeId : selectedEmployee))
            .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

        setDailyRecords(todayRecs);

        let totalSeconds = 0;
        for (let i = 0; i < todayRecs.length; i += 2) {
            if (todayRecs[i] && todayRecs[i + 1]) {
                totalSeconds += differenceInSeconds(new Date(todayRecs[i + 1].recordedAt), new Date(todayRecs[i].recordedAt));
            } else if (todayRecs[i] && todayRecs[i].recordType === 'entry') {
                // Se só tem entrada e é hoje, soma até o agora
                totalSeconds += differenceInSeconds(new Date(), new Date(todayRecs[i].recordedAt));
            }
        }

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        return { h, m, recs: todayRecs };
    }, [allRecords, isWorker, workerEmployeeId, selectedEmployee]);

    // Face detection loop for auto-capture
    React.useEffect(() => {
        let frameId: number;

        const detectFace = async () => {
            const now = Date.now();

            // Throttle para evitar excesso de processamento e tornar menos "nervoso"
            if (view === 'capturing' && videoRef.current && videoRef.current.readyState === 4 && !isSaving && !photoData && !isManualMode && countdown > 0) {
                if (now - lastDetectionTimeRef.current >= 250) {
                    lastDetectionTimeRef.current = now;
                    try {
                        const emp = activeEmployees.find(e => e.id === selectedEmployee);
                        if (emp?.faceDescriptor) {
                            const descriptor = await faceRecognitionService.getDescriptor(videoRef.current);
                            if (descriptor) {
                                const savedDescriptor = new Float32Array(emp.faceDescriptor);
                                const distance = faceRecognitionService.compareFaces(descriptor, savedDescriptor);
                                setFaceMatchDistance(distance);

                                if (distance < 0.45) {
                                    const nextStability = stabilityRef + 1;
                                    setStabilityRef(nextStability);
                                    if (nextStability >= 5) {
                                        handleAutoCapture();
                                    }
                                } else {
                                    setStabilityRef(0);
                                }
                            } else {
                                setFaceMatchDistance(null);
                                setStabilityRef(0);
                            }
                        }
                    } catch (e) {
                        console.error("Auto-detect error", e);
                    }
                }
            }
            frameId = requestAnimationFrame(detectFace);
        };

        if (view === 'capturing') {
            detectFace();
        }

        return () => cancelAnimationFrame(frameId);
    }, [view, selectedEmployee, isSaving, photoData, stabilityRef, isManualMode]);

    // Countdown Effect
    React.useEffect(() => {
        let timer: number;
        if (view === 'capturing' && countdown > 0 && !isManualMode && !photoData && !isSaving) {
            timer = window.setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [view, countdown, isManualMode, photoData, isSaving]);


    const handleAutoCapture = async () => {
        if (!videoRef.current) return;

        // Capture frame in original resolution
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        }
        const originalData = canvas.toDataURL('image/jpeg', 0.95);

        // Compress to reduce file size (800px, 80% quality = ~70% smaller)
        const { dataUrl: compressedData, sizeKB } = await compressImage(originalData, 'light');
        console.log(`[TimeClock] Foto comprimida: ${sizeKB}KB`);

        setPhotoData(compressedData);

        // Trigger save with compressed image
        await handleRecord(compressedData);
    };

    // Auto-select employee if user is a worker
    React.useEffect(() => {
        if (isWorker && workerEmployeeId) {
            setSelectedEmployee(workerEmployeeId);
        }
    }, [isWorker, workerEmployeeId]);

    // Efeito para anexar o stream ao elemento video
    React.useEffect(() => {
        if (view === 'capturing' && stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [view, stream]);

    const startCamera = async (deviceId?: string) => {
        const id = deviceId || selectedCameraId;
        setCameraError(null);

        // Para o stream anterior se existir
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Câmera não suportada ou conexão insegura (precisa de HTTPS).');
            }

            // Ativa o estado de captura antes para renderizar o elemento <video>
            setIsCapturing(true);

            const constraints = {
                video: {
                    deviceId: id ? { exact: id } : undefined,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: id ? undefined : 'user',
                    frameRate: { ideal: 30, max: 60 }
                }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);

            // O useEffect acima cuidará de anexar o stream ao videoRef
        } catch (err) {
            console.error("Erro ao iniciar câmera:", err);
            const errorMsg = err instanceof Error ? err.message : 'Não foi possível acessar a câmera';
            setCameraError(errorMsg);
            setIsCapturing(false);
            toast({
                title: 'Erro de Câmera',
                description: 'Verifique as permissões ou use o upload de foto.',
                variant: 'destructive'
            });
        }
    };

    const stopCamera = React.useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCapturing(false);
    }, [stream]);

    /**
     * Função que valida biometria e localização antes de iniciar o registro de ponto
     */
    const handleTimeClockClick = async (type: 'entry' | 'exit') => {
        setPendingRecordType(type);

        // 1. Verificar permissões de câmera e localização
        const hasCam = await navigator.permissions?.query({ name: 'camera' as any }).then(q => q.state === 'granted').catch(() => false);
        const hasLoc = await navigator.permissions?.query({ name: 'geolocation' as any }).then(q => q.state === 'granted').catch(() => false);

        if (!hasCam || !hasLoc) {
            window.dispatchEvent(new CustomEvent('open-permissions-modal'));
            toast({ title: 'Permissões Necessárias', description: 'Por favor, conceda acesso à câmera e localização para continuar.', variant: 'destructive' });
            return;
        }

        // 2. Verificar se localização está ativa
        if (!lastLoc) {
            setShowLocationWarning(true);
            return;
        }

        // 3. Verificar se funcionário tem biometria facial cadastrada
        const emp = activeEmployees.find(e => e.id === selectedEmployee);
        if (!emp) {
            toast({ title: 'Erro', description: 'Selecione um funcionário primeiro.', variant: 'destructive' });
            return;
        }

        if (!emp.faceDescriptor || emp.faceDescriptor.length === 0) {
            // Mostrar modal perguntando se quer cadastrar biometria
            setShowBiometryModal(true);
            return;
        }

        // 4. Tudo OK - iniciar captura
        proceedWithCapture(type);
    };

    /**
     * Continua o fluxo de captura após validações
     */
    const proceedWithCapture = (type: 'entry' | 'exit') => {
        setRecordType(type);
        setCountdown(30);
        setIsManualMode(false);
        setManualCpf('');
        setView('capturing');
        startCamera();
    };

    const handleRecord = async (forcedPhoto?: string) => {
        const finalPhoto = forcedPhoto || photoData;

        if (!selectedEmployee || !finalPhoto) {
            toast({ title: 'Erro', description: 'Dados incompletos para o registro.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);

        try {
            const emp = activeEmployees.find(e => e.id === selectedEmployee);

            // Buscar geolocalização com maior robustez e persistência
            let latitude: number | null = null;
            let longitude: number | null = null;

            const getPos = (options: PositionOptions) =>
                new Promise<GeolocationPosition>((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, options)
                );

            try {
                // Tenta alta precisão (15s timeout)
                const position = await getPos({
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
            } catch (err) {
                console.warn('Alta precisão falhou no save, tentando modo rápido...', err);
                try {
                    // Fallback imediato para precisão normal (mais 10s timeout)
                    const position = await getPos({
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 250000 // Aceita cache de 5 min
                    });
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                } catch (fallbackErr) {
                    console.error('GPS falhou completamente:', fallbackErr);
                    // Tentar recuperar a ÚLTIMA localização salva no dispositivo
                    const lastKnown = await storageService.getItem<{ lat: number, lng: number }>('last_known_location');
                    if (lastKnown) {
                        latitude = lastKnown.lat;
                        longitude = lastKnown.lng;
                        console.info('Usando última localização conhecida salva.');
                    }
                }
            }

            // Se conseguimos uma localização válida, salvamos como "última conhecida" para o futuro
            if (latitude !== null && longitude !== null) {
                await storageService.setItem('last_known_location', { lat: latitude, lng: longitude });
                setLastLoc({ lat: latitude, lng: longitude });
            }

            const result = await createRecord({
                employeeId: selectedEmployee,
                teamId: selectedTeam || undefined,
                companyId: profile?.companyId,
                recordType,
                photoUrl: finalPhoto,
                latitude: latitude ?? undefined,
                longitude: longitude ?? undefined,
            });

            setStabilityRef(0);
            setFaceMatchDistance(null);

            // Aguarda 3 segundos para que o usuário veja a confirmação de sucesso
            await new Promise(resolve => setTimeout(resolve, 3000));

            setPhotoData(null);
            stopCamera();
            setView('home');
        } catch (e) {
            toast({ title: 'Erro no servidor', description: 'Não foi possível salvar o registro.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    // Render Sub-views
    const renderHome = () => (
        <div className="flex flex-col h-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Tabs */}
            <div className="flex bg-muted/40 p-1 rounded-2xl mb-8 border border-border/50">
                {['ponto', 'checkin', 'historico'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {tab === 'checkin' ? 'Check-in' : tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-8 pb-10">
                {activeTab === 'ponto' && (
                    <>
                        <div className="text-center space-y-2">
                            <h2 className="text-5xl font-black tracking-tighter text-foreground tabular-nums">
                                {format(currentTime, 'HH:mm:ss')}
                            </h2>
                            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
                                {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </p>
                        </div>

                        {/* Worked Hours Display */}
                        <div className="glass-card p-6 rounded-[2.5rem] bg-linear-to-br from-primary/10 to-transparent border-primary/10 shadow-glow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-primary/20 text-primary">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <Badge variant="outline" className="border-primary/20 text-primary font-bold">HOJE</Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Horas trabalhadas hoje</p>
                                <p className="text-3xl font-black tracking-tight">{workedData.h}h {workedData.m}m</p>
                            </div>
                        </div>

                        {/* Employee Selection (if admin) */}
                        {!isWorker && (
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Colaborador</Label>
                                <div className="relative">
                                    {!selectedEmployee && (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                <Input
                                                    type="text"
                                                    placeholder="Digite o nome, CPF ou matrícula..."
                                                    value={employeeSearch}
                                                    onChange={(e) => {
                                                        setEmployeeSearch(e.target.value);
                                                        setShowEmployeeDropdown(true);
                                                    }}
                                                    onFocus={() => setShowEmployeeDropdown(true)}
                                                    className="h-14 rounded-2xl industrial-input bg-card shadow-sm pl-12 pr-4"
                                                />
                                                {employeeSearch && (
                                                    <button
                                                        onClick={() => {
                                                            setEmployeeSearch('');
                                                        }}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Dropdown com resultados filtrados */}
                                            {showEmployeeDropdown && employeeSearch && (
                                                <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto">
                                                    {activeEmployees
                                                        .filter(e => {
                                                            const searchTerm = employeeSearch.toLowerCase().trim();
                                                            const searchDigits = searchTerm.replace(/\D/g, '');

                                                            const matchesName = e.fullName.toLowerCase().includes(searchTerm);
                                                            const matchesMat = e.registrationNumber.toLowerCase().includes(searchTerm);
                                                            const matchesCpf = searchDigits !== '' && e.cpf?.replace(/\D/g, '').includes(searchDigits);

                                                            return matchesName || matchesMat || matchesCpf;
                                                        })
                                                        .slice(0, 10)
                                                        .map(e => (
                                                            <button
                                                                key={e.id}
                                                                onClick={() => {
                                                                    setSelectedEmployee(e.id);
                                                                    setEmployeeSearch(e.fullName);
                                                                    setShowEmployeeDropdown(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-4 py-3 text-left hover:bg-primary/10 flex items-center justify-between transition-colors",
                                                                    selectedEmployee === e.id && "bg-primary/20"
                                                                )}
                                                            >
                                                                <div className="flex flex-col gap-0.5">
                                                                    <p className="font-bold text-sm leading-tight text-foreground">{e.fullName}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted/30 px-1.5 py-0.5 rounded">CPF: {formatCPF(e.cpf)}</span>
                                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted/30 px-1.5 py-0.5 rounded">Mat: #{e.registrationNumber}</span>
                                                                    </div>
                                                                </div>
                                                                {selectedEmployee === e.id && (
                                                                    <Check className="h-5 w-5 text-primary" />
                                                                )}
                                                            </button>
                                                        ))
                                                    }
                                                    {activeEmployees.filter(e => {
                                                        const searchTerm = employeeSearch.toLowerCase().trim();
                                                        const searchDigits = searchTerm.replace(/\D/g, '');
                                                        return e.fullName.toLowerCase().includes(searchTerm) ||
                                                            e.registrationNumber.toLowerCase().includes(searchTerm) ||
                                                            (searchDigits !== '' && e.cpf?.replace(/\D/g, '').includes(searchDigits));
                                                    }).length === 0 && (
                                                            <div className="px-4 py-6 text-center text-muted-foreground">
                                                                <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                                <p className="text-sm">Nenhum colaborador encontrado</p>
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Mostrar colaborador selecionado */}
                                {selectedEmployee && !showEmployeeDropdown && (
                                    <div
                                        onClick={() => {
                                            setSelectedEmployee('');
                                            setEmployeeSearch('');
                                            setShowEmployeeDropdown(true);
                                        }}
                                        className="flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/15 transition-all active:scale-[0.98] group relative overflow-hidden"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                            <User className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-base leading-tight">{activeEmployees.find(e => e.id === selectedEmployee)?.fullName}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">CPF: {formatCPF(activeEmployees.find(e => e.id === selectedEmployee)?.cpf || null)}</span>
                                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mat: #{activeEmployees.find(e => e.id === selectedEmployee)?.registrationNumber}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/20 group-hover:bg-cyan-500/10 transition-all duration-300">
                                            <Check className="h-6 w-6 text-emerald-500 group-hover:hidden drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <Search className="h-6 w-6 text-cyan-400 hidden group-hover:block animate-in zoom-in-50 duration-200 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Main Action Button */}
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <Button
                                    onClick={() => handleTimeClockClick('entry')}
                                    className="h-24 flex-1 rounded-4xl flex-col gap-2 font-black text-lg bg-success text-white hover:bg-success/90 shadow-glow transition-transform active:scale-95"
                                >
                                    <LogIn className="w-8 h-8" />
                                    ENTRADA
                                </Button>
                                <Button
                                    onClick={() => handleTimeClockClick('exit')}
                                    className="h-24 flex-1 rounded-4xl flex-col gap-2 font-black text-lg bg-destructive text-white hover:bg-destructive/90 shadow-glow transition-transform active:scale-95"
                                >
                                    <LogOut className="w-8 h-8" />
                                    SAÍDA
                                </Button>
                            </div>
                        </div>

                        {/* Location Info */}
                        <div className="flex items-start gap-3 p-5 rounded-4xl bg-muted/30 border border-white/5">
                            <MapPin className="w-5 h-5 text-primary mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sua Localização</p>
                                <p className="text-sm font-bold text-foreground leading-snug">
                                    {lastLoc ? `${lastLoc.lat.toFixed(4)}, ${lastLoc.lng.toFixed(4)} (Capturado)` : 'Buscando sinal de satélite...'}
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'historico' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black uppercase tracking-widest text-xs ml-1">Registros de Hoje</h3>
                            <Button variant="ghost" size="sm" className="text-xs h-8">Ver todos</Button>
                        </div>
                        {dailyRecords.length === 0 ? (
                            <div className="text-center py-12 opacity-30">
                                <History className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-sm font-bold">Nenhum registro ainda hoje</p>
                            </div>
                        ) : (
                            dailyRecords.map((r, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 glass-card rounded-2xl border-white/5">
                                    <div className={`p-3 rounded-xl ${r.recordType === 'entry' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                        {r.recordType === 'entry' ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm tracking-tight">{r.recordType === 'entry' ? 'Entrada' : 'Saída'}</p>
                                        <p className="text-[10px] text-muted-foreground font-black uppercase">{format(new Date(r.recordedAt), 'HH:mm:ss')}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-30" />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    const renderCapturing = () => (
        <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-300 flex items-center justify-center p-0 lg:p-12 overflow-hidden">
            {/* Main Module Container - Restricted aspect ratio on desktop */}
            <div className="relative w-full h-full max-w-lg aspect-9/16 bg-background overflow-hidden shadow-2xl transition-transform duration-700">
                {/* Video Feed */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />

                {/* Scanline Effect */}
                {!isSaving && !photoData && (
                    <div className="absolute inset-x-0 h-20 w-full bg-linear-to-b from-transparent via-primary/20 to-transparent animate-scan-slow opacity-50 z-10 pointer-events-none" />
                )}

                {/* UI Overlay - Contained within video aspect ratio */}
                <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
                    {/* Header: Status messages stuck to top with soft background - Full Width */}
                    <div className="w-full flex flex-col items-center">
                        <div className="w-full bg-background/60 backdrop-blur-md py-6 border-b border-border/50 text-center space-y-1 pointer-events-none animate-in slide-in-from-top duration-500">
                            {(!isManualMode || isSaving) && countdown > 0 && (
                                <>
                                    <p className="text-foreground text-3xl font-black tracking-tighter animate-pulse drop-shadow-sm">
                                        {isSaving ? 'REGISTRANDO...' : 'AGUARDE...'}
                                    </p>
                                    <p className="text-foreground/80 text-[11px] font-black uppercase tracking-[0.2em] leading-none">
                                        {isSaving ? 'Sua foto foi capturada' : 'estamos reconhecendo seu rosto'}
                                    </p>
                                </>
                            )}

                            {!isSaving && !photoData && !isManualMode && countdown > 0 && (
                                <p className="text-foreground text-[44px] font-black mt-2 drop-shadow-sm">
                                    {countdown}s
                                </p>
                            )}
                        </div>

                        {/* Close button - adjusted to be below or side of status */}
                        <div className="absolute top-6 right-6">
                            <button
                                onClick={() => { stopCamera(); setView('home'); }}
                                className="w-14 h-14 rounded-full bg-background/60 backdrop-blur-xl flex items-center justify-center pointer-events-auto border border-border/50 text-foreground hover:bg-background/80 transition-colors shadow-lg"
                            >
                                <X className="w-7 h-7 stroke-3" />
                            </button>
                        </div>
                    </div>

                    {/* Espaçador para compensar o conteúdo do topo */}
                    <div className="h-20" />

                    {/* Middle: Face Frame */}
                    <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
                        {!isManualMode && countdown > 0 && (
                            <div className="relative w-full aspect-square border-2 rounded-[3rem] transition-colors duration-500"
                                style={{ borderColor: faceMatchDistance === null ? 'rgba(255,255,255,0.2)' : faceMatchDistance < 0.5 ? 'var(--success)' : 'var(--destructive)' }}>

                                {/* Corner accents */}
                                <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 rounded-tl-[3rem] border-inherit" />
                                <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 rounded-tr-[3rem] border-inherit" />
                                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 rounded-bl-[3rem] border-inherit" />
                                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 rounded-br-[3rem] border-inherit" />

                                {/* Progress indicator removed from here to be moved to footer */}
                            </div>
                        )}
                    </div>

                    {/* Footer: Manual Action / Expiration Message */}
                    <div className="p-8 pb-12 pointer-events-auto mt-auto">
                        {/* Progress indicator (centered at the bottom) */}
                        {!isManualMode && faceMatchDistance !== null && faceMatchDistance < 0.5 && !isSaving && !photoData && (
                            <div className="flex justify-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="px-6 py-2.5 rounded-full bg-success text-success-foreground font-black text-[10px] tracking-[0.2em] shadow-lg flex items-center gap-2.5 whitespace-nowrap border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-current animate-ping" />
                                    RECONHECIDO {Math.min(100, Math.round((stabilityRef / 5) * 100))}%
                                </div>
                            </div>
                        )}

                        {/* Location Status Indicator */}
                        <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                            <div className={cn(
                                "px-3 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 transition-all duration-300",
                                lastLoc
                                    ? "bg-success/20 border-success/30 text-success"
                                    : "bg-muted/50 border-border text-muted-foreground"
                            )}>
                                <MapPin className={cn("w-3.5 h-3.5", !lastLoc && "animate-pulse")} />
                                <span className="text-[10px] font-bold tracking-wider uppercase">
                                    {lastLoc ? 'Localização OK' : 'Buscando GPS...'}
                                </span>
                            </div>
                        </div>

                        {isManualMode && !isSaving && !photoData && (
                            <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="space-y-4 text-center">
                                    <Label className="block text-[11px] font-black uppercase tracking-[0.4em] text-foreground opacity-90">
                                        Digite seu CPF
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            value={manualCpf}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                setManualCpf(val);
                                            }}
                                            className="h-20 rounded-[2.5rem] bg-background/60 border-border text-foreground text-center text-4xl font-black tracking-[0.2em] backdrop-blur-xl focus:ring-primary/50 shadow-inner"
                                            placeholder="000.000.000-00"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <Button
                                        onClick={async () => {
                                            const emp = activeEmployees.find(e => e.id === selectedEmployee);
                                            if (!emp) return;

                                            // Compara o CPF digitado (apenas números) com o CPF do funcionário (limpo)
                                            if (manualCpf === emp.cpf?.replace(/\D/g, '')) {
                                                await handleAutoCapture();
                                            } else {
                                                toast({
                                                    title: 'CPF Incorreto',
                                                    description: 'O CPF digitado não corresponde ao colaborador selecionado.',
                                                    variant: 'destructive'
                                                });
                                            }
                                        }}
                                        disabled={manualCpf.length < 11}
                                        className="w-full h-24 rounded-[3rem] bg-primary hover:opacity-90 text-primary-foreground font-black uppercase tracking-widest text-2xl shadow-glow active:scale-95 border-none transition-all"
                                    >
                                        Bater ponto com CPF
                                    </Button>

                                    {countdown === 0 && (
                                        <p className="text-muted-foreground text-[10px] uppercase font-black tracking-[0.3em] text-center">
                                            Tempo de reconhecimento facial esgotado
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Flash/Result Layers (Highest Z) */}
            {isSaving && (
                <div className="absolute inset-0 bg-white animate-flash z-40" />
            )}

            {photoData && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="bg-success p-8 rounded-full shadow-glow animate-scale-in mb-6">
                        <CheckCircle2 className="w-16 h-16 text-success-foreground" />
                    </div>
                    <div className="text-center space-y-2 animate-in slide-in-from-bottom-4 delay-200 duration-500">
                        <p className="text-foreground text-3xl font-black tracking-tighter">SUCESSO!</p>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Ponto registrado com êxito</p>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-transparent">
            {view === 'home' && renderHome()}
            {view === 'capturing' && renderCapturing()}

            {/* Hidden Canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Modal: Biometria não cadastrada */}
            <AlertDialog open={showBiometryModal} onOpenChange={setShowBiometryModal}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <ScanFace className="w-8 h-8 text-amber-500" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl">
                            Biometria Facial Não Cadastrada
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Para registrar o ponto, é necessário ter a biometria facial cadastrada.
                            Deseja cadastrar sua biometria agora?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel
                            className="flex-1"
                            onClick={() => {
                                setShowBiometryModal(false);
                                toast({
                                    title: 'Registro Bloqueado',
                                    description: 'É necessário cadastrar a biometria facial para registrar ponto.',
                                    variant: 'destructive'
                                });
                            }}
                        >
                            Não, cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="flex-1 bg-primary"
                            onClick={() => {
                                setShowBiometryModal(false);
                                setShowFaceRegistration(true);
                            }}
                        >
                            Sim, cadastrar agora
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal: Localização não ativa */}
            <AlertDialog open={showLocationWarning} onOpenChange={setShowLocationWarning}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-center text-xl">
                            Localização Não Disponível
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                            Aguarde a localização GPS ser capturada antes de registrar o ponto.
                            Verifique se o GPS está ativado no seu dispositivo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            className="w-full"
                            onClick={() => setShowLocationWarning(false)}
                        >
                            Entendido
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog: Cadastro de Biometria Facial */}
            <FaceRegistrationDialog
                employee={activeEmployees.find(e => e.id === selectedEmployee) || null}
                open={showFaceRegistration}
                onOpenChange={(open) => {
                    setShowFaceRegistration(open);
                    // Após fechar o cadastro, verificar se a biometria foi cadastrada
                    if (!open) {
                        const emp = activeEmployees.find(e => e.id === selectedEmployee);
                        if (emp?.faceDescriptor && emp.faceDescriptor.length > 0) {
                            // Biometria cadastrada com sucesso, continuar para registro
                            toast({
                                title: 'Biometria Cadastrada!',
                                description: 'Agora você pode registrar o ponto.'
                            });
                            proceedWithCapture(pendingRecordType);
                        }
                    }
                }}
            />
        </div>
    );
}
