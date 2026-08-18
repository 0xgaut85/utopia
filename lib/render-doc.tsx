import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/docs/mdx-components";
import { mdxOptions } from "@/lib/mdx-options";
import type { DocFile } from "@/lib/docs";

export function RenderDoc({ doc }: { doc: DocFile }) {
  return (
    <MDXRemote
      source={doc.content}
      components={mdxComponents}
      options={mdxOptions}
    />
  );
}
