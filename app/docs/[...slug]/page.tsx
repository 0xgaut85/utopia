import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllDocSlugs, getDocBySlug } from "@/lib/docs";
import { RenderDoc } from "@/lib/render-doc";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { Pager } from "@/components/docs/pager";

type PageProps = {
  params: Promise<{ slug: string[] }>;
};

export function generateStaticParams() {
  return getAllDocSlugs()
    .filter((slug) => slug.length > 0)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  return {
    title: doc ? `${doc.frontmatter.title} · Utopia Docs` : "Utopia Docs",
    description: doc?.frontmatter.description,
  };
}

export default async function DocsPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

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
