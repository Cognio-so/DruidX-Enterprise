"use client";

import { cn } from "@/lib/utils";

interface ShimmeringTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle";
}

export function ShimmeringText({ 
  children, 
  className,
  variant = "default"
}: ShimmeringTextProps) {
  return (
    <span
      className={cn(
        "inline-block relative",
        "bg-clip-text text-transparent bg-gradient-to-r bg-[length:200%_auto]",
        variant === "default"
          ? "from-primary via-primary/60 to-primary"
          : "from-foreground/80 via-foreground/40 to-foreground/80",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )}
      style={{
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  );
}

