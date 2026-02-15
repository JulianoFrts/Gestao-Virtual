import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from "@/integrations/database";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  QrCode,
  CheckCircle2,
  XCircle,
  Camera,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface QRScannerProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export function QRScanner({ onSuccess, onClose }: QRScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCameras, setIsLoadingCameras] = useState(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    [],
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  const startScanning = async (overrideCameraId?: string) => {
    const cameraId = overrideCameraId || selectedCameraId;
    if (!cameraId || !isMountedRef.current) return;

    setError(null);
    setIsScanning(true);

    try {
      // Pequeno delay para garantir que o div #qr-reader foi renderizado
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!isMountedRef.current) return;

      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        cameraId,
        config,
        onScanSuccess,
        () => {}, // Ignore errors
      );
    } catch (err) {
      console.error("Failed to start scanner:", err);
      if (isMountedRef.current) {
        setError("Não foi possível iniciar o scanner nesta câmera.");
        setIsScanning(false);
      }
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      }
    } catch (err) {
      console.debug("Error during scanner shutdown:", err);
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
        scannerRef.current = null;
      }
    }
  };

  // Initialize/Request cameras
  useEffect(() => {
    isMountedRef.current = true;

    const initCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const firstCameraId = devices[0].id;
          if (isMountedRef.current) {
            setCameras(
              devices.map((d) => ({
                id: d.id,
                label: d.label || `Câmera ${devices.indexOf(d) + 1}`,
              })),
            );
            setSelectedCameraId(firstCameraId);

            // Inicia automaticamente após um pequeno delay para garantir que o elemento DOM está pronto
            initTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                startScanning(firstCameraId);
              }
            }, 500);
          }
        } else {
          if (isMountedRef.current)
            setError("Nenhuma câmera encontrada no dispositivo.");
        }
      } catch (err) {
        console.error("Error getting cameras:", err);
        if (isMountedRef.current)
          setError(
            "Permissão de câmera negada ou erro ao acessar dispositivos.",
          );
      } finally {
        if (isMountedRef.current) setIsLoadingCameras(false);
      }
    };

    initCameras();

    return () => {
      isMountedRef.current = false;
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
        try {
          scanner.clear();
        } catch {
          /* Expected to fail on cleanup */
        }
      }
      scannerRef.current = null;
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing || success || !isMountedRef.current) return;

    if (!decodedText.startsWith("ttpro_link_")) {
      toast({
        title: "QR Code Inválido",
        description: "Este código não pertence ao GESTÃO VIRTUAL.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await db.auth.getSession();

      if (!session) {
        if (isMountedRef.current)
          setError("Sessão não encontrada. Faça login novamente.");
        return;
      }

      const { error: updateError } = await (db as any)
        .from("qr_sessions")
        .update({ status: "approved", auth_payload: session })
        .eq("session_token", decodedText)
        .eq("status", "pending");

      if (updateError) {
        if (isMountedRef.current)
          setError("O link expirou ou já foi utilizado.");
      } else {
        // PRIMEIRO para o scanner para limpar o DOM
        await stopScanning();

        if (isMountedRef.current) {
          setTimeout(() => {
            if (isMountedRef.current) {
              setSuccess(true);
              toast({
                title: "Acesso aprovado!",
                description: "Dispositivo pareado com sucesso.",
              });
              if (onSuccess) setTimeout(onSuccess, 1500);
            }
          }, 300);
        }
      }
    } catch (err) {
      if (isMountedRef.current)
        setError("Ocorreu um erro ao processar a autorização.");
    } finally {
      if (isMountedRef.current) setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 w-full">
      {/* Success View */}
      {success && (
        <div className="flex flex-col items-center justify-center py-16 px-4 animate-scale-in text-center w-full">
          <div className="w-24 h-24 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)] border border-green-500/30">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <h3 className="text-2xl font-bold mb-2">Login Aprovado!</h3>
          <p className="text-muted-foreground">
            O computador foi conectado com segurança.
          </p>
        </div>
      )}

      {/* Scanner View (always in DOM but hidden on success) */}
      <div className={success ? "hidden" : "block"}>
        <div className="flex flex-col gap-6">
          <div className="relative group max-w-[350px] mx-auto w-full">
            {/* Permanent Scanner Container */}
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-black/40 glass-scanner shadow-2xl">
              {/* Conteúdo do Scanner (Gerenciado pela biblioteca) */}
              <div id="qr-reader" className="w-full h-full" />

              {/* Overlays (Gerenciados pelo React) */}
              {!isScanning && !success && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-900/50 backdrop-blur-sm z-10 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-white/80">
                    Câmera pronta
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Selecione a câmera e inicie o escaneamento
                  </p>
                </div>
              )}

              {isScanning && (
                <>
                  <div className="absolute inset-0 pointer-events-none z-10 qr-scanner-overlay" />
                  <div className="absolute top-[calc(50%-125px)] left-[calc(50%-125px)] w-[250px] h-[250px] border-2 border-primary/50 rounded-2xl pointer-events-none z-20 overflow-hidden">
                    <div className="w-full h-[3px] bg-primary shadow-[0_0_15px_#3b82f6] animate-scan" />
                  </div>
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30">
                    <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Buscando QR Code...
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-xl pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-xl pointer-events-none" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Fonte de Captura
              </Label>
              {cameras.length > 1 && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {cameras.length} dispositivos
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Select
                value={selectedCameraId}
                onValueChange={(val) => {
                  setSelectedCameraId(val);
                  if (isScanning) {
                    stopScanning().then(() => startScanning(val));
                  }
                }}
                disabled={isLoadingCameras || isProcessing}
              >
                <SelectTrigger className="glass-card border-white/5 h-12 flex-1 text-white/80">
                  {isLoadingCameras ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Buscando...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Escolha a câmera" />
                  )}
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {cameras.map((cam) => (
                    <SelectItem key={cam.id} value={cam.id} className="text-sm">
                      {cam.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {cameras.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    const currentIndex = cameras.findIndex(
                      (c) => c.id === selectedCameraId,
                    );
                    const nextIndex = (currentIndex + 1) % cameras.length;
                    const nextId = cameras[nextIndex].id;
                    setSelectedCameraId(nextId);
                    if (isScanning) {
                      await stopScanning();
                      await startScanning(nextId);
                    }
                  }}
                  className="h-12 w-12 glass-card border-white/5 text-primary hover:bg-primary/10"
                  disabled={isLoadingCameras || isProcessing}
                  title="Alternar Câmera"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isScanning ? "animate-spin-slow" : ""}`}
                  />
                </Button>
              )}

              {!isScanning ? (
                <Button
                  onClick={() => startScanning()}
                  className="h-12 gradient-primary text-white shadow-glow px-6 font-bold"
                  disabled={
                    !selectedCameraId || isLoadingCameras || isProcessing
                  }
                >
                  Iniciar
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={stopScanning}
                  className="h-12 px-6 bg-destructive/80 hover:bg-destructive shadow-lg shadow-destructive/20 font-bold"
                  disabled={!isScanning || isProcessing}
                >
                  Parar
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3 animate-fade-in">
              <XCircle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive font-medium leading-tight">
                {error}
              </span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-3 py-2 text-primary animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Aguardando...
              </span>
            </div>
          )}

          {!isScanning && !error && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/30 border border-white/5">
              <QrCode className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Aponte a câmera para o QR Code gerado no desktop.
              </p>
            </div>
          )}
        </div>
      </div>

      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="w-full text-muted-foreground hover:text-foreground transition-colors mt-2"
        >
          Cancelar Operação
        </Button>
      )}
    </div>
  );
}


