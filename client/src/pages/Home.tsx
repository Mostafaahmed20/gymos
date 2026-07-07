import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronDown,
  Dumbbell,
  Globe,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    }
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const statItems = [
    { value: t.landing.stat1Value, label: t.landing.stat1Label },
    { value: t.landing.stat2Value, label: t.landing.stat2Label },
    { value: t.landing.stat3Value, label: t.landing.stat3Label },
    { value: t.landing.stat4Value, label: t.landing.stat4Label },
  ];

  const brands = [
    { number: "01", name: "The Venue Ladies", desc: "Where discipline meets indulgence." },
    { number: "02", name: "The Venue Men", desc: "Precision. Power. Presence." },
    { number: "03", name: "M Active Ladies", desc: "Where ambition evolves into influence." },
    { number: "04", name: "M Active Club", desc: "Train with purpose. Aspire for more." },
  ];

  const principles = [
    {
      number: "01",
      title: "Purposeful Design",
      desc: "Every layout and detail is built to elevate flow, focus, and performance.",
      icon: Building2,
    },
    {
      number: "02",
      title: "Science-Backed Training",
      desc: "Elite programming rooted in biomechanics and measurable progress.",
      icon: BarChart3,
    },
    {
      number: "03",
      title: "Precision Recovery",
      desc: "Recovery is integrated into the experience, not treated as an afterthought.",
      icon: Sparkles,
    },
    {
      number: "04",
      title: "Mastery in Every Movement",
      desc: "Coaching that sharpens technique, confidence, and long-term resilience.",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#070808] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(245,110,44,0.20),transparent_35%),radial-gradient(circle_at_90%_15%,rgba(255,255,255,0.06),transparent_30%),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:auto,auto,100%_56px] opacity-90" />
      <div className="pointer-events-none absolute left-1/2 top-[-28rem] h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#ff9e5a2e] to-transparent blur-3xl" />

      <header className="landing-rise sticky top-0 z-40 border-b border-white/10 bg-[#070808]/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5">
              <Dumbbell className="h-5 w-5 text-[#ff9d4d]" />
            </div>
            <span className="[font-family:var(--font-display)] text-2xl font-semibold tracking-wide">GYMOS</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/85 transition hover:border-white/35 hover:bg-white/10"
            >
              <Globe className="h-4 w-4" />
              {language === "en" ? t.common.arabic : t.common.english}
            </button>
            <Button asChild className="rounded-full bg-[#f56e2c] px-6 text-white hover:bg-[#db5e20]">
              <a href={getLoginUrl()}>{t.common.signIn}</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-6 pb-20 pt-16 lg:pt-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="landing-rise space-y-8" style={{ animationDelay: "80ms" }}>
              <Badge className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-white/80 hover:bg-white/10">
                {t.landing.tagline}
              </Badge>

              <div className="space-y-4">
                <p className="[font-family:var(--font-display)] text-sm uppercase tracking-[0.2em] text-[#ff9d4d]">The Vision</p>
                <h1 className="[font-family:var(--font-display)] text-5xl font-semibold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
                  Where Ambition
                  <br />
                  Meets Precision
                </h1>
                <p className="max-w-2xl text-base leading-relaxed text-white/72 sm:text-lg">{t.landing.heroDesc}</p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild className="h-12 rounded-full bg-[#f56e2c] px-8 text-base text-white hover:bg-[#dc6224]">
                  <a href={getLoginUrl()}>{t.common.getStarted}</a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 rounded-full border-white/35 bg-transparent px-8 text-base text-white hover:bg-white/10"
                >
                  <a href={getLoginUrl()}>{t.landing.adminDemo}</a>
                </Button>
              </div>

              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/55">
                <span>Scroll</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            <div className="landing-rise grid gap-4 sm:grid-cols-2 lg:grid-cols-1" style={{ animationDelay: "200ms" }}>
              {statItems.map((stat) => (
                <article key={stat.label} className="rounded-2xl border border-white/15 bg-white/[0.03] p-6 backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-[0.14em] text-white/55">{stat.label}</p>
                  <p className="[font-family:var(--font-display)] mt-2 text-4xl font-semibold text-white">{stat.value}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02] px-6 py-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 text-center text-xs uppercase tracking-[0.18em] text-white/55 sm:text-sm">
            <span>Performance</span>
            <span>Recovery</span>
            <span>Coaching</span>
            <span>Innovation</span>
            <span>Wellness</span>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.45fr_1fr]">
            <div className="landing-rise space-y-3" style={{ animationDelay: "90ms" }}>
              <p className="[font-family:var(--font-display)] text-sm uppercase tracking-[0.2em] text-[#ff9d4d]">Our Brands</p>
              <h2 className="[font-family:var(--font-display)] text-4xl uppercase leading-tight sm:text-5xl">
                A Curated
                <br />
                Fitness Ecosystem
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {brands.map((brand, idx) => (
                <article
                  key={brand.number}
                  className="landing-rise group rounded-2xl border border-white/15 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.06]"
                  style={{ animationDelay: `${110 + idx * 70}ms` }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="[font-family:var(--font-display)] text-sm text-white/55">{brand.number}</span>
                    <ArrowUpRight className="h-4 w-4 text-white/55 transition group-hover:text-[#ff9d4d]" />
                  </div>
                  <h3 className="[font-family:var(--font-display)] text-2xl uppercase leading-tight">{brand.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{brand.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-24">
          <div className="mx-auto max-w-7xl rounded-3xl border border-white/12 bg-[linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 sm:p-10 lg:p-12">
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="landing-rise space-y-3">
                <p className="[font-family:var(--font-display)] text-sm uppercase tracking-[0.2em] text-[#ff9d4d]">Our Philosophy</p>
                <h2 className="[font-family:var(--font-display)] text-4xl uppercase leading-tight sm:text-5xl">{t.landing.everythingYouNeed}</h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
                We design complete health experiences that merge intelligent training, premium environments, and intentional recovery.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {principles.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.number}
                    className="landing-rise rounded-2xl border border-white/15 bg-black/20 p-6"
                    style={{ animationDelay: `${140 + idx * 60}ms` }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="[font-family:var(--font-display)] text-sm text-white/55">{item.number}</span>
                      <Icon className="h-5 w-5 text-[#ff9d4d]" />
                    </div>
                    <h3 className="[font-family:var(--font-display)] text-2xl uppercase">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">{item.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02] px-6 py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <p className="[font-family:var(--font-display)] text-sm uppercase tracking-[0.2em] text-[#ff9d4d]">Join The Mission</p>
              <h2 className="[font-family:var(--font-display)] text-4xl uppercase leading-tight sm:text-5xl">{t.landing.ctaTitle}</h2>
              <p className="max-w-2xl text-white/72">{t.landing.ctaDesc}</p>
            </div>
            <Button size="lg" asChild className="h-12 rounded-full bg-[#f56e2c] px-8 text-base text-white hover:bg-[#db5e20]">
              <a href={getLoginUrl()}>{t.landing.startNow}</a>
            </Button>
          </div>
        </section>

        <footer className="px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5">
                  <Dumbbell className="h-5 w-5 text-[#ff9d4d]" />
                </div>
                <div>
                  <p className="[font-family:var(--font-display)] text-xl uppercase">GYMOS</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-white/50">{t.landing.footer}</p>
                </div>
              </div>
              <a href={getLoginUrl()} className="inline-flex items-center gap-2 text-sm text-white/75 transition hover:text-[#ff9d4d]">
                Connect With Us
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="pt-6 text-sm text-white/50">
              <p>&copy; 2026 GymOS. Crafted for performance-first fitness experiences.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
