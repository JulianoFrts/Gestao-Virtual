import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutContextType {
    isSidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
    toggleSidebar: () => void;
    isFocusMode: boolean;
    setFocusMode: (isFocus: boolean) => void;
    toggleFocusMode: () => void;
    theme: string;
    setTheme: (theme: string) => void;
    density: 'comfortable' | 'compact';
    setDensity: (density: 'comfortable' | 'compact') => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isFocusMode, setFocusMode] = useState(false);
    const [theme, setThemeState] = useState(localStorage.getItem('vite-ui-theme') || 'business-navy');
    const [density, setDensityState] = useState<'comfortable' | 'compact'>(
        (localStorage.getItem('app-density') as any) || 'comfortable'
    );

    const toggleSidebar = () => setSidebarOpen(prev => !prev);
    const toggleFocusMode = () => setFocusMode(prev => !prev);

    const setTheme = (val: string) => {
        setThemeState(val);
        localStorage.setItem('vite-ui-theme', val);
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (val.includes('dark') || val !== 'light') root.classList.add('dark');
        // This assumes theme classes are prefixed with theme-
        // In the original signal effect it was root.classList.add(`theme-${val}`);
        // We should replicate that or use a better theme manager.
        // For now, let's stick to the original logic.
        root.classList.add(`theme-${val}`);
    };

    const setDensity = (val: 'comfortable' | 'compact') => {
        setDensityState(val);
        localStorage.setItem('app-density', val);
    };

    // Apply theme on initial load
    useEffect(() => {
        const val = theme;
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (val.includes('dark') || val !== 'light') root.classList.add('dark');
        root.classList.add(`theme-${val}`);
    }, [theme]);

    return (
        <LayoutContext.Provider
            value={{
                isSidebarOpen,
                setSidebarOpen,
                toggleSidebar,
                isFocusMode,
                setFocusMode,
                toggleFocusMode,
                theme,
                setTheme,
                density,
                setDensity
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
