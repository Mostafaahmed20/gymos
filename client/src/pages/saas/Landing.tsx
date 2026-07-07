import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Dumbbell, Shield, Sparkles, Users } from "lucide-react";
import { Link } from "wouter";

const features = [
  "Multi-tenant data isolation by gymId",
  "Role-based access (Owner, Manager, Receptionist, Coach)",
  "Billing, trial, and feature-limits by plan",
  "Attendance, payments, subscriptions, and reports",
  "Custom branding, themes, and subdomain ready",
  "Arabic + English ready architecture",
];

const plans = [
  { name: "Basic", price: "$49", details: "Up to 100 members" },
  { name: "Pro", price: "$129", details: "Unlimited members + advanced reports" },
  { name: "Enterprise", price: "Custom", details: "Multi-branch + priority support" },
];

export default function SaasLanding() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-5 w-5 text-emerald-400" />
            <p className="[font-family:var(--font-display)] text-xl uppercase tracking-[0.15em]">GymOS SaaS</p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-white/80 hover:text-white">
              <Link href="/saas/pricing">Pricing</Link>
            </Button>
            <Button asChild className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              <Link href="/saas/login">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 pb-20 pt-16">
        <section className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Multi-Tenant Gym Management Platform</p>
            <h1 className="[font-family:var(--font-display)] mt-5 text-5xl uppercase leading-[0.9] sm:text-6xl">
              One Platform
              <br />
              For Every Gym
            </h1>
            <p className="mt-6 max-w-xl text-white/70">
              Launch and scale your gym business with isolated tenant architecture, subscription billing, role permissions,
              and modern analytics dashboards.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                <Link href="/saas/login">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/25 bg-transparent hover:bg-white/10">
                <Link href="/saas/dashboard">View Demo Dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="[font-family:var(--font-display)] text-2xl uppercase">Core Features</h2>
            <ul className="mt-5 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-white/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-7xl">
          <h2 className="[font-family:var(--font-display)] text-4xl uppercase">Pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{plan.name}</p>
                <p className="[font-family:var(--font-display)] mt-3 text-4xl">{plan.price}</p>
                <p className="mt-3 text-sm text-white/70">{plan.details}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-20 grid max-w-7xl gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <Shield className="h-6 w-6 text-emerald-300" />
            <h3 className="[font-family:var(--font-display)] mt-4 text-2xl uppercase">Security First</h3>
            <p className="mt-3 text-sm text-white/70">Tenant-isolated queries, JWT auth, refresh tokens, and strict role controls.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <Users className="h-6 w-6 text-emerald-300" />
            <h3 className="[font-family:var(--font-display)] mt-4 text-2xl uppercase">Operational Clarity</h3>
            <p className="mt-3 text-sm text-white/70">Manage members, staff, attendance, and billing in one unified system.</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <Sparkles className="h-6 w-6 text-emerald-300" />
            <h3 className="[font-family:var(--font-display)] mt-4 text-2xl uppercase">Built To Scale</h3>
            <p className="mt-3 text-sm text-white/70">Vercel + Railway deployment ready with PostgreSQL and Prisma migrations.</p>
          </article>
        </section>
      </main>
    </div>
  );
}
