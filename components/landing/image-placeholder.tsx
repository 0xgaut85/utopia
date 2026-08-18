import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrambleText } from "@/components/ui/scramble-text";
import { AutoVideo } from "@/components/landing/auto-video";

type Ratio = "landscape" | "wide" | "square" | "portrait";

type ImagePlaceholderProps = {
  caption: string;
  ratio?: Ratio;
  duration?: number;
  className?: string;
  src?: string;
  videoSrc?: string;
  alt?: string;
};

const ratioClass: Record<Ratio, string> = {
  landscape: "aspect-[16/9]",
  wide: "aspect-[21/9]",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
};

export function ImagePlaceholder({
  caption,
  ratio = "landscape",
  duration = 1100,
  className,
  src,
  videoSrc,
  alt,
}: ImagePlaceholderProps) {
  return (
    <figure className={cn(className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden border border-line/70 bg-black/[0.03]",
          ratioClass[ratio]
        )}
      >
        {videoSrc ? (
          <AutoVideo
            src={videoSrc}
            label={alt ?? caption}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : src ? (
          <Image
            src={src}
            alt={alt ?? caption}
            fill
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <ImageIcon className="h-4 w-4 opacity-20" strokeWidth={1.2} />
        )}
      </div>
      <figcaption className="mt-1 font-mono text-[11px] italic text-ink/45">
        <ScrambleText text={caption} duration={duration} />
      </figcaption>
    </figure>
  );
}
