"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type OrbProps = ComponentProps<"div"> & {
  colors?: [string, string];
  seed?: number;
};

export const Orb = ({
  className,
  colors = ["#CADCFC", "#A0B9D1"],
  seed = 1000,
  ...props
}: OrbProps) => {
  const [color1, color2] = colors;

  const s = Math.abs(Math.floor(seed));
  const offsetX = ((Math.sin(s) * 10000) % 20) - 10;
  const offsetY = ((Math.cos(s) * 10000) % 20) - 10;

  return (
    <div
      className={cn(
        "relative h-full w-full rounded-full overflow-hidden",
        className
      )}
      style={{
        background: `radial-gradient(circle at ${50 + offsetX}% ${50 + offsetY}%, ${color1} 0%, ${color2} 100%)`,
      }}
      {...props}
    >
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${30 + offsetX}% ${30 + offsetY}%, rgba(255,255,255,0.28) 0%, transparent 70%)`,
        }}
      />

      <div
        className="absolute inset-2 rounded-full opacity-70 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${50 + offsetX}% ${50 + offsetY}%, ${color1} 0%, ${color2} 100%)`,
        }}
      />
    </div>
  );
};
