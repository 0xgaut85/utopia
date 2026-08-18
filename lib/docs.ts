import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content", "docs");

export type DocFrontmatter = {
  title: string;
  description: string;
};

export type DocFile = {
  slug: string[];
  filePath: string;
  frontmatter: DocFrontmatter;
  content: string;
};

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(fullPath);
    }
    if (entry.name.endsWith(".mdx")) {
      return [fullPath];
    }
    return [];
  });
}

export function getAllDocSlugs(): string[][] {
  const files = walk(CONTENT_DIR);
  return files.map((filePath) => {
    const relative = path.relative(CONTENT_DIR, filePath);
    const withoutExt = relative.replace(/\.mdx$/, "");
    const segments = withoutExt.split(path.sep);
    if (segments[segments.length - 1] === "index") {
      segments.pop();
    }
    return segments;
  });
}

export function getDocBySlug(slug: string[]): DocFile | null {
  const segments = slug.length === 0 ? ["index"] : slug;
  const candidates = [
    path.join(CONTENT_DIR, ...segments) + ".mdx",
    path.join(CONTENT_DIR, ...segments, "index.mdx"),
  ];

  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    filePath,
    frontmatter: {
      title: data.title ?? "Untitled",
      description: data.description ?? "",
    },
    content,
  };
}

export function getAllDocs(): DocFile[] {
  return getAllDocSlugs()
    .map((slug) => getDocBySlug(slug))
    .filter((doc): doc is DocFile => doc !== null);
}

export type Heading = {
  depth: number;
  text: string;
  id: string;
};

export function extractHeadings(content: string): Heading[] {
  const lines = content.split("\n");
  const headings: Heading[] = [];

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.*)$/.exec(line.trim());
    if (!match) continue;
    const depth = match[1].length;
    const text = match[2].replace(/[*_`]/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    headings.push({ depth, text, id });
  }

  return headings;
}
