"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LiveWaveformProps {
  stream: MediaStream | null;
  active?: boolean;
  processing?: boolean;
  className?: string;
  height?: number;
  barWidth?: number;
  barGap?: number;
  mode?: "static" | "scrolling";
  fadeEdges?: boolean;
  barColor?: string;
  historySize?: number;
}

export function LiveWaveform({
  stream,
  active = false,
  processing = false,
  className,
  height = 80,
  barWidth = 3,
  barGap = 2,
  mode = "static",
  fadeEdges = true,
  barColor = "gray",
  historySize = 120,
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const historyRef = useRef<number[][]>([]);

  useEffect(() => {
    if (!active) {
      // Cleanup when not active
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      historyRef.current = [];
      
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    // If active but no stream, show idle animation
    if (!stream) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Resize canvas to match its display size
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width && rect.width > 0) {
        canvas.width = rect.width;
      }
      canvas.height = height;

      // Get primary color once - properly handle OKLCH from globals.css
      const getColorFromCSS = () => {
        if (barColor === "gray") {
          return { r: 128, g: 128, b: 128 };
        }
        
        try {
          // Create a temporary element and apply the CSS variable
          // The browser will compute it to RGB regardless of the source format (OKLCH, HSL, etc.)
          const tempEl = document.createElement("div");
          tempEl.style.setProperty("color", `var(--${barColor})`);
          tempEl.style.position = "absolute";
          tempEl.style.visibility = "hidden";
          tempEl.style.top = "-9999px";
          tempEl.style.left = "-9999px";
          document.body.appendChild(tempEl);
          
          // Get computed color (browser converts OKLCH/HSL to RGB automatically)
          const computed = window.getComputedStyle(tempEl).color;
          document.body.removeChild(tempEl);
          
          // Parse RGB from computed style (format: "rgb(r, g, b)" or "rgba(r, g, b, a)")
          const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            return {
              r: parseInt(rgbMatch[1]),
              g: parseInt(rgbMatch[2]),
              b: parseInt(rgbMatch[3])
            };
          }
        } catch (e) {
          console.warn("Failed to parse color:", e);
        }
        
        // Fallback to a reasonable primary orange color
        return { r: 251, g: 146, b: 60 };
      };
      
      const colorValues = getColorFromCSS();
      const { r, g, b } = colorValues;

      const drawIdle = () => {
        if (!active) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const numBars = Math.floor((canvas.width + barGap) / (barWidth + barGap));
        const time = Date.now();
        
        for (let i = 0; i < numBars; i++) {
          const x = i * (barWidth + barGap);
          const wave = Math.sin(time / 500 + i * 0.3);
          const barHeight = 8 + Math.abs(wave) * 12;
          const y = (height - barHeight) / 2;
          const opacity = 0.3 + Math.abs(wave) * 0.3;
          
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
        
        animationFrameRef.current = requestAnimationFrame(drawIdle);
      };
      
      drawIdle();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Resize canvas to match its display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width && rect.width > 0) {
      canvas.width = rect.width;
    }
    canvas.height = height;

    try {
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Get primary color from CSS variables - properly handle OKLCH from globals.css
      const getColorFromCSS = () => {
        if (barColor === "gray") {
          return { r: 128, g: 128, b: 128 };
        }
        
        try {
          // Create a temporary element and apply the CSS variable
          // The browser will compute it to RGB regardless of the source format (OKLCH, HSL, etc.)
          const tempEl = document.createElement("div");
          tempEl.style.setProperty("color", `var(--${barColor})`);
          tempEl.style.position = "absolute";
          tempEl.style.visibility = "hidden";
          tempEl.style.top = "-9999px";
          tempEl.style.left = "-9999px";
          document.body.appendChild(tempEl);
          
          // Get computed color (browser converts OKLCH/HSL to RGB automatically)
          const computed = window.getComputedStyle(tempEl).color;
          document.body.removeChild(tempEl);
          
          // Parse RGB from computed style (format: "rgb(r, g, b)" or "rgba(r, g, b, a)")
          const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            return {
              r: parseInt(rgbMatch[1]),
              g: parseInt(rgbMatch[2]),
              b: parseInt(rgbMatch[3])
            };
          }
        } catch (e) {
          console.warn("Failed to parse color:", e);
        }
        
        // Fallback to a reasonable primary orange color
        return { r: 251, g: 146, b: 60 };
      };
      
      const colorValues = getColorFromCSS();
      const { r, g, b } = colorValues;

      const draw = () => {
        if (!active || !canvas || !ctx) {
          return;
        }

        animationFrameRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate number of bars that fit
        const numBars = Math.floor((canvas.width + barGap) / (barWidth + barGap));
        
        // Get amplitude data
        const amplitudes: number[] = [];
        for (let i = 0; i < numBars; i++) {
          const dataIndex = Math.floor((i / numBars) * bufferLength);
          const amplitude = dataArray[dataIndex] || 0;
          amplitudes.push(amplitude / 255); // Normalize to 0-1
        }

        // Add to history for scrolling mode
        if (mode === "scrolling") {
          historyRef.current.push(amplitudes);
          if (historyRef.current.length > historySize) {
            historyRef.current.shift();
          }
        }

        const drawBars = (bars: number[], xOffset: number = 0) => {
          bars.forEach((amplitude, i) => {
            const x = i * (barWidth + barGap) + xOffset;
            const barHeight = Math.max(2, amplitude * (height * 0.9));
            const y = (height - barHeight) / 2;

            // Fade edges
            let opacity = 1;
            if (fadeEdges) {
              const center = numBars / 2;
              const distance = Math.abs(i - center);
              const maxDistance = numBars / 2;
              opacity = 1 - (distance / maxDistance) * 0.5;
              opacity = Math.max(0.3, opacity);
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.fillRect(x, y, barWidth, barHeight);
          });
        };

        if (mode === "static") {
          drawBars(amplitudes);
        } else {
          // Scrolling mode - draw history
          historyRef.current.forEach((historicalBars, historyIndex) => {
            const xOffset = (historyIndex - historyRef.current.length) * (barWidth + barGap);
            if (xOffset + numBars * (barWidth + barGap) > 0 && xOffset < canvas.width) {
              drawBars(historicalBars, xOffset);
            }
          });
        }
      };

      draw();
    } catch (error) {
      console.error("Error setting up waveform:", error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      historyRef.current = [];
    };
  }, [stream, active, height, barWidth, barGap, mode, fadeEdges, barColor, historySize, processing]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width && rect.width > 0) {
        canvas.width = rect.width;
      }
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full", className)}
      style={{ height: `${height}px` }}
    />
  );
}
