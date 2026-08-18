# Utopia

The marketing site and documentation for Utopia, a spatial data layer for physical AI built from crowd captured, cryptographically verified street level video.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, React 19)
- [Tailwind CSS 4](https://tailwindcss.com) with a CSS-first theme (no `tailwind.config.js`)
- [Motion](https://motion.dev) (Framer Motion) for interaction level animation
- [GSAP](https://gsap.com) with ScrollTrigger for scroll choreography
- [Lenis](https://lenis.darkroom.engineering) for inertial smooth scrolling
- Hand rolled MDX docs powered by `next-mdx-remote`, `gray-matter`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings` and `rehype-pretty-code`
- `cmdk` and `fuse.js` for the docs search palette

## Getting started

```bash
npm install
npm run dev
```

The `predev` and `build` scripts regenerate `public/search-index.json` from the MDX content before starting, so the search palette always reflects the current docs.

Open [http://localhost:3000](http://localhost:3000) for the landing page and [http://localhost:3000/docs](http://localhost:3000/docs) for the documentation.

## Project structure

```
app/
  layout.tsx                 root shell, fonts, SmoothScrollProvider
  page.tsx                   landing page
  docs/layout.tsx             docs shell: header, sidebar, TOC rail
  docs/page.tsx                docs home (renders content/docs/index.mdx)
  docs/[...slug]/page.tsx     MDX page renderer, statically generated
components/
  landing/                    Hero, Ticker, Capabilities, PipelineScroll, Roles, Domains, CtaBand
  docs/                       Sidebar, TocRail, Pager, Breadcrumbs, SearchPalette, MDX component library
  ui/                         GlassPanel, GlassButton, Reveal, ScrollProgress, Placeholder
lib/
  docs.ts                     filesystem MDX reader, frontmatter and heading parsing
  nav.ts                      ordered sidebar navigation tree
  mdx-options.ts              remark/rehype plugin chain
content/docs/**/*.mdx         all documentation content
scripts/build-search-index.ts build time search index generator
```

## Content and images

Every documentation page lives under `content/docs` as an MDX file with `title` and `description` frontmatter. Every visual on the landing page and in the docs uses the `Placeholder` component, a labelled dashed glass frame that names the intended subject so real imagery can be dropped in later.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — regenerate the search index and create a production build
- `npm run start` — serve the production build
- `npm run typecheck` — run `tsc --noEmit`
- `npm run lint` — run ESLint
