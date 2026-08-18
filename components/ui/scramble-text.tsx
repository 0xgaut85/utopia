"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

const SCRAMBLE_CHARS = "!@#%&?*=+<>{}[]/\\|~";

type ScrambleTextProps = {
  text: string;
  className?: string;
  duration?: number;
};

export function ScrambleText({ text, className, duration = 1300 }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.6 });
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!isInView) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return;
    }

    const chars = text.split("");
    let frame = 0;
    let start: number | null = null;

    function tick(time: number) {
      if (start === null) start = time;
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const revealCount = Math.floor(progress * chars.length);

      setDisplay(
        chars
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < revealCount) return char;
            return SCRAMBLE_CHARS[
              Math.floor(Math.random() * SCRAMBLE_CHARS.length)
            ];
          })
          .join("")
      );

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isInView, text, duration]);

  return (
    <span ref={ref} className={className}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
