"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type AvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ username, avatarUrl, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- mix of data URLs and library portraits
      <img
        src={avatarUrl}
        alt={username}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeClass[size],
          className
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-app-surface-hi font-medium uppercase text-app-text",
        sizeClass[size],
        className
      )}
    >
      {username.slice(0, 1)}
    </span>
  );
}
