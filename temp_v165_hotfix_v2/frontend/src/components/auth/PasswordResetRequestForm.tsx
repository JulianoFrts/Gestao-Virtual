import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessages } from '@/hooks/useMessages';
import { Loader2, Mail, User, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PasswordResetRequestForm() {
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [identification, setIdentification] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { sendMessage } = useMessages();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await sendMessage({
                type: 'PASSWORD_RESET',
                subject: `Redefinição de Senha - ${fullName}`,
                content: `Solicitação de redefinição de senha.\n\nNome: ${fullName}\nE-mail: ${email}\nIdentificação: ${identification}`,
                senderEmail: email,
                recipientRole: 'admin',
                metadata: {
                    source: 'login_screen',
                    fullName: fullName,
                    email: email,
                    identification: identification
                }
            });

            if (result.success) {
                toast({
                    title: 'Solicitação Enviada',
                    description: 'Sua solicitação foi registrada. Um administrador analisará e entrará em contato.',
                });
                setEmail('');
                setFullName('');
                setIdentification('');
            }
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Não foi possível enviar a solicitação.',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="reset-name" className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    Nome Completo *
                </Label>
                <Input
                    id="reset-name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="reset-email" className="flex items-center gap-2">
                    <Mail className="w-3 h-3" />
                    E-mail Cadastrado *
                </Label>
                <Input
                    id="reset-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="reset-ident" className="flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    Empresa / Obra / Canteiro *
                </Label>
                <Input
                    id="reset-ident"
                    placeholder="Ex: Construtora XYZ - Obra Alpha"
                    value={identification}
                    onChange={(e) => setIdentification(e.target.value)}
                    required
                />
                <p className="text-[10px] text-muted-foreground">
                    Necessário para validação de identidade.
                </p>
            </div>
            <Button
                type="submit"
                className="w-full gradient-primary"
                disabled={isLoading || !email || !fullName || !identification}
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enviar Solicitação
            </Button>
        </form>
    );
}
