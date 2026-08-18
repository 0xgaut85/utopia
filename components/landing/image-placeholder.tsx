import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoVideo } from "@/components/landing/auto-video";

type Ratio = "landscape" | "wide" | "square" | "portrait";

type ImagePlaceholderProps = {
  ratio?: Ratio;
  className?: string;
  src?: string;
  videoSrc?: string;
};

const ratioClass: Record<Ratio, string> = {
  landscape: "aspect-[16/9]",
  wide: "aspect-[21/9]",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
};

export function ImagePlaceholder({
  ratio = "landscape",
  className,
  src,
  videoSrc,
}: ImagePlaceholderProps) {
  const hasMedia = Boolean(src || videoSrc);

  return (
    <figure
      className={cn(
        hasMedia && "-mx-3 first:-mt-2.5 last:-mb-2.5",
        className
      )}
    >
      <div
        className={cn(
          hasMedia
            ? "relative w-full bg-black/[0.03]"
            : cn(
                "relative flex items-center justify-center overflow-hidden border border-line/70 bg-black/[0.03]",
                ratioClass[ratio]
              )
        )}
      >
        {videoSrc ? (
          <AutoVideo src={videoSrc} className="block h-auto w-full" />
        ) : src ? (
          // Decorative: the surrounding copy carries the meaning.
          <Image
            src={src}
            alt=""
            width={0}
            height={0}
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="block h-auto w-full"
          />
        ) : (
          <ImageIcon className="h-4 w-4 opacity-20" strokeWidth={1.2} />
        )}
        {hasMedia ? (
          // Frosted veil so the artwork recedes behind the surrounding copy.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-white/[0.07] backdrop-blur-[0.5px] backdrop-saturate-[0.97]"
          />
        ) : null}
      </div>
    </figure>
  );
}
