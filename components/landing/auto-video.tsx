"use client";

import { useEffect, useRef } from "react";

type AutoVideoProps = {
  src: string;
  className?: string;
  label?: string;
};

export function AutoVideo({ src, className, label }: AutoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  // React does not render the muted attribute into SSR HTML, which makes
  // browsers refuse to autoplay. Set it imperatively and kick playback off.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
}
