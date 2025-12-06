"use client";

import React from "react";

type CaseStudy = {
  id: string;
  label: string;
  emoji: string;
  quote: string;
  result: string;
};

const CASE_STUDIES: CaseStudy[] = [
  {
    id: "marketing-agency",
    label: "Digital Marketing Agency",
    emoji: "🎯",
    quote:
      '"Our content team went from 8 blog posts per week to 15—same headcount."',
    result: "87% increase in output, 20% cost reduction",
  },
  {
    id: "remote-saas",
    label: "Remote SaaS Startup (25 people)",
    emoji: "📞",
    quote:
      '"We handle 200+ support tickets per day with 2 people instead of 5."',
    result: "65% resolved without human, 40min → 8min response",
  },
  {
    id: "consulting-firm",
    label: "Consulting Firm",
    emoji: "💼",
    quote: '"Proposal creation dropped from 8 hours to 45 minutes."',
    result: "10x faster proposals, 30% higher close rate",
  },
  {
    id: "ecommerce-brand",
    label: "E-Commerce Brand (International)",
    emoji: "🌍",
    quote: '"We launched in 3 new countries without hiring local teams."',
    result: "$2M new market revenue, 1/5th expansion cost",
  },
];

export function RealUseCasesSection() {
  return (
    <section className="relative isolate overflow-hidden bg-transparent py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl mb-2">
            See How Teams Like Yours
          </h2>
          <p className="text-blue-400 text-4xl font-semibold sm:text-5xl md:text-6xl">
            Use DruidX
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CASE_STUDIES.map((caseStudy) => (
            <article
              key={caseStudy.id}
              className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 hover:border-blue-500/30 transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">{caseStudy.emoji}</span>
                <h3 className="text-xl font-semibold">{caseStudy.label}</h3>
              </div>
              <p className="text-cyan-400 italic text-base mb-4">
                {caseStudy.quote}
              </p>
              <p className="text-green-400 font-semibold text-sm">
                {caseStudy.result}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
