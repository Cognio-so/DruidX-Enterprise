import React from "react";

const STEPS = [
  {
    number: "01",
    title: "Describe",
    body: 'Chat with our agent builder. "I need an agent that qualifies inbound leads from our website form."',
  },
  {
    number: "02",
    title: "Connect",
    body:
      "Link your tools. HubSpot, Slack, Gmail—whatever you use. DruidX handles authentication.",
  },
  {
    number: "03",
    title: "Deploy",
    body:
      'Hit "Launch." Your agent is live. Assign it to your sales team and monitor everything from the dashboard.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_60%)]" />
        <div className="absolute inset-x-0 top-1/3 h-60 bg-gradient-to-r from-blue-500/15 via-transparent to-cyan-500/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70">
            How It Works
          </span>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            From Idea to Deployed Agent in Under 10 Minutes
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
            Three steps, zero engineering bottlenecks. Inspired by Aceternity’s
            timeline layouts with bold typography and subtle motion cues.
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-6">
          {STEPS.map((step, index) => (
            <article
              key={step.number}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition hover:-translate-y-1.5 hover:border-blue-400/70 hover:shadow-[0_30px_90px_rgba(59,130,246,0.35)] sm:p-8"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 blur-3xl transition group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/15 via-cyan-400/10 to-transparent" />
              </div>
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-base font-semibold tracking-[0.2em] text-white/70">
                    {step.number}
                  </div>
                  <div className="hidden h-px w-12 bg-gradient-to-r from-white/40 to-transparent sm:block" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300/80">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


