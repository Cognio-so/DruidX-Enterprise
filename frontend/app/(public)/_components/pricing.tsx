import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

type Tier = {
  name: string;
  price: string;
  priceUnit?: string;
  subtitle: string;
  includes: string[];
  ctaLabel: string;
  ctaVariant?: "default" | "secondary";
  highlight?: string;
};

const TIERS: Tier[] = [
  {
    name: "Pay-As-You-Go",
    price: "$0",
    subtitle: "Perfect for testing and small projects",
    includes: [
      "Add credits anytime",
      "No monthly commitment",
      "No expiration",
      "Example: ~$3-5/mo for 50 tasks",
    ],
    ctaLabel: "Start Free",
    ctaVariant: "secondary",
  },
  {
    name: "Individual",
    price: "$9",
    priceUnit: "/mo",
    subtitle: "Perfect for solo consultants",
    includes: [
      "Unlimited agents",
      "All AI models",
      "100+ integrations",
      "Document intelligence",
    ],
    ctaLabel: "Get Started",
    ctaVariant: "secondary",
  },
  {
    name: "Team",
    price: "$20",
    priceUnit: "/user/mo",
    subtitle: "Perfect for agencies & teams",
    includes: [
      "Everything in Individual",
      "Team assignment & control",
      "Voice agents (90+ languages)",
      "Analytics dashboard",
    ],
    ctaLabel: "Start Team Trial",
    highlight: "Most Popular",
  },
  {
    name: "Pro",
    price: "$60",
    priceUnit: "/user/mo",
    subtitle: "Perfect for client work",
    includes: [
      "Everything in Team",
      "White-label option",
      "10x knowledge base limits",
      "Priority model access",
    ],
    ctaLabel: "Get Started",
    ctaVariant: "secondary",
  },
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative isolate overflow-hidden bg-transparent py-24 md:py-32"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl mb-2">
            Pay for What You Use.
          </h2>
          <p className="text-blue-400 text-4xl font-semibold sm:text-5xl md:text-6xl">
            Not What You Might Use.
          </p>
          <p className="text-muted-foreground mt-4 text-base">
            Most AI platforms charge monthly whether you use them or not. DruidX
            is different.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                tier.highlight
                  ? "border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                  : "border-border/50 bg-card/30 backdrop-blur-sm hover:border-blue-500/30"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                  {tier.highlight}
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-blue-400">
                    {tier.price}
                  </span>
                  {tier.priceUnit && (
                    <span className="text-muted-foreground text-sm">
                      {tier.priceUnit}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{tier.subtitle}</p>
              </div>

              <div className="flex-1 space-y-3 mb-6">
                {tier.includes.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="size-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <Button
                asChild
                variant={tier.ctaVariant || "default"}
                className={`w-full ${
                  tier.highlight
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-card hover:bg-card/80"
                }`}
              >
                <Link href="/login">{tier.ctaLabel}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Enterprise Section */}
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl">🏢</span>
            <h3 className="text-2xl font-semibold">
              Enterprise Plan — Custom Pricing
            </h3>
          </div>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            On-premise deployment, custom integrations, dedicated support, SLA
            guarantees
          </p>
          <Button asChild variant="secondary">
            <Link href="/contact">Contact Sales</Link>
          </Button>
        </div>

        {/* Savings Calculator */}
        <div className="mt-12 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">💰</span>
            <h3 className="text-2xl font-semibold">
              See Your Savings (10-Person Team)
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-muted-foreground text-sm mb-2">
                Old Way (Multiple Subscriptions)
              </p>
              <p className="text-4xl font-bold text-red-400">$10,800</p>
              <p className="text-muted-foreground text-xs">/year</p>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-6 text-center">
              <p className="text-muted-foreground text-sm mb-2">
                DruidX Team Plan
              </p>
              <p className="text-4xl font-bold text-blue-400">$3,400</p>
              <p className="text-muted-foreground text-xs">/year</p>
            </div>
          </div>
          <p className="text-center mt-6 text-2xl font-semibold text-green-400">
            Save $7,400/year (68% reduction)
          </p>
        </div>
      </div>
    </section>
  );
}
