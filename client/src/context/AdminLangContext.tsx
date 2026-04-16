import { createContext, useContext, useState, ReactNode } from "react";
import T, { type Lang, type TranslationKey } from "@/lib/adminTranslations";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
}

const LangContext = createContext<LangContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => T[key]?.fr ?? key,
  dir: "ltr",
});

export function AdminLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem("admin-lang") as Lang) || "fr"; } catch { return "fr"; }
  });

  const setLang = (l: Lang) => {
    try { localStorage.setItem("admin-lang", l); } catch {}
    setLangState(l);
  };

  const t = (key: TranslationKey): string => T[key]?.[lang] ?? T[key]?.fr ?? key;
  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  return (
    <LangContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LangContext.Provider>
  );
}

export const useAdminLang = () => useContext(LangContext);
