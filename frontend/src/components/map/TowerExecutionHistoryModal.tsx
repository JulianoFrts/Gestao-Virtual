import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Camera, FileText, CheckCircle2, AlertCircle, Maximize2, X, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { db } from "@/integrations/database";

interface TowerExecutionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    tower: any | null; // Tower object with activityStatuses
    projectId: string | null;
}

export function TowerExecutionHistoryModal({ isOpen, onClose, tower, projectId }: TowerExecutionHistoryModalProps) {
    const [activeTab, setActiveTab] = useState("timeline");
    const [photos, setPhotos] = useState<any[]>([]);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

    useEffect(() => {
        if (isOpen && tower && projectId && activeTab === 'photos') {
            fetchPhotos();
        }
    }, [isOpen, tower, projectId, activeTab]);

    const fetchPhotos = async () => {
        if (!tower || !projectId) return;
        setIsLoadingPhotos(true);
        try {
            // Fetch photos by searching for the tower name
            // Using Supabase client directly
            const { data, error } = await db
                .from('construction_documents' as any)
                .select('*')
                .eq('project_id', projectId)
                .ilike('name', `%${tower.name}%`); // Case insensitive search

            if (error) throw error;
            
            // Filter for images client-side
            const images = (data || []).map((doc: any) => ({
                id: doc.id,
                fileName: doc.name,
                // Construct URL based on storage structure logic
                // If doc.file_url acts as path in bucket 'documents':
                url: '', 
                rawUrl: doc.file_url 
            })).filter((img: any) => 
                /\.(jpg|jpeg|png|webp|gif)$/i.test(img.fileName)
            );

            // Fetch generic public URLs for the images
            const imagesWithUrls = await Promise.all(images.map(async (img: any) => {
                 // doc.file_url usually stores the path "projectId/filename" or similar relative path
                 const { data: { publicUrl } } = db.storage.from('documents').getPublicUrl(img.rawUrl);
                 return {
                     ...img,
                     url: publicUrl 
                 };
            }));
            
            setPhotos(imagesWithUrls);
        } catch (error) {
            console.error("Error fetching tower photos:", error);
        } finally {
            setIsLoadingPhotos(false);
        }
    };

    if (!tower) return null;

    // Process Timeline Data
    const timelineEvents = (tower.activityStatuses || [])
        .filter((status: any) => status.endDate || status.updatedAt)
        .sort((a: any, b: any) => {
            const dateA = new Date(a.endDate || a.updatedAt).getTime();
            const dateB = new Date(b.endDate || b.updatedAt).getTime();
            return dateB - dateA; // Descending
        });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[80vh] bg-neutral-950 border-white/10 p-0 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-24 bg-linear-to-r from-neutral-900 to-neutral-950 border-b border-white/5 p-6 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-white">
                                Relatório de Execução
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-neutral-400">
                                    TORRE: <span className="text-white font-bold ml-1">{tower.name}</span>
                                </Badge>
                                <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-neutral-400">
                                    SEQ: <span className="text-white font-bold ml-1">{tower.objectSeq}</span>
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <div className="px-6 border-b border-white/5 bg-white/2">
                            <TabsList className="bg-transparent h-12 gap-6 p-0">
                                <TabsTrigger 
                                    value="timeline" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-400 rounded-none h-full px-0 font-bold uppercase tracking-wide text-xs text-neutral-500"
                                >
                                    Linha do Tempo
                                </TabsTrigger>
                                <TabsTrigger 
                                    value="photos" 
                                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-400 rounded-none h-full px-0 font-bold uppercase tracking-wide text-xs text-neutral-500"
                                >
                                    Evidências Fotográficas
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 bg-neutral-950/50 p-6 overflow-hidden">
                            <TabsContent value="timeline" className="h-full m-0">
                                <ScrollArea className="h-full pr-4">
                                    {timelineEvents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-neutral-500 gap-2">
                                            <AlertCircle className="w-8 h-8 opacity-50" />
                                            <p className="text-sm">Nenhum histórico registrado.</p>
                                        </div>
                                    ) : (
                                        <div className="relative pl-6 border-l border-white/10 space-y-8">
                                            {timelineEvents.map((event: any, idx: number) => (
                                                <div key={idx} className="relative group">
                                                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-neutral-800 border-2 border-neutral-600 group-hover:border-indigo-500 group-hover:bg-indigo-500 transition-colors" />
                                                    <div className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-white uppercase tracking-tight">
                                                                {event.activity?.name || "Atividade Desconhecida"}
                                                            </h4>
                                                            <span className="text-[10px] font-mono text-neutral-400 bg-black/30 px-2 py-1 rounded">
                                                                {format(new Date(event.endDate || event.updatedAt), "dd 'de' MMM, yyyy - HH:mm", { locale: ptBR })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Badge className={event.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'}>
                                                                {event.status === 'COMPLETED' ? 'CONCLUÍDO' : event.status}
                                                            </Badge>
                                                            {event.progressPercent && (
                                                                <span className="text-xs text-neutral-400 font-mono">
                                                                    Progresso: {event.progressPercent}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        {event.observation && (
                                                            <p className="text-sm text-neutral-300 italic border-l-2 border-white/10 pl-3">
                                                                "{event.observation}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="photos" className="h-full m-0">
                                <ScrollArea className="h-full">
                                    {isLoadingPhotos ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />
                                            ))}
                                        </div>
                                    ) : photos.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-3">
                                            <Camera className="w-10 h-10 opacity-30" />
                                            <p className="text-sm font-medium">Nenhuma foto encontrada para esta estrutura.</p>
                                            <p className="text-xs text-neutral-600">Certifique-se que os arquivos contêm "{tower.name}" no nome.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {photos.map((photo, idx) => (
                                                <Card 
                                                    key={idx} 
                                                    className="group relative aspect-square overflow-hidden bg-black/40 border-white/10 cursor-pointer hover:border-indigo-500/50 transition-all"
                                                    onClick={() => setSelectedPhoto(photo)}
                                                >
                                                    <img 
                                                        src={photo.url} 
                                                        alt={photo.fileName} 
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                                    />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Maximize2 className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                                                        <p className="text-[10px] text-white truncate">{photo.fileName}</p>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
            
            {/* Photo Preview Overlay */}
            {selectedPhoto && (
                <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
                    <DialogContent className="max-w-screen-xl w-full h-[90vh] bg-black/95 p-0 border-none flex flex-col items-center justify-center">
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <img 
                                src={selectedPhoto.url} 
                                alt={selectedPhoto.fileName} 
                                className="max-w-full max-h-full object-contain rounded-md shadow-2xl" 
                            />
                            <Button 
                                className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-white/20"
                                size="icon"
                                onClick={() => setSelectedPhoto(null)}
                            >
                                <X className="w-6 h-6 text-white" />
                            </Button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-6 py-3 rounded-full border border-white/10 flex items-center gap-4">
                                <span className="text-white text-sm font-medium">{selectedPhoto.fileName}</span>
                                <Button size="sm" variant="ghost" className="h-8 text-xs gap-2" asChild>
                                    <a href={selectedPhoto.url} download target="_blank" rel="noreferrer">
                                        <Download className="w-3 h-3" /> Download
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}
