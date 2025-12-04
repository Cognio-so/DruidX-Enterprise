import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Gemini,
  Slack,
  GoogleSheets,
  Notion,
  Calendar,
  Gmail,
} from "./logos";

type IntegrationCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  link?: string;
};

const IntegrationCard = ({
  title,
  description,
  children,
  link = "https://github.com/meschacirung/cnblocks",
}: IntegrationCardProps) => {
  return (
    <Card className="relative overflow-hidden border border-border/60 bg-gradient-to-b from-background/80 via-background/60 to-background/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/70 hover:shadow-[0_24px_80px_rgba(59,130,246,0.35)]">
      <div className="pointer-events-none absolute inset-px rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)] opacity-70 mix-blend-soft-light" />
      <div className="relative">
        <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-tr from-background/40 via-background/10 to-blue-500/10 p-2 ring-1 ring-white/10">
          <div className="*:size-10 *:shrink-0">{children}</div>
        </div>

        <div className="space-y-2 py-6">
          <h3 className="text-base font-medium tracking-tight">{title}</h3>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default function IntegrationsSection() {
  return (
    <section className="relative overflow-hidden bg-transparent py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_55%)]" />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-blue-200">
            Integrations
          </span>

          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Integrate with your favorite tools
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
            Connect seamlessly with popular platforms and services to enhance
            your workflow, keep your team in sync, and ship faster without
            switching tabs all day.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard
            title="Google Gemini"
            description="Ground your agents in Google's multimodal reasoning for smarter search, summarization, and on-brand content."
          >
            <Gemini />
          </IntegrationCard>

          <IntegrationCard
            title="Slack"
            description="Automate team communications, send notifications, and manage channels directly from your AI agents."
          >
            <Slack />
          </IntegrationCard>

          <IntegrationCard
            title="Google Sheets"
            description="Read, write, and analyze spreadsheet data automatically. Perfect for reports, tracking, and data management."
          >
            <GoogleSheets />
          </IntegrationCard>

          <IntegrationCard
            title="Notion"
            description="Sync your knowledge base, create pages, and update databases seamlessly with AI-powered automation."
          >
            <Notion />
          </IntegrationCard>

          <IntegrationCard
            title="Calendar"
            description="Schedule meetings, manage events, and coordinate team availability with intelligent calendar integration."
          >
            <Calendar />
          </IntegrationCard>

          <IntegrationCard
            title="Gmail"
            description="Automate email workflows, draft responses, and manage your inbox with AI-powered email agents."
          >
            <Gmail />
          </IntegrationCard>
        </div>
      </div>
    </section>
  );
}

