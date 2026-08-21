"use client";

import { hasFlag } from "country-flag-icons";
import * as FlagIcons from "country-flag-icons/react/3x2";

export function CountryFlag({
  code,
  title,
  className,
}: {
  code: string;
  title?: string;
  className?: string;
}) {
  if (!hasFlag(code)) return null;
  const Icon = FlagIcons[code as keyof typeof FlagIcons];
  if (!Icon) return null;
  return <Icon title={title ?? code} className={className} />;
}
