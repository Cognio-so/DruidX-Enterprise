"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type CaseStudy = {
  id: string;
  label: string;
  emoji: string;
  quote: string;
  setup: string[];
  result: string;
  metrics: string[];
  cta?: string;
};

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "marketing-agency",
    label: "Digital Marketing Agency",
    emoji: "🎯",
    quote:
      '"Our content team went from 8 blog posts per week to 15—same headcount."',
    setup: [
      "Research agent finds trending topics in their niche",
      "Content agent drafts posts using their brand voice (trained on knowledge base)",
      "QA agent uses Agent Council to verify quality",
      "Publishing agent schedules to WordPress",
    ],
    result: "87% increase in output, 20% cost reduction vs hiring writers",
    metrics: ["87% ↑ output", "20% ↓ cost", "4 specialized agents"],
    cta: "View Workflow",
  },
  {
    id: "remote-saas",
    label: "Remote SaaS Startup",
    emoji: "📞",
    quote:
      '"We handle 200+ support tickets per day with 2 people instead of 5."',
    setup: [
      "Voice agent handles tier-1 support calls in English, Spanish, and French",
      "Text agent manages email tickets, pulling from documentation",
      "Escalation agent routes complex issues to humans with full context",
    ],
    result:
      "65% of issues resolved without human intervention, 40-minute average response time → 8 minutes",
    metrics: ["65% auto-resolve", "8 min response", "3 agents"],
    cta: "See Support Stack",
  },
  {
    id: "consulting-firm",
    label: "Consulting Firm",
    emoji: "💼",
    quote: '"Proposal creation dropped from 8 hours to 45 minutes."',
    setup: [
      "Research agent analyzes client’s industry, competitors, pain points",
      "Strategy agent drafts recommendations using firm methodology",
      "Design agent generates proposal visuals",
      "Review agent runs Agent Council quality check",
    ],
    result: "10x faster proposals, consistent quality, 30% higher close rate",
    metrics: ["10× faster", "30% ↑ close rate", "4 collaborative agents"],
    cta: "Preview Template",
  },
  {
    id: "ecommerce-brand",
    label: "E-Commerce Brand",
    emoji: "🌍",
    quote: '"We launched in 3 new countries without hiring local teams."',
    setup: [
      "Voice agents handle customer service in local languages (90+ supported)",
      "Research agents monitor local competitor pricing and trends",
      "Content agents adapt product descriptions for cultural relevance",
    ],
    result: "$2M in new market revenue, 1/5th the expansion cost projected",
    metrics: ["$2M new revenue", "5× cheaper", "90+ languages"],
    cta: "See Expansion Playbook",
  },
];

export function RealUseCasesSection() {
  const [activeId, setActiveId] = useState(CASE_STUDIES[0]?.id);
  const activeCase = CASE_STUDIES.find((item) => item.id === activeId);

  return (
    <section className="relative isolate overflow-hidden bg-transparent py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />
        <div className="absolute inset-x-0 top-40 h-72 bg-gradient-to-r from-blue-400/15 via-transparent to-cyan-500/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-white/70">
             Real Use Cases
          </span>
          <h2 className="mt-6 text-balance text-3xl font-semibold leading-tight md:text-4xl">
            See How Teams Like Yours Use DruidX
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
            Inspired by Aceternity’s case-study layouts with pill buttons that
            reveal detailed stories—tap a use case to see the workflow and
            metrics that matter.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-6 lg:flex-row">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-sm lg:grid-cols-1">
            {CASE_STUDIES.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`flex items-center justify-between rounded-3xl border px-5 py-4 text-left transition ${
                    isActive
                      ? "border-blue-400/70 bg-blue-400/10 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                  }`}
                >
                  <span className="flex items-center gap-3 text-sm font-medium">
                    <span className="text-lg">{item.emoji}</span>
                    {item.label}
                  </span>
                  <ChevronRight
                    className={`size-4 ${
                      isActive ? "opacity-100" : "opacity-40"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {activeCase && (
            <article className="flex-1 rounded-4xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent p-8 shadow-[0_25px_100px_rgba(0,0,0,0.45)]">
              <header className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-300/80">
                  Case Study
                </p>
                <h3 className="text-2xl font-semibold text-white">
                  {activeCase.emoji} {activeCase.label}
                </h3>
                <p className="text-lg italic text-white/80">
                  {activeCase.quote}
                </p>
              </header>

              <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-200/70">
                    Setup
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-200/80">
                    {activeCase.setup.map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5/50 p-3"
                      >
                        <span className="mt-1 size-1.5 rounded-full bg-blue-300" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200/80">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      Result
                    </p>
                    <p className="mt-2 text-base font-medium text-white/90">
                      {activeCase.result}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                      Metrics
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeCase.metrics.map((metric) => (
                        <span
                          key={metric}
                          className="rounded-full border border-white/20 px-3 py-1 text-xs text-white"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="mt-auto w-full rounded-full border border-white/30 bg-white/10 text-sm font-semibold text-white hover:border-blue-400/70 hover:bg-blue-400/20"
                  >
                    <Link href="https://pro.aceternity.com/templates" target="_blank">
                      {activeCase.cta ?? "Learn More"}
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}


