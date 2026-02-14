import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
                    <AlertTriangle className="w-10 h-10 text-destructive" />
                </div>
                <h1 className="text-4xl font-bold font-display mb-2">404</h1>
                <p className="text-xl text-muted-foreground mb-6">Página não encontrada</p>
                <Button asChild className="gradient-primary text-white">
                    <Link to="/dashboard"><Home className="w-4 h-4 mr-2" />Voltar ao Início</Link>
                </Button>
            </div>
        </div>
    );
}
