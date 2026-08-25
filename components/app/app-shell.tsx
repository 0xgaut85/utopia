"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const light = /analytics/.test(pathname);

  return (
    <div
      className={cn(
        "app-shell flex min-h-svh flex-col overflow-x-clip",
        light && "app-light"
      )}
    >
      {children}
    </div>
  );
}
