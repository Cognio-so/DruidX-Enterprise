import React from "react";

const COMPARISON = [
  {
    need: "Access to multiple AI models",
    traditional:
      "ChatGPT ($20) + Claude ($20) + Midjourney ($30) + Perplexity ($20) = $90/month per person",
    druIdx: "Team Plan $20/month + credits as you use ≈ $25-40/month per person",
  },
  {
    need: "Voice AI for customer service",
    traditional: "Dedicated voice AI platform: $200-500/month",
    druIdx: "Included in Team Plan",
  },
  {
    need: "Build custom agents",
    traditional: "Hire ML engineers: $150K+/year or Enterprise platform: $50K-100K/year",
    druIdx: "Start at $9/month",
  },
  {
    need: "Team deployment",
    traditional: "Complex platforms with minimums: $199-999/month",
    druIdx: "$20/month per user",
  },
];

const BENEFITS = [
  {
    title: "White-Label & Resell",
    emoji: "💰",
    description:
      "Include DruidX agents in your deliverables, white-label the platform, and bill clients for AI services without revealing your stack.",
    example:
      "Use case: Agency builds a custom voice agent for a client’s support line, charges $2K/month, costs $150 in DruidX credits.",
  },
  {
    title: "Client Reporting Built-In",
    emoji: "📊",
    description:
      "Track agent performance per client, generate usage reports, and prove ROI with baked-in analytics.",
    example: 'Pitch: “Our AI agents handled 1,200 customer inquiries this month with a 92% satisfaction rate.”',
  },
  {
    title: "Fast Deployment = More Projects",
    emoji: "⚡",
    description:
      "Spin up agents in minutes. Chat-to-build means junior team members can handle setups—no expensive specialists required.",
    example: "Result: Take on 2-3x more clients without scaling headcount linearly.",
  },
  {
    title: "Client Data Isolation",
    emoji: "🔒",
    description:
      "Each client’s agents and data stay siloed. Automotive data never touches SaaS data. Enterprise plan adds on-prem options.",
    example: "Enterprise: Full on-prem deployment for clients with strict compliance needs.",
  },
];

export default function PricingComparator() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_60%)]" />
        <div className="absolute inset-x-0 top-36 h-72 bg-gradient-to-r from-blue-500/15 via-transparent to-cyan-500/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6 space-y-20">
        <div>
          <div className="text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70">
              Pricing Comparison Block
            </span>
            <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
              What you&apos;d pay elsewhere
            </h2>
          </div>

          <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/90">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.3em] text-white/60">
                    <th className="px-6 py-4">Need</th>
                    <th className="px-6 py-4">Traditional Approach</th>
                    <th className="px-6 py-4">DruidX</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.need} className="border-b border-white/5 last:border-0">
                      <td className="px-6 py-5 text-base font-semibold text-white">{row.need}</td>
                      <td className="px-6 py-5 text-sm leading-relaxed text-white/80">{row.traditional}</td>
                      <td className="px-6 py-5 text-sm leading-relaxed text-blue-200">{row.druIdx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:grid-cols-2">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/50 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-100">
                Savings Calculator
              </p>
              <h3 className="text-2xl font-semibold text-white">For a 10-person team</h3>
              <div className="space-y-4 text-sm leading-relaxed text-white/80">
                <p className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="font-semibold text-white">Old way:</span> 10 people × $90/month in AI subscriptions =
                  <span className="ml-1 font-semibold text-rose-200">$10,800/year</span>
                </p>
                <p className="rounded-2xl border border-blue-400/40 bg-blue-400/10 p-4 text-blue-100">
                  <span className="font-semibold text-white">DruidX Team Plan:</span> 10 people × $20/month + ~$1,000 in
                  annual credits = <span className="ml-1 font-semibold text-white">$3,400/year</span>
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-300/40 bg-blue-400/10 p-6 text-center text-white">
              <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Savings</p>
              <p className="mt-2 text-4xl font-semibold text-white">$7,400 / year</p>
              <p className="mt-1 text-base text-blue-100">68% reduction</p>
            </div>
          </div>
        </div>

        <div>
          <div className="text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70">
              Why Agencies Choose DruidX
            </span>
            <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
              Built for teams that bill clients—not just use AI internally
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <article
                key={benefit.title}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-transparent p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-blue-400/60 hover:shadow-[0_30px_90px_rgba(59,130,246,0.35)]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 blur-3xl transition group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/15 via-cyan-400/10 to-transparent" />
                </div>
                <div className="relative space-y-3 text-white">
                  <span className="text-2xl">{benefit.emoji}</span>
                  <h3 className="text-xl font-semibold">{benefit.title}</h3>
                  <p className="text-sm leading-relaxed text-white/80">{benefit.description}</p>
                  <p className="text-sm text-blue-200/90">{benefit.example}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

