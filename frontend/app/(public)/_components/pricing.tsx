import Link from "next/link";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PAIN_POINTS = [
  "Unused seats",
  "Wasted credits that expire",
  "Features you don’t need",
  "Minimum commitments you can’t avoid",
];

type Tier = {
  name: string;
  price: string;
  subtitle: string;
  includes: string[];
  excludes?: string[];
  meta?: string;
  ctaLabel?: string;
  highlight?: string;
};

const TIERS: Tier[] = [
  {
    name: "Pay-As-You-Go (Start Free)",
    price: "No monthly fee",
    subtitle: "Perfect for: Testing, small projects, occasional use",
    includes: [
      "Add credits anytime",
      "No monthly commitment",
      "No expiration",
      "No minimums",
      "Example: Research agent running 50 tasks/month ≈ $3-5",
    ],
    ctaLabel: "Start Free",
    meta: "Credits only",
  },
  {
    name: "Individual Plan",
    price: "$9 / month",
    subtitle: "Perfect for: Solo consultants, freelancers, small business owners",
    includes: [
      "Unlimited agents",
      "Unlimited workflows",
      "Access to all AI models",
      "100+ tool integrations",
      "Document intelligence",
    ],
    excludes: ["No team assignment", "No voice agents", "No one-click deploy"],
    ctaLabel: "Choose Individual",
    highlight: "Most Popular",
  },
  {
    name: "Team Plan",
    price: "$20 / user / month",
    subtitle: "Perfect for: Agencies, remote teams, growing startups",
    includes: [
      "Everything in Individual",
      "Team assignment & access control",
      "Task scheduling",
      "Voice agents (90+ languages)",
      "One-click Vercel deploy",
      "Conversation history tracking",
      "Team analytics dashboard",
    ],
    meta: "Plus credits (shared pool)",
    ctaLabel: "Choose Team",
  },
  {
    name: "Pro Plan",
    price: "$60 / user / month",
    subtitle: "Perfect for: Agencies serving clients, data-intensive teams",
    includes: [
      "Everything in Team",
      "Advanced document intelligence",
      "10x higher knowledge base limits",
      "Priority model access",
      "Advanced analytics",
      "White-label option",
      "Custom branding",
    ],
    meta: "Plus credits (higher allowance)",
    ctaLabel: "Choose Pro",
  },
  {
    name: "Enterprise Plan",
    price: "Custom pricing",
    subtitle: "Perfect for: Companies needing security, compliance, custom deployment",
    includes: [
      "Everything in Pro",
      "On-premise secure deployment",
      "Custom agent building (we build for you)",
      "Custom tool integrations",
      "Deploy on your cloud infrastructure",
      "Custom model integrations",
      "Dedicated support & SLAs",
    ],
    ctaLabel: "Contact Sales",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative isolate overflow-hidden bg-transparent py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-40 h-64 bg-gradient-to-r from-cyan-500/15 via-transparent to-blue-500/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70">
             Pricing that Makes Sense
          </span>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            Pay for What You Use. Not What You Might Use.
          </h2>
        </div>

        <div className="mt-10 rounded-4xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-8 shadow-[0_25px_100px_rgba(0,0,0,0.45)]">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-base text-muted-foreground">
                Most AI platforms charge you monthly whether you use them or not. You end up paying for:
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {PAIN_POINTS.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/80">
                    <span className="text-base text-blue-300">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-lg font-semibold text-white">DruidX is different.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/90">
              <p>
                True pay-as-you-go credits, optional plans for structure, and zero pressure to buy more than you’ll really use. Spin up
                agents, pause anytime, scale only when output proves its value.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/[0.02] to-transparent p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${
                tier.highlight ? "ring-1 ring-blue-400/50" : ""
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full border border-blue-300/50 bg-blue-400/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-50">
                  {tier.highlight}
                </span>
              )}

              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">{tier.name}</p>
                <h3 className="text-2xl font-semibold text-white">{tier.price}</h3>
                <p className="text-sm text-white/70">{tier.subtitle}</p>
                {tier.meta && <p className="text-xs font-medium uppercase tracking-[0.3em] text-blue-300/80">{tier.meta}</p>}
              </div>

              <div className="mt-6 flex-1 space-y-3 text-sm text-white/80">
                {tier.includes.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Check className="size-4 text-blue-300" />
                    <span>{item}</span>
                  </div>
                ))}
                {tier.excludes?.length ? (
                  <div className="pt-3 text-white/60">
                    {tier.excludes.map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm">
                        <X className="size-4 text-rose-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button
                asChild
                variant={tier.highlight ? "default" : "secondary"}
                className="mt-8 w-full rounded-full border border-white/30 bg-white/10 text-sm font-semibold text-white hover:border-blue-400/70 hover:bg-blue-400/20"
              >
                <Link href="/login">{tier.ctaLabel ?? "Learn More"}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

