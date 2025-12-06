import React from "react";

const STEPS = [
  {
    number: "1",
    title: "Describe",
    description:
      'Chat with the builder: "I need an agent that qualifies leads."',
  },
  {
    number: "2",
    title: "Connect",
    description: "Link HubSpot, Slack, Gmail. We handle the auth.",
  },
  {
    number: "3",
    title: "Deploy",
    description: "Hit Launch. Your agent is live instantly.",
  },
  {
    number: "4",
    title: "Assign",
    description: "Give it to your team. Track conversations.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl mb-2">
            From Idea to Deployed Agent
          </h2>
          <p className="text-blue-400 text-4xl font-semibold sm:text-5xl md:text-6xl">
            in Under 10 Minutes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <article
              key={step.number}
              className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 hover:border-blue-500/30 transition-all"
            >
              <div className="flex flex-col items-center text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-blue-500/20 border border-blue-500/30 text-2xl font-bold text-blue-400 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
