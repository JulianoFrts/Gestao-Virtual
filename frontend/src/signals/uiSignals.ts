import { signal } from "@preact/signals-react";

export const isSidebarOpenSignal = signal(true);

export const toggleSidebar = () => {
  isSidebarOpenSignal.value = !isSidebarOpenSignal.value;
};

export const setSidebarOpen = (isOpen: boolean) => {
  isSidebarOpenSignal.value = isOpen;
};

export const isFocusModeSignal = signal(false);

export const setFocusMode = (isFocus: boolean) => {
  isFocusModeSignal.value = isFocus;
};

export const toggleFocusMode = () => {
  isFocusModeSignal.value = !isFocusModeSignal.value;
};

// Signals de Aparência (Usados no SettingsPage)
export const themeSignal = signal<string>(localStorage.getItem('vite-ui-theme') || 'business-navy');
export const densitySignal = signal<'comfortable' | 'compact'>(
  (localStorage.getItem('app-density') as any) || 'comfortable'
);

// Efeitos de Persistência
if (typeof window !== 'undefined') {
  themeSignal.subscribe((val) => {
    localStorage.setItem('vite-ui-theme', val);
    // Aplicar classe no root para refletir mudança imediata
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    // Removendo classes de temas antigos se houver (simplificado)
    if (val.includes('dark') || val !== 'light') root.classList.add('dark');
    root.classList.add(`theme-${val}`);
  });

  densitySignal.subscribe((val) => {
    localStorage.setItem('app-density', val);
  });
}

