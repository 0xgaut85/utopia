import Image from "next/image";
import Link from "next/link";
import { ComingSoonTrigger } from "@/components/coming-soon";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/pricing", label: "Pricing" },
      { href: "https://app.utopiadata.net", label: "Launch app", comingSoon: true },
    ],
  },
  {
    title: "Network",
    links: [
      { href: "/docs/contribute/capture", label: "Capture and privacy" },
      { href: "/docs/contribute/bounties", label: "Bounties" },
      { href: "/docs/protocol/verification", label: "Verification" },
      { href: "/docs/concepts/overview", label: "How it works" },
    ],
  },
  {
    title: "Enterprise",
    links: [
      { href: "/docs/enterprise/overview", label: "For enterprise" },
      { href: "/docs/api/overview", label: "API reference" },
      { href: "/docs/data/data-sovereignty", label: "Data sovereignty" },
      { href: "/docs/sla", label: "Service levels" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/docs/legal/terms-of-service", label: "Terms of service" },
      { href: "/docs/legal/privacy-policy", label: "Privacy policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line/70 bg-mist px-6 py-16 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <div className="max-w-xs">
            <span className="flex items-center gap-2">
              <Image
                src="/logo-utopia.png"
                alt="Utopia"
                width={28}
                height={28}
                className="h-6 w-6"
              />
              <span className="text-lg font-semibold tracking-tight text-ink">
                Utopia
              </span>
            </span>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              The world&apos;s largest source of ground level spatial data.
              Building the training set for a global LLM of physical reality.
            </p>
            <a
              href="https://x.com/utopiadata"
              target="_blank"
              rel="noreferrer"
              aria-label="Utopia on X"
              className="mt-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M13.6 10.6 21 2h-2l-6.4 7.5L7.2 2H1l7.7 11.1L1 22h2l6.9-8 5.9 8H22l-8.4-11.4Zm-2.4 2.8-.8-1.1L3.9 3.5h2.6l5.1 7.3.8 1.1 6.6 9.4h-2.6l-5.2-7.9Z" />
              </svg>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      {"comingSoon" in link && link.comingSoon ? (
                        <ComingSoonTrigger className="text-sm text-ink-soft transition-colors hover:text-ink">
                          {link.label}
                        </ComingSoonTrigger>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-ink-soft transition-colors hover:text-ink"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-line/70 pt-8 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <span>Copyright Utopia Data 2026.</span>
          <span>Ground level, verifiable, captured by people.</span>
        </div>
      </div>
    </footer>
  );
}
