/**
 * Duyarlı görsel: her fotoğrafın yanında 800 px'lik "<ad>.sm.jpg" sürümü vardır
 * (scripts/optimize-images.mjs üretir). Tarayıcı ekran genişliğine göre uygun olanı indirir.
 */
export function responsiveImage(src: string, sizes: string) {
  const large = src.endsWith("/hero.jpg") ? 1920 : 1600;
  return {
    src,
    srcSet: `${src.replace(/\.jpg$/, ".sm.jpg")} 800w, ${src} ${large}w`,
    sizes,
  };
}
