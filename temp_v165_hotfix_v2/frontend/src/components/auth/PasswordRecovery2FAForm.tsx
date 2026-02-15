import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ShieldCheck, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { localApi as db } from '@/integrations/orion/client';
import { cn } from '@/lib/utils';

interface PasswordRecovery2FAFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

/**
 * Formulário de recuperação de senha via 2FA (MFA obrigatório)
 * Apenas usuários com MFA habilitado podem usar este método
 */
interface MfaStatusResponse {
    found: boolean;
    hasMfa: boolean;
    hasLogin?: boolean;
}

interface RecoverPasswordResponse {
    success: boolean;
    error?: string;
}

export function PasswordRecovery2FAForm({ onSuccess, onCancel }: PasswordRecovery2FAFormProps) {
    const [step, setStep] = useState<'email' | 'verify' | 'newPassword' | 'success'>('email');
    const [email, setEmail] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    // Step 1: Verificar se o email tem MFA habilitado
    const handleCheckEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await db.post<MfaStatusResponse>('/auth/check-mfa-status', { identifier: email });
            const data = response.data;

            if (!data.found) {
                setError('E-mail não encontrado no sistema.');
                return;
            }

            if (!data.hasMfa) {
                setError('Este e-mail não possui MFA habilitado. Use a opção "Solicitar redefinição" para contatar um administrador.');
                return;
            }

            setStep('verify');
        } catch {
            setError('Erro ao verificar e-mail. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verificar código MFA
    const handleVerifyMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mfaCode.length !== 6) return;

        setIsLoading(true);
        setError(null);

        try {
            // Simular verificação - a validação real será feita no backend ao resetar a senha
            // Aqui apenas avançamos para o próximo step
            setStep('newPassword');
        } catch {
            setError('Código MFA inválido.');
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Definir nova senha
    const handleSetNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Validações
        if (newPassword.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres.');
            setIsLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await db.post<RecoverPasswordResponse>('/auth/recover-password-2fa', {
                email,
                mfaCode,
                newPassword
            });

            if (response.data.success) {
                setStep('success');
                toast({
                    title: 'Senha alterada com sucesso!',
                    description: 'Você já pode fazer login com sua nova senha.',
                });
            } else {
                setError(response.data.error || 'Código MFA inválido ou expirado.');
            }
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { error?: string } } };
            setError(axiosError?.response?.data?.error || 'Erro ao alterar senha. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
    const passwordValid = newPassword.length >= 6;

    return (
        <div className="space-y-4 pt-4">
            {/* Step 1: E-mail */}
            {step === 'email' && (
                <form onSubmit={handleCheckEmail} className="space-y-4">
                    <div className="text-center mb-4">
                        <ShieldCheck className="w-12 h-12 mx-auto text-primary mb-2" />
                        <h3 className="font-semibold text-lg">Recuperação via 2FA</h3>
                        <p className="text-sm text-muted-foreground">
                            Disponível apenas para contas com autenticação em dois fatores habilitada.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recovery-email" className="flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            E-mail da Conta
                        </Label>
                        <Input
                            id="recovery-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(null); }}
                            required
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full gradient-primary"
                        disabled={isLoading || !email}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Verificar Conta
                    </Button>

                    {onCancel && (
                        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
                            Cancelar
                        </Button>
                    )}
                </form>
            )}

            {/* Step 2: Código MFA */}
            {step === 'verify' && (
                <form onSubmit={handleVerifyMfa} className="space-y-4">
                    <div className="text-center mb-4">
                        <ShieldCheck className="w-12 h-12 mx-auto text-green-500 mb-2" />
                        <h3 className="font-semibold text-lg">Código de Verificação</h3>
                        <p className="text-sm text-muted-foreground">
                            Insira o código de 6 dígitos do seu aplicativo autenticador.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="mfa-code" className="text-center block">Código MFA</Label>
                        <Input
                            id="mfa-code"
                            type="text"
                            placeholder="000 000"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                            required
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                            <p className="text-sm text-destructive text-center">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full gradient-primary"
                        disabled={isLoading || mfaCode.length !== 6}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Verificar Código
                    </Button>

                    <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('email')}>
                        Voltar
                    </Button>
                </form>
            )}

            {/* Step 3: Nova Senha */}
            {step === 'newPassword' && (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="text-center mb-4">
                        <Lock className="w-12 h-12 mx-auto text-primary mb-2" />
                        <h3 className="font-semibold text-lg">Nova Senha</h3>
                        <p className="text-sm text-muted-foreground">
                            Defina uma nova senha para sua conta.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new-password">Nova Senha (mínimo 6 caracteres)</Label>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                                className="pr-10"
                                autoFocus
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {newPassword.length > 0 && (
                            <div className={cn(
                                "text-xs flex items-center gap-1",
                                passwordValid ? "text-green-500" : "text-amber-500"
                            )}>
                                {passwordValid ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {passwordValid ? "Senha válida" : "Mínimo 6 caracteres"}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirmar Senha</Label>
                        <Input
                            id="confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        {confirmPassword.length > 0 && (
                            <div className={cn(
                                "text-xs flex items-center gap-1",
                                passwordsMatch ? "text-green-500" : "text-destructive"
                            )}>
                                {passwordsMatch ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                {passwordsMatch ? "Senhas coincidem" : "Senhas não coincidem"}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                            <p className="text-sm text-destructive text-center">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full gradient-primary"
                        disabled={isLoading || !passwordValid || !passwordsMatch}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Alterar Senha
                    </Button>

                    <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('verify')}>
                        Voltar
                    </Button>
                </form>
            )}

            {/* Step 4: Sucesso */}
            {step === 'success' && (
                <div className="text-center space-y-4 py-6">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                    <h3 className="font-bold text-xl text-green-500">Senha Alterada!</h3>
                    <p className="text-muted-foreground">
                        Sua senha foi alterada com sucesso. Você já pode fazer login.
                    </p>
                    <Button
                        className="w-full gradient-primary"
                        onClick={() => onSuccess?.()}
                    >
                        Fazer Login
                    </Button>
                </div>
            )}
        </div>
    );
}
