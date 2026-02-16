import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, ArrowLeft, Loader2, QrCode, Smartphone, ShieldCheck, WifiOff, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { verify } from 'otplib';
import { PasswordResetRequestForm } from '@/components/auth/PasswordResetRequestForm';
import { PasswordRecovery2FAForm } from '@/components/auth/PasswordRecovery2FAForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type AuthMode = 'login' | 'qr';

interface OfflineAccountInfo {
  identifier: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
}

export default function Auth() {

  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingProfile, setPendingProfile] = useState<{ mfaSecret: string } | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineAccount, setOfflineAccount] = useState<OfflineAccountInfo | null>(null);

  const { login, loginOffline, getLastOfflineAccount, setMfaVerified } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check offline status and last account
  useEffect(() => {

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for last offline account
    getLastOfflineAccount().then(account => {
      if (account) {
        setOfflineAccount(account);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [getLastOfflineAccount]);

  useEffect(() => {
    if (mode === 'qr') {
      const token = `ttpro_link_${Math.random().toString(36).substring(7)}_${Date.now()}`;
      setQrToken(token);
      // QR Login logic was removed due to db real-time dependency.
      // It will be reimplemented using local API polling or WebSockets in the future.
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsFirstLogin(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
        if (result.mfaRequired && result.profile) {
          setPendingProfile(result.profile as any);
          setShowMfaChallenge(true);
          toast({
            title: 'MFA Requerido',
            description: 'Insira o código do seu autenticador.',
          });
          return;
        }

        // If no MFA required, consider it verified immediately
        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo ao GESTÃO VIRTUAL',
        });
        navigate('/dashboard');
        setMfaVerified(true);

      } else {
        toast({
          title: 'Erro no login',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginOffline();
      if (result.success) {
        toast({
          title: 'Login Offline Realizado!',
          description: 'Você está acessando em modo offline.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Erro no login offline',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6 || !pendingProfile) return;
    setIsLoading(true);
    try {
      const isValid = await verify({
        token: mfaCode,
        secret: pendingProfile.mfaSecret
      });

      console.log('MFA Login Verification:', {
        codeReceived: mfaCode,
        isValid: isValid.valid,
        secretUsed: pendingProfile.mfaSecret.substring(0, 4) + '...'
      });

      if (isValid.valid) {
        setMfaVerified(true);
        toast({
          title: 'Segurança validada!',
          description: 'Acesso concedido.',
        });
        navigate('/dashboard');
      } else {
        toast({
          title: 'Código incorreto',
          description: 'O código TOTP inserido é inválido ou expirou.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen dark theme-industrial gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in flex flex-col items-center">
        <div className="text-center mb-0 flex flex-col items-center">
          <img
            src="/gestao_virtual_premium_logo.png"
            alt="GESTÃO VIRTUAL Logo"
            className="w-[450px] md:w-[500px] h-auto drop-shadow-[0_0_25px_rgba(0,212,255,0.3)] animate-in fade-in zoom-in duration-1000"
          />
        </div>

        <Card className="glass-card border-foreground/10 relative overflow-hidden w-full max-w-md -mt-6">
          {mode === 'qr' && (
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          )}

          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-foreground">
              {showMfaChallenge ? 'Verificação MFA' : mode === 'login' ? 'Gestão Virtual' : 'Acesso Rápido'}

              {(mode === 'qr' || showMfaChallenge) && (
                showMfaChallenge ? <ShieldCheck className="w-6 h-6 text-primary" /> : <QrCode className="w-6 h-6 text-primary" />
              )}
            </CardTitle>
            <CardDescription className="text-foreground/70">
              {showMfaChallenge
                ? 'Insira o código de 6 dígitos do Microsoft Authenticator'
                : mode === 'login' ? 'Entre com suas credenciais' : 'Use seu celular para entrar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showMfaChallenge ? (
              <form onSubmit={handleVerifyMfa} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mfa-code" className="text-foreground/80 font-semibold uppercase text-[10px] tracking-wider text-center block">Código de Segurança</Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    placeholder="000 000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-3xl tracking-[0.5em] font-bold h-16 dark:industrial-input-dark"
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary text-primary-foreground font-bold shadow-glow"
                  disabled={isLoading || mfaCode.length !== 6}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Verificar e Entrar'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => {
                    setShowMfaChallenge(false);
                    setMfaCode('');
                  }}
                >
                  <ArrowLeft className="w-3 h-3 mr-2" /> Voltar ao login
                </Button>
              </form>
            ) : mode === 'login' ? (
              <>
                {/* Offline Login Banner */}
                {isOffline && offlineAccount && (
                  <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <WifiOff className="w-4 h-4" />
                      <span className="font-semibold text-sm">Modo Offline</span>
                    </div>
                    <p className="text-xs text-foreground/70 mb-3">
                      Sem conexão com a internet. Você pode continuar como:
                    </p>
                    <Button
                      onClick={handleOfflineLogin}
                      disabled={isLoading}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <User className="w-4 h-4 mr-2" />
                      )}
                      Entrar como {offlineAccount.fullName}
                    </Button>
                    <p className="text-[10px] text-foreground/50 mt-2 text-center">
                      ({offlineAccount.identifier})
                    </p>
                  </div>
                )}

                {/* Offline indicator without cached account */}
                {isOffline && !offlineAccount && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                    <div className="flex items-center gap-2 text-destructive">
                      <WifiOff className="w-4 h-4" />
                      <span className="font-semibold text-sm">Sem Conexão</span>
                    </div>
                    <p className="text-xs text-foreground/70 mt-1">
                      É necessário estar online para o primeiro login.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground/80 font-semibold uppercase text-[10px] tracking-wider">Usuário ou E-mail</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="text"
                        placeholder="E-mail ou Matrícula (#12345678)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 dark:industrial-input-dark"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" title="password label" className="text-foreground/80 font-semibold uppercase text-[10px] tracking-wider">Senha de Acesso</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10  dark:industrial-input-dark"
                        required
                        minLength={6}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 gradient-primary text-primary-foreground font-bold shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : 'Entrar no Sistema'}
                  </Button>


                  <div className="text-center mt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link" className="text-xs text-muted-foreground hover:text-primary">
                          Esqueceu sua senha? Solicitar redefinição
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Recuperação de Senha</DialogTitle>
                          <DialogDescription>
                            Escolha como deseja recuperar sua senha.
                          </DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="2fa" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="2fa" className="text-xs">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Via 2FA
                            </TabsTrigger>
                            <TabsTrigger value="admin" className="text-xs">
                              <Mail className="w-3 h-3 mr-1" />
                              Via Administrador
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="2fa">
                            <PasswordRecovery2FAForm
                              onSuccess={() => {
                                // Close dialog and reset state
                              }}
                            />
                          </TabsContent>
                          <TabsContent value="admin">
                            <PasswordResetRequestForm />
                          </TabsContent>
                        </Tabs>
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 space-y-6 animate-scale-in">
                <div className="p-4 bg-white rounded-3xl shadow-glow overflow-hidden">
                  <QRCodeSVG
                    value={qrToken}
                    size={220}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="text-center space-y-3 px-6">
                  <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                    <Smartphone className="w-5 h-5" />
                    <span>Sincronizar Dispositivo</span>
                  </div>
                  <p className="text-sm text-foreground/60 leading-relaxed font-medium">
                    Escaneie para vincular seu telefone e habilitar o login biométrico e geolocalização.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 font-semibold"
                  onClick={() => setMode('login')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login comum
                </Button>
              </div>
            )}

            <div className="mt-8 border-t border-foreground/5 pt-6 text-center">
              {mode === 'login' && !showMfaChallenge && (
                <button
                  type="button"
                  onClick={() => setMode('qr')}
                  className="text-primary hover:text-primary/80 flex items-center justify-center gap-2 w-full font-black text-xs tracking-widest transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  LOGIN VIA QR CODE
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}

