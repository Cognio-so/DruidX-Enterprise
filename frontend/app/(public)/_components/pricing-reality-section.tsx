import React from "react";

const OPTIONS = [
  {
    title:
      "Pay for ChatGPT Plus ($20) + Claude Pro ($20) + Midjourney ($30) + Perplexity ($20) + specialty tools ($100+)",
    highlight: "$190+/month per person · $23,000/year for a 10-person team",
    body:
      "Every seat burns a hole in your budget before you ship a single workflow.",
  },
  {
    title: "Build custom AI agents with heavyweight platforms",
    highlight: "Requires ML engineers + months of dev time + six-figure budgets",
    body: "Great if you have a research org. Most teams don’t.",
  },
  {
    title: 'Use "simple" no-code chatbots',
    highlight: "No real workflows, no stack integrations, no scale",
    body: "Looks shiny in a demo, stalls the moment it touches real ops.",
  },
];

export function PricingRealitySection() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />
        <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-blue-500/40 to-transparent md:block" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950/80 to-slate-900 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] ring-1 ring-white/5 md:p-12">
          <div className="absolute -inset-1 rounded-4xl border border-white/5 opacity-40 blur-xl" />
          <div className="relative flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
            <div className="space-y-5 md:max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/40 bg-blue-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-200">
                Reality Check
              </span>
              <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
                Your Team Needs AI.{" "}
                <span className="bg-gradient-to-r from-blue-300 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                  Your Budget Doesn’t Need Another $200/Month Subscription.
                </span>
              </h2>
              <p className="text-base text-slate-200/80 sm:text-lg">
                Agency owners and remote teams are stuck picking the least bad
                option. Here’s why every path hurts.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-slate-200/80 shadow-inner shadow-white/5 sm:text-base">
              <p className="font-medium text-white">
                DruidX flips the script: intelligent agents that connect to your
                stack, launch in days, and charge only when they work.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {OPTIONS.map((option, index) => (
              <article
                key={option.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] p-6 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:border-blue-400/60 hover:shadow-[0_20px_60px_rgba(59,130,246,0.25)]"
              >
                <div className="absolute inset-0 opacity-0 blur-3xl transition group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-sky-400/15 to-transparent" />
                </div>
                <div className="relative">
                  <span className="inline-flex size-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                    0{index + 1}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-white">
                    {option.title}
                  </h3>
                  <p className="mt-3 text-sm font-semibold text-blue-300">
                    {option.highlight}
                  </p>
                  <p className="mt-3 text-sm text-slate-200/70">
                    {option.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

