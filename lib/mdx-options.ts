import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import type { MDXRemoteProps } from "next-mdx-remote/rsc";

type SerializeOptions = NonNullable<MDXRemoteProps["options"]>;

export const mdxOptions: SerializeOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          properties: { className: ["docs-heading-anchor"], ariaLabel: "Link to this section" },
          content: { type: "text", value: " #" },
        },
      ],
      [
        rehypePrettyCode,
        {
          theme: "github-dark-dimmed",
          keepBackground: false,
          defaultLang: "plaintext",
        },
      ],
    ],
  },
};
