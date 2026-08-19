"use client";

import { cn } from "@/lib/utils";

type AvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-20 w-20 text-2xl",
};

export function Avatar({ username, avatarUrl, size = "md", className }: AvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars are data URLs, next/image adds nothing
      <img
        src={avatarUrl}
        alt={username}
        className={cn(
          "shrink-0 border border-line/70 object-cover",
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
        "flex shrink-0 items-center justify-center border border-line/70 bg-ink font-mono uppercase text-mist",
        sizeClass[size],
        className
      )}
    >
      {username.slice(0, 1)}
    </span>
  );
}
