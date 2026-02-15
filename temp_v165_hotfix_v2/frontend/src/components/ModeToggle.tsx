import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

import { themePresets } from "@/config/themePresets";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative hover:bg-white/10"
        >
          <Palette className="h-[1.2rem] w-[1.2rem] text-secondary-foreground" />
          <span className="sr-only">Escolher tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 glass-card p-2">
        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider opacity-60">
          Temas Padrão
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-4 h-4 rounded-full bg-white border border-slate-200" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700" />
          Escuro
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-4 h-4 rounded-full bg-linear-to-r from-white to-slate-900 border border-slate-400" />
          Sistema
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider opacity-60">
          Presets Premium
        </DropdownMenuLabel>

        <div className="grid grid-cols-1 gap-1">
          {/* Renderiza Enterprise Premium destacado se existir */}
          {themePresets
            .filter((t) => t.id === "enterprise")
            .map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`flex items-center justify-between cursor-pointer p-3 rounded-lg m-1 transition-all ${theme === t.id ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-white/5 border border-white/5"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-md shadow-sm ${t.previewColor}`}
                  />
                  <span
                    className={`text-sm font-medium ${theme === t.id ? "text-primary" : ""}`}
                  >
                    {t.label}
                  </span>
                </div>
                <div className="w-2 h-2 rounded-full bg-slate-400" />
              </DropdownMenuItem>
            ))}
        </div>

        <DropdownMenuSeparator className="bg-white/10" />

        {/* Cosmic Nebula separada no final */}
        {themePresets
          .filter((t) => t.id === "nebula")
          .map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg m-1 transition-all ${theme === t.id ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-white/5"}`}
            >
              <div
                className={`w-6 h-6 rounded-md shadow-sm ${t.previewColor}`}
              />
              <span
                className={`text-sm font-medium ${theme === t.id ? "text-primary" : ""}`}
              >
                {t.label}
              </span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
