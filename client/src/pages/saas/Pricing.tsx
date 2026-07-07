import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    title: "Basic",
    price: "$49/mo",
    points: ["Up to 100 members", "Core gym management", "Email reminders", "Single location"],
  },
  {
    title: "Pro",
    price: "$129/mo",
    points: ["Unlimited members", "Advanced reports", "Brand customization", "Priority support"],
  },
  {
    title: "Enterprise",
    price: "Custom",
    points: ["Multi-branch organizations", "Dedicated onboarding", "SLA + custom workflows", "API priority"],
  },
];

export default function SaasPricing() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="[font-family:var(--font-display)] text-5xl uppercase">Pricing Plans</h1>
        <p className="mt-4 max-w-2xl text-white/70">Transparent SaaS pricing built for independent gyms and growing fitness groups.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{plan.title}</p>
              <p className="[font-family:var(--font-display)] mt-3 text-4xl">{plan.price}</p>
              <ul className="mt-5 space-y-2">
                {plan.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <Button asChild className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
            <Link href="/saas/login">Start Free Trial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
