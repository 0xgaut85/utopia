"use client";

import { cn } from "@/lib/utils";

type AvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({ username, avatarUrl, size = "md", className }: AvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars are data URLs, next/image adds nothing
      <img
        src={avatarUrl}
        alt={username}
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
