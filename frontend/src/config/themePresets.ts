export interface ThemePreset {
    id: string;
    label: string;
    colors: {
        primary: string;
        border: string;
        bg: string;
        glow: string;
        icon: string;
        text: string;
    };
    previewColor: string;
}

export const themePresets: ThemePreset[] = [
    {
        id: "orion-slate",
        label: "Orion Slate (Premium)",
        colors: {
            primary: "text-primary",
            border: "border-border/50",
            bg: "bg-background",
            glow: "shadow-glow",
            icon: "text-primary",
            text: "text-foreground"
        },
        previewColor: "bg-[#0A0F1A] border-primary border-2"
    },
    {
        id: "enterprise",
        label: "Enterprise Premium",
        colors: {
            primary: "text-slate-900",
            border: "border-slate-200",
            bg: "bg-white",
            glow: "shadow-slate-200",
            icon: "text-slate-800",
            text: "text-slate-900"
        },
        previewColor: "bg-white border-slate-900 border-2"
    },
    {
        id: "nebula",
        label: "Cosmic Nebula",
        colors: {
            primary: "text-pink-500",
            border: "border-pink-500",
            bg: "bg-indigo-950",
            glow: "shadow-pink-500",
            icon: "text-pink-400",
            text: "text-pink-100"
        },
        previewColor: "bg-indigo-950 border-pink-500 border-2"
    }
];

// Fallback for light/dark/system
export const defaultThemeColors = {
    primary: "text-primary",
    border: "border-primary",
    bg: "bg-background",
    glow: "shadow-primary",
    icon: "text-primary",
    text: "text-foreground"
};
