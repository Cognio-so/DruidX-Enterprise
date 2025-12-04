import React from "react";

type Feature = {
  title: string;
  description: string;
  icon: string;
};

const FEATURES: Feature[] = [
  {
    title: "No-Code Agent Builder",
    description:
      "Describe your agent in plain English. We handle model selection, prompt engineering, and deployment.",
    icon: "🤖",
  },
  {
    title: "Every Top AI Model",
    description:
      "GPT-4, Claude 3.5, Gemini, Llama, Mistral, and more. Switch models per task and let Agent Council pick the best response.",
    icon: "🧠",
  },
  {
    title: "Your Knowledge Base, Embedded",
    description:
      "Advanced RAG grounds every response in your docs, sites, PDFs, and videos. No hallucinations—every answer cites sources.",
    icon: "📚",
  },
  {
    title: "Team Assignment & Control",
    description:
      "Build agents for specific teams, track usage, view conversation history, and export analytics.",
    icon: "👥",
  },
  {
    title: "Voice AI Included",
    description:
      "Deploy voice agents in 90+ languages for support, sales calls, or internal helpdesk.",
    icon: "🗣️",
  },
  {
    title: "Deep Research Mode",
    description:
      "Agents search multiple sources, compile findings, and generate citations automatically.",
    icon: "🔬",
  },
  {
    title: "100+ Integrations",
    description:
      "Native MCP support plus Slack, Notion, HubSpot, Zendesk, Google Drive, CRMs, and custom APIs.",
    icon: "⚡",
  },
  {
    title: "Multimodal AI",
    description:
      "Generate images, create videos, transcribe audio, and analyze documents from one platform.",
    icon: "🎨",
  },
  {
    title: "True Pay-As-You-Go",
    description:
      "Skip seat licenses. Load credits only when needed, pay for actual usage, and auto-refill if you want.",
    icon: "💰",
  },
];

export function DruidxDifferenceSection() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_55%)]" />
        <div className="absolute inset-x-0 top-24 h-64 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70">
            DruidX Difference
          </span>

          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight text-white md:text-4xl">
            One Platform. Every AI Model. All Your Tools. Your Entire Team.
          </h2>

          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
            Everything your team needs. Nothing you don&apos;t.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 via-white/[0.02] to-transparent p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition hover:-translate-y-1.5 hover:border-blue-400/70 hover:shadow-[0_30px_90px_rgba(59,130,246,0.35)]"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 blur-3xl transition group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/15 via-cyan-400/10 to-transparent" />
              </div>
              <div className="relative">
                <span className="text-2xl">{feature.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


