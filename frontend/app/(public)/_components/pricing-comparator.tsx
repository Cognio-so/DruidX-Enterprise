import React from "react";

const FEATURES = [
  {
    title: "White-Label & Resell",
    emoji: "💰",
    description:
      "Include DruidX agents in client deliverables. Bill clients for AI services without revealing your tools.",
    highlight:
      "Agency charges $2K/mo for voice agent, costs them $150 in credits.",
  },
  {
    title: "Client Reporting Built-In",
    emoji: "📊",
    description:
      "Track agent performance per client. Generate usage reports. Show ROI with built-in analytics.",
    highlight: '"Our AI agents handled 1,200 inquiries with 92% satisfaction."',
  },
  {
    title: "Fast Deployment = More Projects",
    emoji: "⚡",
    description:
      "The faster you spin up agents, the more clients you serve. Junior team members can create agents.",
    highlight: "Take on 2-3x more clients without scaling headcount.",
  },
  {
    title: "Client Data Isolation",
    emoji: "🔒",
    description:
      "Each client's agents and data are isolated. Full compliance for enterprise clients.",
    highlight: "Enterprise plan: Full on-premise deployment available.",
  },
];

export default function PricingComparator() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl max-w-3xl mx-auto font-bold text-white text-5xl">
            Built for Teams That Bill Clients
            <span className="text-blue-400"> Not Just Use AI Internally</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm p-8 transition hover:border-blue-500/30"
            >
              <div className="relative z-10">
                <div className="text-3xl mb-4">{feature.emoji}</div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  {feature.description}
                </p>
                <p className="text-cyan-400/90 text-sm italic font-medium">
                  {feature.highlight}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
