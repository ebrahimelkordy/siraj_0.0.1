import { create } from "zustand";

export const useThemeStore = create((set) => ({
    theme: localStorage.getItem("siraj-theme") || "black",
    setTheme: (theme) => {
        localStorage.setItem("siraj-theme", theme);
        set({ theme });
    },
}));