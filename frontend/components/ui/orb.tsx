"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type OrbProps = ComponentProps<"div">;

export const Orb = ({ className, ...props }: OrbProps) => (
  <div
    className={cn(
      "relative size-full",
      "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500",
      "rounded-full",
      "animate-pulse",
      className
    )}
    {...props}
  >
    <div 
      className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-transparent"
      style={{
        animation: "spin 3s linear infinite"
      }}
    />
    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-75" />
  </div>
);

