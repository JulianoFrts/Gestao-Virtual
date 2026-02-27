import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Camera,
  FileText,
  AlertCircle,
  Maximize2,
  X,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '@/integrations/database'
import { Tower } from '@/modules/geo-viewer/types'

interface TowerExecutionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  tower: Tower | null
  projectId: string | null
}

export function TowerExecutionHistoryModal({
  isOpen,
  onClose,
  tower,
  projectId,
}: TowerExecutionHistoryModalProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState('timeline')
  const [photos, setPhotos] = useState<any[]>([])
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null)

  useEffect(() => {
    if (isOpen && tower && projectId && activeTab === 'photos') {
      fetchPhotos()
    }
  }, [isOpen, tower, projectId, activeTab])

  const fetchPhotos = async () => {
    if (!tower || !projectId) return
    setIsLoadingPhotos(true)
    try {
      const { data, error } = await db
        .from('construction_documents')
        .select('*')
        .eq('project_id', projectId)
        .ilike('name', `%${tower.name}%`)

      if (error) throw error

      const images = (data || [])
        .map((doc: any) => ({
          id: doc.id,
          fileName: doc.name,
          url: '',
          rawUrl: doc.file_url,
        }))
        .filter((img: any) => /\.(jpg|jpeg|png|webp|gif)$/i.test(img.fileName))

      const imagesWithUrls = await Promise.all(
        images.map(async (img: any) => {
          const {
            data: { publicUrl },
          } = db.storage.from('documents').getPublicUrl(img.rawUrl)
          return {
            ...img,
            url: publicUrl,
          }
        })
      )

      setPhotos(imagesWithUrls)
    } catch (error) {
      console.error('Error fetching tower photos:', error)
    } finally {
      setIsLoadingPhotos(false)
    }
  }

  if (!tower) return null

  // Process Timeline Data
  const timelineEvents = (tower.activityStatuses || [])
    .filter((status: any) => status.endDate || status.updatedAt)
    .sort((a: any, b: any) => {
      const dateA = new Date(a.endDate || a.updatedAt).getTime()
      const dateB = new Date(b.endDate || b.updatedAt).getTime()
      return dateB - dateA // Descending
    })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[80vh] max-w-4xl flex-col overflow-hidden border-white/10 bg-neutral-950 p-0">
        {/* Header */}
        <div className="relative flex h-24 items-center justify-between overflow-hidden border-b border-white/5 bg-linear-to-r from-neutral-900 to-neutral-950 p-6">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
              <FileText className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tighter text-white uppercase italic">
                Relatório de Execução
              </DialogTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-[10px] text-neutral-400"
                >
                  TORRE:{' '}
                  <span className="ml-1 font-bold text-white">
                    {tower.name}
                  </span>
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-[10px] text-neutral-400"
                >
                  SEQ:{' '}
                  <span className="ml-1 font-bold text-white">
                    {tower.objectSeq}
                  </span>
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col"
          >
            <div className="border-b border-white/5 bg-white/2 px-6">
              <TabsList className="h-12 gap-6 bg-transparent p-0">
                <TabsTrigger
                  value="timeline"
                  className="h-full rounded-none px-0 text-xs font-bold tracking-wide text-neutral-500 uppercase data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400"
                >
                  Linha do Tempo
                </TabsTrigger>
                <TabsTrigger
                  value="photos"
                  className="h-full rounded-none px-0 text-xs font-bold tracking-wide text-neutral-500 uppercase data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:text-indigo-400"
                >
                  Evidências Fotográficas
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden bg-neutral-950/50 p-6">
              <TabsContent value="timeline" className="m-0 h-full">
                <ScrollArea className="h-full pr-4">
                  {timelineEvents.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 text-neutral-500">
                      <AlertCircle className="h-8 w-8 opacity-50" />
                      <p className="text-sm">Nenhum histórico registrado.</p>
                    </div>
                  ) : (
                    <div className="relative space-y-8 border-l border-white/10 pl-6">
                      {timelineEvents.map((event: any, idx: number) => (
                        <div key={idx} className="group relative">
                          <div className="absolute top-1 -left-[29px] h-3 w-3 rounded-full border-2 border-neutral-600 bg-neutral-800 transition-colors group-hover:border-indigo-500 group-hover:bg-indigo-500" />
                          <div className="rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                            <div className="mb-2 flex items-start justify-between">
                              <h4 className="font-bold tracking-tight text-white uppercase">
                                {event.activity?.name ||
                                  'Atividade Desconhecida'}
                              </h4>
                              <span className="rounded bg-black/30 px-2 py-1 font-mono text-[10px] text-neutral-400">
                                {format(
                                  new Date(event.endDate || event.updatedAt),
                                  "dd 'de' MMM, yyyy - HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                            </div>
                            <div className="mb-3 flex items-center gap-2">
                              <Badge
                                className={
                                  event.status === 'COMPLETED'
                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                }
                              >
                                {event.status === 'COMPLETED'
                                  ? 'CONCLUÍDO'
                                  : event.status}
                              </Badge>
                              {event.progressPercent && (
                                <span className="font-mono text-xs text-neutral-400">
                                  Progresso: {event.progressPercent}%
                                </span>
                              )}
                            </div>
                            {event.observation && (
                              <p className="border-l-2 border-white/10 pl-3 text-sm text-neutral-300 italic">
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

              <TabsContent value="photos" className="m-0 h-full">
                <ScrollArea className="h-full">
                  {isLoadingPhotos ? (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="aspect-square animate-pulse rounded-xl bg-white/5"
                        />
                      ))}
                    </div>
                  ) : photos.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-3 text-neutral-500">
                      <Camera className="h-10 w-10 opacity-30" />
                      <p className="text-sm font-medium">
                        Nenhuma foto encontrada para esta estrutura.
                      </p>
                      <p className="text-xs text-neutral-600">
                        Certifique-se que os arquivos contêm "{tower.name}" no
                        nome.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                      {photos.map((photo, idx) => (
                        <Card
                          key={idx}
                          className="group relative aspect-square cursor-pointer overflow-hidden border-white/10 bg-black/40 transition-all hover:border-indigo-500/50"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img
                            src={photo.url}
                            alt={photo.fileName}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Maximize2 className="h-5 w-5 text-white" />
                          </div>
                          <div className="absolute right-0 bottom-0 left-0 translate-y-full transform bg-black/80 p-2 transition-transform group-hover:translate-y-0">
                            <p className="truncate text-[10px] text-white">
                              {photo.fileName}
                            </p>
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
        <Dialog
          open={!!selectedPhoto}
          onOpenChange={() => setSelectedPhoto(null)}
        >
          <DialogContent className="flex h-[90vh] w-full max-w-7xl flex-col items-center justify-center border-none bg-black/95 p-0">
            <div className="relative flex h-full w-full items-center justify-center p-4">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.fileName}
                className="max-h-full max-w-full rounded-md object-contain shadow-2xl"
              />
              <Button
                className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-white/20"
                size="icon"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-6 w-6 text-white" />
              </Button>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-white/10 bg-black/80 px-6 py-3 backdrop-blur">
                <span className="text-sm font-medium text-white">
                  {selectedPhoto.fileName}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-2 text-xs"
                  asChild
                >
                  <a
                    href={selectedPhoto.url}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
