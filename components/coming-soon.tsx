import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const APP_URL = "https://app.utopiadata.net";

/**
 * The app subdomain handles its own coming soon state via the APP_LIVE
 * environment variable, so launch triggers are now plain links.
 */
export function ComingSoonProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type ComingSoonTriggerProps = {
  className?: string;
  children: ReactNode;
};

export function ComingSoonTrigger({
  className,
  children,
}: ComingSoonTriggerProps) {
  return (
    <a href={APP_URL} className={cn("cursor-pointer", className)}>
      {children}
    </a>
  );
}
