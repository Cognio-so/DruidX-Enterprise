"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseChatScrollOptions {
  threshold?: number; // Distance from bottom to consider "at bottom" (default: 50px)
  enabled?: boolean; // Whether auto-scroll is enabled (default: true)
}

interface UseChatScrollReturn {
  shouldAutoScroll: boolean;
  scrollToBottom: () => void;
  scrollContainerRef: React.MutableRefObject<HTMLElement | null>;
  isAtBottom: boolean;
}

/**
 * Custom hook to manage chat scroll behavior with manual override support.
 * Only auto-scrolls when user is at (or near) the bottom of the chat container.
 * Allows users to scroll up and read previous messages without interruption.
 */
export function useChatScroll(
  options: UseChatScrollOptions = {}
): UseChatScrollReturn {
  const { threshold = 50, enabled = true } = options;
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Check if user is at bottom of scroll container
  const checkIfAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return false;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [threshold]);

  // Handle scroll events to detect user position
  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    setShouldAutoScroll(atBottom && enabled);
  }, [checkIfAtBottom, enabled]);

  // Scroll to bottom of container
  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
    setIsAtBottom(true);
    setShouldAutoScroll(true);
  }, []);

  // Set up scroll event listener - re-runs when handleScroll changes
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let timeoutId: NodeJS.Timeout | undefined;

    const setupListeners = (container: HTMLElement) => {
      // Initial check
      handleScroll();

      // Listen for scroll events
      container.addEventListener("scroll", handleScroll, { passive: true });

      // Also listen for resize events (content might change)
      const resizeObserver = new ResizeObserver(() => {
        handleScroll();
      });
      resizeObserver.observe(container);

      return () => {
        container.removeEventListener("scroll", handleScroll);
        resizeObserver.disconnect();
      };
    };

    const container = scrollContainerRef.current;
    if (!container) {
      // If container not available, check again after a short delay
      timeoutId = setTimeout(() => {
        const container = scrollContainerRef.current;
        if (container) {
          cleanup = setupListeners(container);
        }
      }, 100);
    } else {
      cleanup = setupListeners(container);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (cleanup) cleanup();
    };
  }, [handleScroll]);

  // Update shouldAutoScroll when enabled changes
  useEffect(() => {
    if (enabled && isAtBottom) {
      setShouldAutoScroll(true);
    } else if (!enabled) {
      setShouldAutoScroll(false);
    }
  }, [enabled, isAtBottom]);

  return {
    shouldAutoScroll,
    scrollToBottom,
    scrollContainerRef,
    isAtBottom,
  };
}

