import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Minimize2,
  Save,
  Loader2,
  Maximize2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoViewerHeaderProps {
  isFullScreen: boolean;
  setIsFullScreen: (full: boolean) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  projects: { id: string; name: string }[];
  isSaving: boolean;
  handleSaveConfig: (manual: boolean) => void;
  canEdit: boolean;
  canManage: boolean;
  isClearing: boolean;
  towersCount: number;
  setIsClearConfirmOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  viewState: { latitude: number; longitude: number; zoom: number };
}

export const GeoViewerHeader: React.FC<GeoViewerHeaderProps> = ({
  isFullScreen,
  setIsFullScreen,
  selectedProjectId,
  setSelectedProjectId,
  projects,
  isSaving,
  handleSaveConfig,
  canEdit,
  canManage,
  isClearing,
  towersCount,
  setIsClearConfirmOpen,
  navigate,
  viewState,
}) => {
  if (isFullScreen) {
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 animate-in fade-in slide-in-from-top-6 duration-700 w-[95%] max-w-6xl">
        <div className="bg-black/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_0_80px_rgba(16,185,129,0.3)] p-4 flex items-center justify-between gap-8 ring-1 ring-white/10 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-emerald-500/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 pr-8 border-r border-white/10 shrink-0">
              <Select value={selectedProjectId || undefined} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-[100px] h-12 bg-white/5 border-white/5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all text-white">
                  <SelectValue placeholder="OPERAÇÃO" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/10 rounded-2xl shadow-2xl">
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs font-bold font-mono">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <div className="w-px h-8 bg-white/10" />
              {canManage ? (
                <Button
                  variant="outline"
                  disabled={isClearing || !selectedProjectId || towersCount === 0}
                  className="gap-2 bg-red-950/30 border-red-900/50 hover:bg-red-900/50 text-red-400 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  onClick={() => setIsClearConfirmOpen(true)}
                >
                  {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Limpar Torres
                </Button>
              ) : (
                <div className="h-12 px-6 rounded-2xl border border-dashed border-white/5 text-neutral-700 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                  Admin Restrito
                </div>
              )}
              <div className="w-px h-8 bg-white/10" />
              <Button
                onClick={() => setIsFullScreen(false)}
                variant="ghost"
                className="h-12 px-6 rounded-2xl border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest group shadow-xl"
              >
                <Maximize2 className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span>FECHAR COCKPIT</span>
              </Button>
            </div>
          </div>
          <div className="shrink-0 relative group">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Button
              size="lg"
              className={cn(
                "h-14 px-10 rounded-4xl font-black text-[11px] uppercase tracking-[0.4em] transition-all gap-5 shadow-2xl relative border-2 border-emerald-400/20 active:scale-95",
                isSaving ? "bg-emerald-500/50 cursor-wait" : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/30",
                !canEdit && "opacity-20 grayscale cursor-not-allowed"
              )}
              onClick={() => canEdit && handleSaveConfig(false)}
              disabled={!selectedProjectId || isSaving || !canEdit}
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{isSaving ? "PROCESSANDO" : "PUBLICAR PROJETO"}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-6 left-0 right-0 z-50 px-6 flex items-center justify-center pointer-events-none">
      <div className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-full p-2 flex items-center gap-4 shadow-2xl ring-1 ring-white/10 pointer-events-auto max-w-full overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 px-2 shrink-0">
          <Layers className="w-3.5 h-3.5 text-emerald-500/50" />
          <Select value={selectedProjectId || undefined} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[180px] md:w-[240px] h-8 bg-transparent border-none focus:ring-0 rounded-full font-black text-[10px] uppercase tracking-widest hover:text-emerald-400 text-left px-0 shadow-none text-white">
              <SelectValue placeholder="SELECIONE O PROJETO" />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/10 rounded-2xl shadow-2xl min-w-[240px]">
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold font-mono py-2">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-px h-8 bg-white/10 shrink-0" />
        <div className="flex items-center gap-2 shrink-0 pr-2">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-white/5 rounded-full px-4 h-9 font-black text-[9px] uppercase tracking-widest border border-transparent hover:border-white/10"
            onClick={() => navigate("/dashboard")}
          >
            <Minimize2 className="w-3.5 h-3.5 mr-2" />
            FECHAR COCKPIT
          </Button>
          <Button
            className={cn(
              "h-9 px-6 rounded-full font-black text-[9px] uppercase tracking-widest transition-all gap-2 shadow-lg",
              isSaving ? "bg-emerald-500/50 cursor-wait" : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 shadow-emerald-500/10"
            )}
            onClick={() => canEdit && handleSaveConfig(false)}
            disabled={!selectedProjectId || isSaving || !canEdit}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>PUBLICAR</span>
          </Button>
          <div className="flex items-center gap-3 ml-3 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-black text-emerald-400/70 uppercase tracking-widest">LAT</span>
              <span className="text-[10px] font-mono font-black text-white tabular-nums">{viewState.latitude.toFixed(6)}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-black text-emerald-400/70 uppercase tracking-widest">LNG</span>
              <span className="text-[10px] font-mono font-black text-white tabular-nums">{viewState.longitude.toFixed(6)}</span>
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-black text-emerald-400/70 uppercase tracking-widest">ALT</span>
              <span className="text-[10px] font-mono font-black text-white tabular-nums">{viewState.zoom.toFixed(1)}z</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
