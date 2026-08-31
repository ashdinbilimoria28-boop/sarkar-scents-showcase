type SmartImageProps = {
  /** Base filename in /public/img, e.g. "hero-banner" */
  name: string;
  widths: number[];
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  /** Set for the LCP image only: eager + high fetch priority */
  priority?: boolean;
};

const srcset = (name: string, widths: number[], ext: string) =>
  widths.map((w) => `/img/${name}-${w}.${ext} ${w}w`).join(", ");

export function SmartImage({
  name,
  widths,
  alt,
  width,
  height,
  sizes,
  className,
  priority = false,
}: SmartImageProps) {
  const fallbackWidth = widths[widths.length - 1]!;
  return (
    <picture>
      <source type="image/avif" srcSet={srcset(name, widths, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(name, widths, "webp")} sizes={sizes} />
      <img
        src={`/img/${name}-${fallbackWidth}.jpg`}
        srcSet={srcset(name, widths, "jpg")}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    </picture>
  );
}
