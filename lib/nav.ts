export type NavLink = {
  title: string;
  href: string;
};

export type NavGroup = {
  title: string;
  items: NavLink[];
};

export const navTree: NavGroup[] = [
  {
    title: "Get started",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Quickstart", href: "/docs/quickstart" },
      { title: "FAQ", href: "/docs/faq" },
    ],
  },
  {
    title: "Contribute",
    items: [
      { title: "Capture and privacy", href: "/docs/contribute/capture" },
      { title: "Bounties", href: "/docs/contribute/bounties" },
      {
        title: "Points and wallet",
        href: "/docs/contribute/points-and-wallet",
      },
    ],
  },
  {
    title: "Protocol",
    items: [
      { title: "How verification works", href: "/docs/protocol/verification" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { title: "How Utopia works", href: "/docs/concepts/overview" },
      { title: "Edge nodes", href: "/docs/concepts/edge-nodes" },
      { title: "Ground truth", href: "/docs/concepts/ground-truth" },
      { title: "Data pipeline", href: "/docs/concepts/data-pipeline" },
    ],
  },
  {
    title: "Data",
    items: [
      { title: "Privacy at capture", href: "/docs/data/edge-privacy" },
      {
        title: "Cryptographic provenance",
        href: "/docs/data/cryptographic-provenance",
      },
      { title: "Data sovereignty", href: "/docs/data/data-sovereignty" },
    ],
  },
  {
    title: "Use cases",
    items: [
      {
        title: "Sovereign defense",
        href: "/docs/use-cases/sovereign-defense",
      },
      { title: "Embodied AI", href: "/docs/use-cases/embodied-ai" },
      {
        title: "Autonomous logistics",
        href: "/docs/use-cases/autonomous-logistics",
      },
      {
        title: "Critical infrastructure",
        href: "/docs/use-cases/critical-infrastructure",
      },
    ],
  },
  {
    title: "Enterprise",
    items: [
      { title: "For enterprise", href: "/docs/enterprise/overview" },
      { title: "API overview", href: "/docs/enterprise/api" },
      { title: "Pricing", href: "/docs/pricing" },
      { title: "Service levels", href: "/docs/sla" },
    ],
  },
  {
    title: "API reference",
    items: [
      { title: "Overview", href: "/docs/api/overview" },
      { title: "Authentication", href: "/docs/api/authentication" },
      { title: "Spatial queries", href: "/docs/api/spatial-queries" },
      { title: "Data ingestion", href: "/docs/api/data-ingestion" },
      { title: "Streaming", href: "/docs/api/streaming" },
    ],
  },
  {
    title: "Legal",
    items: [
      { title: "Terms of service", href: "/docs/legal/terms-of-service" },
      { title: "Privacy policy", href: "/docs/legal/privacy-policy" },
    ],
  },
];

export const flatNav: NavLink[] = navTree.flatMap((group) => group.items);

export function getAdjacentPages(pathname: string) {
  const index = flatNav.findIndex((item) => item.href === pathname);
  if (index === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: index > 0 ? flatNav[index - 1] : null,
    next: index < flatNav.length - 1 ? flatNav[index + 1] : null,
  };
}
