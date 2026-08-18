import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement);

  return (
    <div className="my-6 flex flex-col">
      {items.map((child, index) =>
        cloneElement(child as ReactElement<StepProps>, {
          index: index + 1,
          isLast: index === items.length - 1,
          key: index,
        })
      )}
    </div>
  );
}

type StepProps = {
  title: string;
  children: ReactNode;
  index?: number;
  isLast?: boolean;
};

export function Step({ title, children, index, isLast }: StepProps) {
  return (
    <div className="relative flex gap-5 pb-8 pl-2 last:pb-0">
      {!isLast ? (
        <div className="absolute bottom-0 left-[19px] top-9 w-px bg-line" />
      ) : null}
      <div className="glass-solid z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-ink">
        {index}
      </div>
      <div className="pt-1 text-sm leading-relaxed text-ink-soft [&>p]:m-0 [&_strong]:text-ink">
        <p className="mb-1.5 text-base font-semibold text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}
