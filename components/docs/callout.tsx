import type { ReactNode } from "react";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutProps = {
  type?: "info" | "tip" | "warning";
  title?: string;
  children: ReactNode;
};

const config = {
  info: {
    icon: Info,
    classes: "border-line bg-fog/60 text-ink",
    iconClasses: "text-ink-soft",
  },
  tip: {
    icon: Lightbulb,
    classes: "border-accent-soft bg-accent-soft/25 text-ink",
    iconClasses: "text-accent",
  },
  warning: {
    icon: TriangleAlert,
    classes: "border-ink/20 bg-ink/[0.04] text-ink",
    iconClasses: "text-ink",
  },
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const { icon: Icon, classes, iconClasses } = config[type];

  return (
    <div
      className={cn(
        "my-6 flex gap-3 rounded-glass-sm border px-5 py-4",
        classes
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClasses)} />
      <div className="text-sm leading-relaxed [&>p]:m-0">
        {title ? <p className="mb-1 font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
