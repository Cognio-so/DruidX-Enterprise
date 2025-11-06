"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Search, Brain, FileText, CheckCircle2 } from "lucide-react";

interface ResearchPhaseShimmerProps {
  phase: string;
  message?: string;
  iteration?: number;
  maxIterations?: number;
}

const phaseConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  planning: {
    icon: <Brain className="h-4 w-4" />,
    label: "Planning",
    color: "text-blue-500",
  },
  planning_complete: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Planning Complete",
    color: "text-green-500",
  },
  waiting_approval: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Waiting for Approval",
    color: "text-yellow-500",
  },
  execution: {
    icon: <Search className="h-4 w-4" />,
    label: "Research Execution",
    color: "text-purple-500",
  },
  gap_analysis: {
    icon: <Brain className="h-4 w-4" />,
    label: "Gap Analysis",
    color: "text-orange-500",
  },
  synthesis: {
    icon: <FileText className="h-4 w-4" />,
    label: "Synthesis",
    color: "text-indigo-500",
  },
};

export function ResearchPhaseShimmer({ phase, message, iteration, maxIterations }: ResearchPhaseShimmerProps) {
  const config = phaseConfig[phase] || {
    icon: <Brain className="h-4 w-4" />,
    label: phase,
    color: "text-gray-500",
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-3">
      <div className="flex items-center gap-3 bg-muted/60 border border-border rounded-lg p-4">
        <div className={`flex-shrink-0 ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${config.color}`}>
              {config.label}
            </span>
            {iteration && maxIterations && (
              <span className="text-xs text-muted-foreground">
                ({iteration}/{maxIterations})
              </span>
            )}
          </div>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
          <div className="space-y-2 mt-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

