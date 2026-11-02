/**
 * Responsive images: every photo has an 800 px "<name>.sm.jpg" version next to it
 * (made by scripts/optimize-images.mjs). The browser downloads the right one for the screen width.
 */
export function responsiveImage(
  src: string,
  sizes: string,
  /** Width of the large version, if it isn't the usual 1600 px */
  largeWidth?: number,
) {
  const large = largeWidth ?? 1600;
  return {
    src,
    srcSet: `${src.replace(/\.jpg$/, ".sm.jpg")} 800w, ${src} ${large}w`,
    sizes,
  };
}
