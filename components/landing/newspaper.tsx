import { ColumnLeft } from "@/components/landing/column-left";
import { ColumnVisual } from "@/components/landing/column-visual";
import { ColumnRight } from "@/components/landing/column-right";

export function Newspaper() {
  return (
    <section
      id="network"
      className="relative flex flex-col lg:min-h-0 lg:flex-1 lg:grid lg:grid-cols-[1fr_1.15fr_1fr] lg:divide-x lg:divide-line/70"
    >
      <ColumnLeft />
      <ColumnVisual />
      <ColumnRight />
    </section>
  );
}
