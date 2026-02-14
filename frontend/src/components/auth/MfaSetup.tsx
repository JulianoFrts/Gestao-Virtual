import React, { useState, useEffect } from 'react';
import { generateSecret, TOTP, generateURI, verify } from 'otplib';

import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/database';
import { Loader2, ShieldCheck, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

export function MfaSetup({ onComplete }: { onComplete?: () => void }) {
    const { profile, user, enableMfa } = useAuth();
    const { toast } = useToast();
    const [step, setStep] = useState<'generate' | 'verify' | 'completed'>(profile?.mfaEnabled ? 'completed' : 'generate');
    const [secret, setSecret] = useState('');
    const [otpUrl, setOtpUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 1. Gerar Segredo Initial
    const handleGenerateSecret = () => {
        try {
            const newSecret = generateSecret();
            const appName = 'GESTÃO VIRTUAL';
            const accountName = user?.email || profile?.fullName || 'user';

            const url = generateURI({
                issuer: appName,
                label: accountName,
                secret: newSecret
            });

            setSecret(newSecret);
            setOtpUrl(url);
            setStep('verify');
        } catch (error: any) {
            console.error('MFA Error:', error);
        }
    };

    // 2. Verificar o primeiro código
    const handleVerifyAndEnable = async () => {
        if (verificationCode.length !== 6) return;

        setIsLoading(true);
        try {
            const isValid = await verify({
                token: verificationCode,
                secret: secret
            });

            console.log('MFA Setup Verification:', {
                codeReceived: verificationCode,
                isValid: isValid.valid,
                secretUsed: secret.substring(0, 4) + '...'
            });

            if (!isValid.valid) {
                toast({
                    title: 'Código Inválido',
                    description: 'O código inserido não coincide com o QR Code.',
                    variant: 'destructive'
                });
                return;
            }

            // Salvar no Banco via AuthContext
            const result = await enableMfa(secret);

            if (!result.success) throw new Error(result.error);

            toast({
                title: 'MFA Ativado!',
                description: 'Sua conta agora está protegida com autenticação de dois fatores.',
            });
            setStep('completed');
            if (onComplete) onComplete();
        } catch (error: any) {
            toast({
                title: 'Erro ao ativar MFA',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(secret);
        toast({ description: 'Segredo copiado para a área de transferência.' });
    };

    if (step === 'completed') {
        return (
            <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-success" />
                </div>
                <h3 className="text-xl font-bold">MFA Ativado</h3>
                <p className="text-muted-foreground">Sua conta está blindada. Você precisará do Microsoft Authenticator para logar.</p>
                <Button variant="outline" className="w-full" onClick={() => setStep('generate')}>
                    Reconfigurar (Gerar Novo)
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <p className="text-sm font-medium">Eleve a segurança da sua conta para o nível industrial.</p>
            </div>

            {step === 'generate' ? (
                <div className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        Clique abaixo para gerar seu segredo único e configurar o protoloco TOTP.
                    </p>
                    <Button onClick={handleGenerateSecret} className="w-full gradient-primary">
                        Começar Configuração
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-white rounded-xl shadow-inner inline-block">
                            <QRCodeSVG value={otpUrl} size={200} />
                        </div>
                        <p className="text-xs text-muted-foreground text-center max-w-[250px]">
                            Escaneie este QR Code usando o Microsoft Authenticator ou Google Authenticator.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="p-3 bg-muted/50 rounded-lg border border-dashed border-white/20">
                            <Label className="text-[10px] uppercase text-muted-foreground mb-1 block">Segredo Manual</Label>
                            <div className="flex items-center justify-between">
                                <code className="text-xs font-mono">{secret}</code>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyToClipboard}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="verification">Digite o código de 6 dígitos para validar</Label>
                            <Input
                                id="verification"
                                placeholder="000 000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                            />
                        </div>

                        <Button
                            onClick={handleVerifyAndEnable}
                            className="w-full h-12 text-lg font-bold"
                            disabled={verificationCode.length !== 6 || isLoading}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Ativar MFA'}
                        </Button>

                        <div className="flex items-start gap-2 text-[11px] text-amber-500 bg-amber-500/5 p-2 rounded border border-amber-500/20">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Não compartilhe seu segredo com ninguém. Guarde-o em local seguro.</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

