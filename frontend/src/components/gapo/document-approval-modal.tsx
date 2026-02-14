import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component
import { CheckCircle2, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ConstructionDocument } from '@/hooks/useConstructionDocuments';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocumentApprovalModalProps {
    documents: ConstructionDocument[];
    onApprove: (doc: ConstructionDocument) => void;
    onReject: (doc: ConstructionDocument) => void;
}

export function DocumentApprovalModal({ documents, onApprove, onReject }: DocumentApprovalModalProps) {
    const pendingDocs = documents.filter(d => d.status === 'pending');
    const processedDocs = documents.filter(d => d.status === 'valid' || d.status === 'rejected').slice(0, 50); // Show last 50 processed

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 relative">
                    <Clock className="size-4" />
                    Aprovação de Arquivos
                    {pendingDocs.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                            {pendingDocs.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col glass-card border-white/10">
                <DialogHeader>
                    <DialogTitle>Central de Aprovação</DialogTitle>
                    <DialogDescription>Gerencie a entrada de novos documentos no sistema.</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                    <div className="flex flex-col gap-4 overflow-hidden">
                        <h3 className="font-bold flex items-center gap-2 text-amber-500">
                            <Clock className="size-4" /> Pendentes ({pendingDocs.length})
                        </h3>
                        <div className="border border-white/10 rounded-lg overflow-hidden flex-1 bg-black/20">
                            <ScrollArea className="h-full">
                                {pendingDocs.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                        <CheckCircle2 className="size-8 opacity-20" />
                                        <span className="text-xs">Tudo limpo! Nenhum documento pendente.</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="text-xs">Arquivo</TableHead>
                                                <TableHead className="text-xs text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingDocs.map(doc => (
                                                <TableRow key={doc.id} className="hover:bg-white/5">
                                                    <TableCell className="py-2">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium text-sm flex items-center gap-2">
                                                                <FileText className="size-3 text-primary" /> {doc.name}
                                                            </span>
                                                            <div className="flex gap-2 text-[10px] text-muted-foreground">
                                                                <span>{format(doc.createdAt, 'dd/MM HH:mm')}</span>
                                                                <span>•</span>
                                                                <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                                                <span>•</span>
                                                                <span>{doc.createdBy}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-2">
                                                        <div className="flex justify-end gap-1">
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={() => onApprove(doc)}>
                                                                <CheckCircle2 className="size-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-500/10 hover:text-red-400" onClick={() => onReject(doc)}>
                                                                <XCircle className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 overflow-hidden opacity-75">
                        <h3 className="font-bold flex items-center gap-2 text-muted-foreground">
                            <HistoryIcon className="size-4" /> Histórico Recente
                        </h3>
                        <div className="border border-white/10 rounded-lg overflow-hidden flex-1 bg-black/20">
                            <ScrollArea className="h-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="text-xs">Arquivo</TableHead>
                                            <TableHead className="text-xs text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {processedDocs.map(doc => (
                                            <TableRow key={doc.id} className="hover:bg-transparent opacity-60">
                                                <TableCell className="py-2 text-xs">{doc.name}</TableCell>
                                                <TableCell className="py-2 text-right">
                                                    <Badge variant="outline" className={`text-[10px] ${doc.status === 'valid' ? 'text-emerald-500 border-emerald-500/30' : 'text-gray-500 border-gray-500/30 font-bold'}`}>
                                                        {doc.status === 'valid' ? 'Aprovado' : 'Rejeitado'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function HistoryIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" />
            <path d="M3 3v9h9" />
            <path d="M12 7v5l4 2" />
        </svg>
    )
}

