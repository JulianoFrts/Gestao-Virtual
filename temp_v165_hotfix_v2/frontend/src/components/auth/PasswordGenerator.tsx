import * as React from 'react';
import { Eye, EyeOff, Copy, RefreshCw, Loader2, ShieldCheck, ShieldAlert, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PasswordGeneratorProps {
    onSave: (password: string) => Promise<void>;
    isSaving?: boolean;
}

export function PasswordGenerator({ onSave, isSaving = false }: PasswordGeneratorProps) {
    const { toast } = useToast();
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(true);
    const [length, setLength] = React.useState(12);
    const [options, setOptions] = React.useState({
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true
    });

    const generatePassword = React.useCallback(() => {
        const charSets = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-='
        };

        let chars = '';
        if (options.uppercase) chars += charSets.uppercase;
        if (options.lowercase) chars += charSets.lowercase;
        if (options.numbers) chars += charSets.numbers;
        if (options.symbols) chars += charSets.symbols;

        if (!chars) {
            toast({ title: 'Aviso', description: 'Selecione pelo menos um tipo de caractere', variant: 'destructive' });
            return;
        }

        let generated = '';
        for (let i = 0; i < length; i++) {
            generated += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(generated);
    }, [length, options, toast]);

    // Generate once on mount
    React.useEffect(() => {
        generatePassword();
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(password);
        toast({ title: 'Copiado!', description: 'Senha copiada para a área de transferência.' });
    };

    const getStrength = () => {
        if (!password) return { label: 'Empty', color: 'text-muted-foreground' };
        let score = 0;
        if (password.length > 8) score++;
        if (password.length > 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[!@#$%^&*()]/.test(password)) score++;

        if (score <= 2) return { label: 'FRACA', color: 'text-red-500 border-red-500/30 bg-red-500/5' };
        if (score <= 4) return { label: 'MÉDIA', color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' };
        return { label: 'FORTE', color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' };
    };

    const strength = getStrength();

    return (
        <div className="p-6 space-y-6 rounded-xl border border-yellow-500/20 bg-black/95 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/10">
            <div className="text-center space-y-1 relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-yellow-500/20 rounded-full" />
                <h3 className="text-xl font-black text-yellow-500 uppercase tracking-[0.2em] pt-4">
                    PASSWORD GENERATOR
                </h3>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest italic">Industrial Security Protocol</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-end px-1">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-white/40">Senha Gerada</Label>
                        <span className="text-[10px] font-black uppercase tracking-wider">
                            SEGURANÇA: <span className={cn("px-2 py-0.5 rounded transition-all duration-500 border", strength.color)}>{strength.label}</span>
                        </span>
                    </div>
                    <div className="relative group overflow-hidden rounded-lg">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            readOnly
                            className="h-14 bg-white/5 border-yellow-500/30 text-white font-mono text-xl pr-28 focus-visible:ring-yellow-500/50 focus-visible:border-yellow-500 transition-all text-center tracking-extra-wide"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-md p-1 rounded-md border border-white/5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-white/50 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Ocultar' : 'Mostrar'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-white/50 hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                                onClick={copyToClipboard}
                                title="Copiar"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-white/40 px-1">Configuração Técnica</Label>
                    <div className="grid grid-cols-2 gap-3 p-4 bg-white/2 border border-white/5 rounded-xl">
                        <div className="flex items-center space-x-3 cursor-pointer group bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setOptions({ ...options, uppercase: !options.uppercase })}>
                            <Checkbox checked={options.uppercase} className="border-yellow-500/50 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
                            <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors uppercase">Maiúsculas</span>
                        </div>
                        <div className="flex items-center space-x-3 cursor-pointer group bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setOptions({ ...options, lowercase: !options.lowercase })}>
                            <Checkbox checked={options.lowercase} className="border-yellow-500/50 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
                            <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors uppercase">Minúsculas</span>
                        </div>
                        <div className="flex items-center space-x-3 cursor-pointer group bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setOptions({ ...options, numbers: !options.numbers })}>
                            <Checkbox checked={options.numbers} className="border-yellow-500/50 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
                            <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors uppercase">Números</span>
                        </div>
                        <div className="flex items-center space-x-3 cursor-pointer group bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setOptions({ ...options, symbols: !options.symbols })}>
                            <Checkbox checked={options.symbols} className="border-yellow-500/50 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500" />
                            <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors uppercase">Símbolos</span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-white/5 mt-1 flex items-center justify-between">
                            <span className="text-[10px] uppercase font-black text-white/30">Comprimento</span>
                            <div className="flex items-center gap-3">
                                <span className="text-yellow-500 font-mono font-bold text-sm w-4">{length}</span>
                                <Input
                                    type="range"
                                    min={6}
                                    max={32}
                                    value={length}
                                    onChange={(e) => setLength(parseInt(e.target.value))}
                                    className="h-1.5 w-32 bg-white/10 rounded-full appearance-none cursor-pointer accent-yellow-500 hover:accent-yellow-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <Button
                        variant="outline"
                        className="w-full border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 font-black h-12 rounded-lg transition-all uppercase tracking-widest text-xs"
                        onClick={generatePassword}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Nova Senha
                    </Button>
                    <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black h-12 rounded-lg shadow-lg shadow-yellow-500/20 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                        onClick={() => onSave(password)}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <ShieldCheck className="w-4 h-4 mr-2" />
                        )}
                        Salvar Acesso
                    </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-yellow-500/10 border border-yellow-500/20">
                                <Info className="w-3.5 h-3.5 text-yellow-500" />
                            </div>
                            <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Protocolo de Segurança</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] text-white/40 leading-tight">
                            <div className="flex gap-2">
                                <span className="text-yellow-500/70 font-bold">•</span>
                                <p><strong>Entropy:</strong> Com {length} caracteres, a complexidade é exponencial.</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-yellow-500/70 font-bold">•</span>
                                <p><strong>Storage:</strong> Senhas são processadas via hashing irreversível no servidor.</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-yellow-500/70 font-bold">•</span>
                                <p><strong>Transit:</strong> Transferência protegida por criptografia de ponta Orion (TLS).</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-yellow-500/70 font-bold">•</span>
                                <p><strong>Control:</strong> Toda alteração administrativa é registrada em logs de auditoria.</p>
                            </div>
                        </div>

                        <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10 mt-1">
                            <p className="text-[9px] text-red-400 italic font-medium leading-relaxed">
                                <ShieldAlert className="inline w-3 h-3 mr-1 -mt-0.5" />
                                <strong>Aviso:</strong> É obrigação do administrador reportar esta senha ao usuário por canal seguro e externo ao sistema.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
