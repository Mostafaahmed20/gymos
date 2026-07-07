import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

/**
 * A floating language toggle button fixed to the bottom-right corner.
 * Always visible on every page regardless of layout.
 */
export default function FloatingLangToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === "en" ? "ar" : "en")}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 20px",
        borderRadius: "50px",
        border: "2px solid #f97316",
        backgroundColor: "#f97316",
        color: "#ffffff",
        fontWeight: "700",
        fontSize: "15px",
        cursor: "pointer",
        boxShadow: "0 4px 24px rgba(249,115,22,0.5)",
        transition: "all 0.2s ease",
        letterSpacing: "0.03em",
        fontFamily: language === "ar" ? "Cairo, sans-serif" : "inherit",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ea6c0a";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 32px rgba(249,115,22,0.7)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f97316";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(249,115,22,0.5)";
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      title={language === "en" ? "Switch to Arabic" : "Switch to English"}
    >
      <Globe style={{ width: "18px", height: "18px", flexShrink: 0 }} />
      <span>{language === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
