"use client";

import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

function getText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getText).join("");
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return getText(props.children);
  }
  return "";
}

function findTitle(node: ReactNode, fallback: string): string {
  if (!isValidElement(node)) return fallback;
  const props = node.props as {
    "data-rehype-pretty-code-title"?: string;
    children?: ReactNode;
  };

  if ("data-rehype-pretty-code-title" in props) {
    return getText(props.children) || fallback;
  }

  const children = Children.toArray(props.children);
  for (const child of children) {
    const found = findTitle(child, "");
    if (found) return found;
  }

  return fallback;
}

export function CodeGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement[];
  const [active, setActive] = useState(0);

  if (items.length === 0) return null;

  const labels = items.map((item, index) => findTitle(item, `Tab ${index + 1}`));

  return (
    <div className="glass-dark my-6 overflow-hidden rounded-glass-sm text-white">
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-white/10 px-3 pt-3">
        {labels.map((label, index) => (
          <button
            key={label + index}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              "shrink-0 rounded-t-md px-3 py-2 font-mono text-xs transition-colors",
              index === active
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="[&_figure]:m-0 [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:border-0 [&_pre]:bg-transparent">
        {items[active]}
      </div>
    </div>
  );
}
