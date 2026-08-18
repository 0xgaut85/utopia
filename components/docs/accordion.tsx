import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function AccordionGroup({ children }: { children: ReactNode }) {
  return <div className="my-6 flex flex-col gap-3">{children}</div>;
}

export function Accordion({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="glass group rounded-glass-sm px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold tracking-tight text-ink">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-ink-soft [&>p]:m-0">
        {children}
      </div>
    </details>
  );
}
