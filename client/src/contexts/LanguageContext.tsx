import React, { createContext, useContext, useEffect, useState } from "react";
import { ar } from "@/i18n/ar";
import { en } from "@/i18n/en";

export type Language = "en" | "ar";
export type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: en,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("gymos_lang") as Language) || "en";
  });

  const isRTL = language === "ar";
  const t = language === "ar" ? ar : en;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("gymos_lang", lang);
  };

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("dir", isRTL ? "rtl" : "ltr");
    html.setAttribute("lang", language);
    if (isRTL) {
      html.classList.add("rtl");
    } else {
      html.classList.remove("rtl");
    }
  }, [isRTL, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
