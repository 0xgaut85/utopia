import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchFieldProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  maxLength?: number;
};

export function SearchField({
  name,
  value,
  defaultValue,
  placeholder,
  onChange,
  onClear,
  className,
  maxLength,
}: SearchFieldProps) {
  const current = value ?? defaultValue ?? "";
  const showClear = Boolean(onClear && current);

  return (
    <label
      className={cn(
        "app-input flex min-w-0 items-center gap-2",
        className
      )}
    >
      <Search
        className="h-4 w-4 shrink-0 translate-y-px text-app-faint"
        strokeWidth={1.8}
        aria-hidden
      />
      <input
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        maxLength={maxLength}
        placeholder={placeholder}
        className="h-4 min-w-0 flex-1 bg-transparent p-0 text-sm leading-none outline-none placeholder:text-app-faint"
      />
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-app-faint transition-colors hover:bg-app-surface hover:text-app-text"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
    </label>
  );
}
