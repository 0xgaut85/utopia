import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PlaceholderProps = {
  label: string;
  aspect?: string;
  className?: string;
  dark?: boolean;
};

export function Placeholder({
  label,
  aspect = "aspect-[4/3]",
  className,
  dark = false,
}: PlaceholderProps) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-glass border border-dashed",
        aspect,
        dark
          ? "border-white/20 bg-white/5"
          : "border-ink/15 bg-ink/[0.02]",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-3 px-6 text-center",
          dark ? "text-white/40" : "text-ink/35"
        )}
      >
        <ImageIcon className="h-6 w-6" strokeWidth={1.25} />
        <span className="text-xs font-medium uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          dark
            ? "bg-[linear-gradient(135deg,transparent_48%,rgba(255,255,255,0.06)_50%,transparent_52%)]"
            : "bg-[linear-gradient(135deg,transparent_48%,rgba(0,0,0,0.03)_50%,transparent_52%)]"
        )}
      />
    </div>
  );
}
