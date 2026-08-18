import fs from "node:fs";
import path from "node:path";
import { getAllDocs } from "../lib/docs";
import { navTree } from "../lib/nav";

function groupTitleFor(href: string): string {
  const group = navTree.find((g) => g.items.some((item) => item.href === href));
  return group?.title ?? "Docs";
}

function toHref(slug: string[]): string {
  return slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`;
}

function main() {
  const docs = getAllDocs();

  const entries = docs.map((doc) => {
    const href = toHref(doc.slug);
    return {
      title: doc.frontmatter.title,
      description: doc.frontmatter.description,
      href,
      group: groupTitleFor(href),
    };
  });

  const outDir = path.join(process.cwd(), "public");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "search-index.json"),
    JSON.stringify(entries, null, 2)
  );

  console.log(`Search index written with ${entries.length} entries.`);
}

main();
