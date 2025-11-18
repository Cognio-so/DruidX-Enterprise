"use client";

import { useCallback, useRef, useState } from "react";

interface EnhanceOptions {
  instructions: string;
  gptName?: string;
  gptDescription?: string;
  onChunk: (value: string) => void;
}

export function usePromptEnhancer() {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const enhanceInstructions = useCallback(
    async ({ instructions, gptName, gptDescription, onChunk }: EnhanceOptions) => {
      if (!instructions?.trim()) {
        throw new Error("Add some initial instructions before enhancing.");
      }

      if (isEnhancing) {
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsEnhancing(true);

      try {
        const response = await fetch("/api/gpts/prompt-enhance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instructions,
            gptName,
            gptDescription,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.error || "Failed to enhance instructions.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let enhancedText = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          enhancedText += chunk;
          onChunk(enhancedText);
        }

        return enhancedText;
      } finally {
        controllerRef.current = null;
        setIsEnhancing(false);
      }
    },
    [isEnhancing]
  );

  const cancelEnhancement = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsEnhancing(false);
  }, []);

  return { enhanceInstructions, isEnhancing, cancelEnhancement };
}

