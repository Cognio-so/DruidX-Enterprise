"use client";

import { Search, Brain, FileText, CheckCircle2, Loader2, FileQuestion, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { useState } from "react";

interface ResearchPhase {
  phase: string;
  message?: string;
  iteration?: number;
  maxIterations?: number;
  status?: "pending" | "active" | "completed";
  reasoning?: string;
}

interface ResearchTimelineProps {
  phases: ResearchPhase[];
  currentPhase?: string;
}

const phaseConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  planning: {
    icon: <FileQuestion className="h-5 w-5" />,
    label: "Generating Search Queries",
    color: "text-blue-500",
  },
  planning_complete: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    label: "Planning Complete",
    color: "text-green-500",
  },
  waiting_approval: {
    icon: <FileQuestion className="h-5 w-5" />,
    label: "Awaiting Approval",
    color: "text-yellow-500",
  },
  execution: {
    icon: <Search className="h-5 w-5" />,
    label: "Web Research",
    color: "text-purple-500",
  },
  gap_analysis: {
    icon: <Brain className="h-5 w-5" />,
    label: "Reflection",
    color: "text-orange-500",
  },
  synthesis: {
    icon: <FileText className="h-5 w-5" />,
    label: "Synthesis",
    color: "text-indigo-500",
  },
};

export function ResearchTimeline({ phases, currentPhase }: ResearchTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (phases.length === 0) return null;

  const activePhase = phases.find(p => p.phase === currentPhase);
  const allCompleted = phases.every(p => p.status === "completed");
  
  // Show all phases - don't hide any completed steps
  const visiblePhases = phases;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-muted/40 border border-border rounded-lg hover:bg-muted/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Research</h3>
              <span className="text-xs text-muted-foreground">({phases.length} steps)</span>
            </div>
            {activePhase && !allCompleted && (
              <span className="text-xs text-muted-foreground">
                • {phaseConfig[activePhase.phase]?.label || activePhase.phase}
                {activePhase.iteration && activePhase.maxIterations && (
                  <span> (Iteration {activePhase.iteration}/{activePhase.maxIterations})</span>
                )}
              </span>
            )}
            {allCompleted && (
              <span className="text-xs text-green-500">• Complete</span>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <div className="bg-muted/40 border border-border rounded-lg p-6">
            <div className="space-y-4">
              {visiblePhases.map((phase, index) => {
                const config = phaseConfig[phase.phase] || {
                  icon: <Brain className="h-5 w-5" />,
                  label: phase.phase,
                  color: "text-gray-500",
                };
                
                const isActive = phase.phase === currentPhase && phase.status !== "completed";
                const isCompleted = phase.status === "completed";
                
                return (
                  <div key={`${phase.phase}-${index}`} className="flex gap-4">
                    {/* Timeline line and icon */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "rounded-full p-2 border-2 transition-colors flex items-center justify-center",
                          isActive
                            ? "bg-primary/10 border-primary"
                            : isCompleted
                            ? "bg-green-500/10 border-green-500"
                            : "bg-muted border-border"
                        )}
                      >
                        {isActive ? (
                          <Loader2 className={cn("h-5 w-5 animate-spin", config.color)} />
                        ) : isCompleted ? (
                          <div className="relative">
                            <div className={cn("h-5 w-5", config.color)}>{config.icon}</div>
                            <CheckCircle2 className="h-3 w-3 text-green-500 absolute -bottom-0.5 -right-0.5 bg-background rounded-full" />
                          </div>
                        ) : (
                          <div className={cn("h-5 w-5", config.color)}>{config.icon}</div>
                        )}
                      </div>
                      {index < visiblePhases.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 h-full min-h-[40px] mt-2",
                            isCompleted ? "bg-green-500" : "bg-border"
                          )}
                        />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        {isActive ? (
                          <>
                            <ShimmeringText className="font-medium">
                              {config.label}
                            </ShimmeringText>
                            {phase.iteration && phase.maxIterations && (
                              <span className="text-muted-foreground">
                                (Iteration {phase.iteration}/{phase.maxIterations})
                              </span>
                            )}
                            {phase.message && (
                              <span className="text-muted-foreground"> - {phase.message}</span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className={cn("font-medium", isCompleted ? "text-green-500" : "text-muted-foreground")}>
                              {config.label}
                            </span>
                            {phase.iteration && phase.maxIterations && (
                              <span className="text-xs text-muted-foreground">
                                (Iteration {phase.iteration}/{phase.maxIterations})
                              </span>
                            )}
                            {phase.message && !isCompleted && (
                              <span className="text-muted-foreground"> - {phase.message}</span>
                            )}
                          </>
                        )}
                      </div>
                      {/* Reasoning trace description */}
                      {phase.reasoning && (
                        <div className="mt-2 text-xs">
                          <ShimmeringText variant="subtle" className="text-muted-foreground italic">
                            {phase.reasoning}
                          </ShimmeringText>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

