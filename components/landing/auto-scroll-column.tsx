"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AutoScrollColumnProps = {
  direction: "up" | "down";
  speed?: number;
  className?: string;
  children: ReactNode;
};

export function AutoScrollColumn({
  direction,
  speed = 55,
  className,
  children,
}: AutoScrollColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const content = contentRef.current;
    if (!el || !content) return;

    let half = 0;
    // Own float position so sub-pixel increments never get lost to
    // scrollTop rounding in browsers that round to device pixels.
    let pos = 0;
    let paused = false;
    let positioned = false;

    function syncStart() {
      if (positioned || half <= 0) return;
      positioned = true;
      pos = direction === "down" ? half : 0;
      el!.scrollTop = pos;
    }

    const resizeObserver = new ResizeObserver(() => {
      const measured = content.scrollHeight;
      if (measured > 0) {
        half = measured;
        syncStart();
      }
    });
    resizeObserver.observe(content);
    half = content.scrollHeight;
    syncStart();

    const pause = () => {
      paused = true;
    };
    const resume = () => {
      paused = false;
      // The user may have scrolled manually while hovered.
      pos = el!.scrollTop;
    };

    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);
    el.addEventListener("touchcancel", resume);

    let last = performance.now();
    const intervalId = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - last, 100);
      last = now;
      if (paused || half <= 0) return;

      const delta = speed * (dt / 1000);
      if (direction === "up") {
        pos += delta;
        if (pos >= half) pos -= half;
      } else {
        pos -= delta;
        if (pos <= 0) pos += half;
      }
      el.scrollTop = pos;
    }, 16);

    return () => {
      window.clearInterval(intervalId);
      resizeObserver.disconnect();
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("touchcancel", resume);
    };
  }, [direction, speed]);

  return (
    <div
      ref={containerRef}
      data-lenis-prevent
      className={cn("no-scrollbar overflow-y-auto overscroll-contain", className)}
    >
      <div ref={contentRef} className="flex flex-col divide-y divide-line/70">
        {children}
      </div>
      <div aria-hidden className="flex flex-col divide-y divide-line/70">
        {children}
      </div>
    </div>
  );
}
