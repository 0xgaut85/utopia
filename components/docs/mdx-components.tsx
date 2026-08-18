import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { Callout } from "./callout";
import { Card, CardGrid } from "./card";
import { Steps, Step } from "./steps";
import { Accordion, AccordionGroup } from "./accordion";
import { ParamField, ResponseField, FieldGroup } from "./api-fields";
import { CodeGroup } from "./code-group";
import { Placeholder } from "@/components/ui/placeholder";
import { ComingSoonTrigger } from "@/components/coming-soon";

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1
      className="mt-0 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="group mt-12 scroll-mt-28 font-display text-2xl font-medium tracking-tight text-ink first:mt-0"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="group mt-8 scroll-mt-28 text-lg font-semibold tracking-tight text-ink"
      {...props}
    />
  ),
  h4: (props) => (
    <h4 className="mt-6 text-base font-semibold text-ink" {...props} />
  ),
  p: (props) => (
    <p className="mt-4 text-[15px] leading-relaxed text-ink-soft first:mt-0" {...props} />
  ),
  a: ({ href = "", className, ...props }) => {
    if (typeof className === "string" && className.includes("docs-heading-anchor")) {
      return (
        <a
          href={href}
          aria-label="Link to this section"
          className="ml-1 no-underline text-ink-soft/0 transition-colors group-hover:text-ink-soft/60"
          {...props}
        />
      );
    }
    if (href.includes("app.utopiadata.net")) {
      return (
        <ComingSoonTrigger className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
          {props.children}
        </ComingSoonTrigger>
      );
    }
    const isInternal = href.startsWith("/") || href.startsWith("#");
    if (isInternal) {
      return (
        <Link
          href={href}
          className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
          {...props}
        />
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        {...props}
      />
    );
  },
  ul: (props) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft" {...props} />
  ),
  li: (props) => <li className="marker:text-ink-soft/60" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-6 border-l-2 border-ink/20 pl-5 text-[15px] italic leading-relaxed text-ink-soft"
      {...props}
    />
  ),
  hr: () => <hr className="my-10 border-line/70" />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded-glass-sm border border-line/70">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-ink/[0.03]" {...props} />,
  th: (props) => (
    <th
      className="border-b border-line/70 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border-b border-line/40 px-4 py-3 text-ink-soft last:border-b-0" {...props} />
  ),
  code: (props) => (
    <code
      className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-ink before:content-none after:content-none"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="overflow-x-auto rounded-glass-sm border border-white/5 bg-ink px-5 py-4 text-[13px] leading-relaxed text-white/90"
      {...props}
    />
  ),
  figure: (props) => (
    <figure
      className="my-6 overflow-hidden rounded-glass-sm border border-white/10 bg-ink [&_figcaption]:border-b [&_figcaption]:border-white/10 [&_figcaption]:bg-transparent [&_figcaption]:px-5 [&_figcaption]:py-2.5 [&_figcaption]:font-mono [&_figcaption]:text-xs [&_figcaption]:text-white/50 [&_pre]:rounded-none [&_pre]:border-0 [&_pre]:bg-transparent"
      {...props}
    />
  ),
  figcaption: (props) => <figcaption {...props} />,
  Callout,
  Card,
  CardGrid,
  Steps,
  Step,
  Accordion,
  AccordionGroup,
  ParamField,
  ResponseField,
  FieldGroup,
  CodeGroup,
  Placeholder,
};
