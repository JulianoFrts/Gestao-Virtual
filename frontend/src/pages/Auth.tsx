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
import { Logo } from '@/components/common/Logo';
import { useSettings } from "@/contexts/SettingsContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ContextSelectorModal } from '@/components/auth/ContextSelectorModal';

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
  const [showContextSelector, setShowContextSelector] = useState(false);

  const { login, loginOffline, getLastOfflineAccount, setMfaVerified, user, selectedContext, isLoading: isAuthLoading, bypassAuth } = useAuth();
  const { logoUrl } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check offline status and last account
  useEffect(() => {

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // [STRICT AUTH] Mostrar erro se redirecionado por falta de permissão
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'unauthorized') {
      toast({
        title: "Sessão Inválida",
        description: "Sua sessão expirou ou você não tem permissão para acessar esta área.",
        variant: "destructive",
      });
      // Limpa o parâmetro da URL sem recarregar
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Auto redirect fully authenticated users
    if (user && selectedContext && !isAuthLoading && !showMfaChallenge && mode !== 'qr') {
      navigate('/dashboard');
    }

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
          description: 'Defina seu contexto de acesso.',
        });
        setShowContextSelector(true);
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
        setShowContextSelector(true);
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
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      
      <div className="w-full max-w-lg animate-fade-in flex flex-col items-center relative z-10">


        <Card className={`w-full max-w-md bg-slate-950 border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.2)] ring-1 ring-white/10 rounded-3xl overflow-hidden shine-effect ${showContextSelector ? 'opacity-0 pointer-events-none' : ''}`}>
          <div className="absolute inset-0 bg-linear-to-tr from-white/5 to-transparent pointer-events-none" />
          
          {mode === 'qr' && (
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          )}

          <CardHeader className="text-center pb-2 relative z-10">
            <div className="flex flex-col items-center justify-center mb-6">
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt="Logo"
                        className="max-h-20 object-contain drop-shadow-xl"
                    />
                ) : (
                    <div className="scale-125 mb-2">
                        <Logo className="text-white" />
                    </div>
                )}
            </div>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
              {showMfaChallenge ? 'Verificação MFA' : mode === 'login' ? 'Bem-vindo' : 'Acesso Rápido'}

              {(mode === 'qr' || showMfaChallenge) && (
                showMfaChallenge ? <ShieldCheck className="w-6 h-6 text-primary" /> : <QrCode className="w-6 h-6 text-primary" />
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {showMfaChallenge
                ? 'Insira o código de 6 dígitos do Microsoft Authenticator'
                : mode === 'login' ? 'Acesse sua conta para continuar' : 'Use seu celular para entrar'}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            {showMfaChallenge ? (
              <form onSubmit={handleVerifyMfa} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="mfa-code" className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider text-center block">Código de Segurança</Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    placeholder="000 000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-3xl tracking-[0.5em] font-bold h-16 bg-slate-900 border-slate-800 text-white focus-visible:ring-primary/40"
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 gradient-primary text-primary-foreground font-bold shadow-lg shadow-primary/25"
                  disabled={isLoading || mfaCode.length !== 6}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Verificar e Entrar'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-slate-400 hover:text-white"
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
                  <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <WifiOff className="w-4 h-4" />
                      <span className="font-semibold text-sm">Modo Offline</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">
                      Sem conexão com a internet. Você pode continuar como:
                    </p>
                    <Button
                      onClick={handleOfflineLogin}
                      disabled={isLoading}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-900/20"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <User className="w-4 h-4 mr-2" />
                      )}
                      Entrar como {offlineAccount.fullName}
                    </Button>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                      ({offlineAccount.identifier})
                    </p>
                  </div>
                )}

                {/* Offline indicator without cached account */}
                {isOffline && !offlineAccount && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-500">
                      <WifiOff className="w-4 h-4" />
                      <span className="font-semibold text-sm">Sem Conexão</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      É necessário estar online para o primeiro login.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Usuário ou E-mail</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="text"
                        placeholder="E-mail ou Matrícula (#12345678)"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-slate-900 border-slate-800 text-white focus-visible:ring-primary/40 transition-all font-medium placeholder:text-slate-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" title="password label" className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Senha de Acesso</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11 bg-slate-900 border-slate-800 text-white focus-visible:ring-primary/40 transition-all font-medium placeholder:text-slate-600"
                        required
                        minLength={6}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 mt-2 gradient-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 rounded-xl"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : 'ENTRAR NO SISTEMA'}
                  </Button>

                  {/* BYPASS DESENVOLVIMENTO: Apenas Localhost */}
                  {window.location.hostname === 'localhost' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-dashed border-primary/50 text-primary hover:bg-primary/10 font-black tracking-widest text-[10px]"
                      onClick={async () => {
                        const res = await bypassAuth();
                        if (res?.success) navigate('/dashboard');
                      }}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      MODO DESENVOLVEDOR (BYPASS)
                    </Button>
                  )}


                  <div className="text-center mt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link" className="text-xs text-slate-500 hover:text-primary">
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
                <div className="p-6 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
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
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    Escaneie para vincular seu telefone e habilitar o login biométrico e geolocalização.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  className="text-slate-400 hover:text-white hover:bg-slate-800 font-semibold"
                  onClick={() => setMode('login')}
                  >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login comum
                </Button>
              </div>
            )}

            <div className="mt-8 border-t border-slate-100 pt-6 text-center">
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
        
        {/* Footer info */}
        {!showContextSelector && (
          <div className="mt-8 text-center space-y-2">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                  Gestão Virtual &copy; 2024
              </p>
          </div>
        )}
      </div>

      <ContextSelectorModal 
        open={showContextSelector} 
        onSuccess={() => navigate('/dashboard')} 
      />
    </div>
  );
}

