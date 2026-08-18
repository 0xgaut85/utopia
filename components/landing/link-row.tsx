import Link from "next/link";
import { ComingSoonTrigger } from "@/components/coming-soon";

type LinkItem = {
  label: string;
  href: string;
  external?: boolean;
  comingSoon?: boolean;
};

type LinkRowProps = {
  items: LinkItem[];
};

export function LinkRow({ items }: LinkRowProps) {
  return (
    <p className="font-mono text-[13px] leading-relaxed">
      {items.map((item, index) => (
        <span key={item.href}>
          {item.comingSoon ? (
            <ComingSoonTrigger className="underline underline-offset-2 hover:text-ink/60">
              {item.label}
            </ComingSoonTrigger>
          ) : item.external ? (
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-ink/60"
            >
              {item.label}
            </a>
          ) : (
            <Link
              href={item.href}
              className="underline underline-offset-2 hover:text-ink/60"
            >
              {item.label}
            </Link>
          )}
          {index < items.length - 1 ? (
            <span className="mx-1.5 text-ink/30">/</span>
          ) : null}
        </span>
      ))}
    </p>
  );
}
