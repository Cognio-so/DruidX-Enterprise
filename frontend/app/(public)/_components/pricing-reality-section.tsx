import React from "react";
import Link from "next/link";
import { ArrowDown } from "lucide-react";

const OPTIONS = [
  {
    title: "Option 1: Subscription Hell",
    description: "ChatGPT + Claude + Midjourney + Perplexity + specialty tools",
    highlight: "$190+/mo per person",
    subtext: "Your 10-person team? $23,000/year",
  },
  {
    title: "Option 2: Enterprise Complexity",
    description: "Custom AI with ML engineers, months of development...",
    highlight: "Six-figure budgets",
    subtext: "Plus hiring specialized talent",
  },
  {
    title: "Option 3: Toy Tools",
    description:
      '"Simple" no-code chatbots that can\'t handle real workflows...',
    highlight: "Can't scale",
    subtext: "Good luck with complex automation",
  },
];

export function PricingRealitySection() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-balance text-5xl font-bold leading-tight md:text-6xl mb-6">
            <span className="text-white">Your Team Needs AI.</span>
            <br />
            <span className="text-white/40">
              Your Budget Doesn&apos;t Need Another
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              $200/Month Subscription.
            </span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {OPTIONS.map((option) => (
            <article
              key={option.title}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-white/10"
            >
              <h3 className="text-lg font-bold text-white mb-4">
                {option.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {option.description}
              </p>
              <p className="text-blue-400 text-3xl font-bold mb-2">
                {option.highlight}
              </p>
              <p className="text-muted-foreground text-xs">{option.subtext}</p>
            </article>
          ))}
        </div>

        <div className="flex justify-center">
          <Link href="/login">
            <div className="group flex items-center gap-3 bg-[#0F1C2E] border border-blue-500/20 rounded-2xl px-10 py-5 hover:bg-[#15253a] transition-all cursor-pointer">
              <span className="text-sky-400 text-2xl font-bold">
                There&apos;s a fourth option.
              </span>
              <ArrowDown className="text-sky-400 size-6 group-hover:translate-y-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
