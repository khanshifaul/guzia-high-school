"use client";

// lib/language-context.tsx — minimal EN/BN language toggle for the public site.
// Components pass (en, bn) strings inline via t(en, bn); persisted to localStorage.

import * as React from "react";

type Language = "en" | "bn";

interface LanguageContextValue {
    language: Language;
    setLanguage: (l: Language) => void;
    t: (en: string, bn: string) => string;
}

const LanguageContext = React.createContext<LanguageContextValue>({
    language: "en",
    setLanguage: () => undefined,
    t: (en) => en,
});

const STORAGE_KEY = "ghs-language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = React.useState<Language>("en");

    React.useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === "bn" || saved === "en") setLanguageState(saved);
    }, []);

    const setLanguage = React.useCallback((l: Language) => {
        setLanguageState(l);
        window.localStorage.setItem(STORAGE_KEY, l);
        document.documentElement.lang = l;
    }, []);

    const t = React.useCallback(
        (en: string, bn: string) => (language === "bn" ? bn : en),
        [language],
    );

    const value = React.useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    return React.useContext(LanguageContext);
}
