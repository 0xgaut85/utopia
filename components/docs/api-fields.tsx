import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ParamFieldProps = {
  name: string;
  type: string;
  required?: boolean;
  children: ReactNode;
};

export function ParamField({ name, type, required, children }: ParamFieldProps) {
  return (
    <div className="border-b border-line/70 py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-ink/[0.05] px-1.5 py-0.5 font-mono text-sm font-semibold text-ink">
          {name}
        </code>
        <span className="font-mono text-xs text-ink-soft">{type}</span>
        {required ? (
          <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            required
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 text-sm leading-relaxed text-ink-soft [&>p]:m-0">
        {children}
      </div>
    </div>
  );
}

export function ResponseField({ name, type, children }: Omit<ParamFieldProps, "required">) {
  return (
    <div className="border-b border-line/70 py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-ink/[0.05] px-1.5 py-0.5 font-mono text-sm font-semibold text-ink">
          {name}
        </code>
        <span className="font-mono text-xs text-ink-soft">{type}</span>
      </div>
      <div className="mt-1.5 text-sm leading-relaxed text-ink-soft [&>p]:m-0">
        {children}
      </div>
    </div>
  );
}

export function FieldGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("glass my-6 rounded-glass-sm px-5", className)}>
      {children}
    </div>
  );
}
