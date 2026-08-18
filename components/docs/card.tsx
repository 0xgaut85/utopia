import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps = {
  title: string;
  href?: string;
  children?: ReactNode;
  className?: string;
};

export function Card({ title, href, children, className }: CardProps) {
  const inner = (
    <div
      className={cn(
        "group glass flex h-full flex-col gap-2 rounded-glass-sm p-5 transition-transform",
        href && "hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold tracking-tight text-ink">
          {title}
        </h4>
        {href ? (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        ) : null}
      </div>
      {children ? (
        <div className="text-sm leading-relaxed text-ink-soft [&>p]:m-0">
          {children}
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full no-underline">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function CardGrid({
  children,
  cols = 2,
}: {
  children: ReactNode;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "my-6 grid grid-cols-1 gap-4",
        cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {children}
    </div>
  );
}
