import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDocBySlug } from "@/lib/docs";
import { RenderDoc } from "@/lib/render-doc";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { Pager } from "@/components/docs/pager";

export function generateMetadata(): Metadata {
  const doc = getDocBySlug([]);
  return {
    title: doc ? `${doc.frontmatter.title} · Utopia Docs` : "Utopia Docs",
    description: doc?.frontmatter.description,
  };
}

export default function DocsIndexPage() {
  const doc = getDocBySlug([]);

  if (!doc) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs />
      <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        {doc.frontmatter.title}
      </h1>
      {doc.frontmatter.description ? (
        <p className="mt-3 text-lg leading-relaxed text-ink-soft">
          {doc.frontmatter.description}
        </p>
      ) : null}
      <div className="mt-8">
        <RenderDoc doc={doc} />
      </div>
      <Pager />
    </>
  );
}
