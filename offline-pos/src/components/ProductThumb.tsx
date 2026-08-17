import { useState } from "react";
import { cn } from "../lib/utils";
import { PRODUCT_BY_ID } from "../data/products";

interface ProductThumbProps {
  productId: string;
  name: string;
  emoji?: string;
  image?: string;
  className?: string;
}

/**
 * Product thumbnail. Resolves the image by product id (falling back to the
 * stored line image) so legacy orders without a persisted image still show the
 * real product photo. Degrades to the product emoji on failure/missing asset.
 */
export function ProductThumb({
  productId,
  name,
  emoji,
  image,
  className,
}: ProductThumbProps) {
  const [failed, setFailed] = useState(false);
  const product = PRODUCT_BY_ID.get(productId);
  const src = image || product?.image;
  const fallback = emoji || product?.emoji || "☕";

  const box = cn(
    "relative shrink-0 overflow-hidden rounded-lg bg-sunken",
    className ?? "h-11 w-11",
  );

  if (!src || failed) {
    return (
      <span className={cn(box, "flex items-center justify-center text-xl")}>
        {fallback}
      </span>
    );
  }

  return (
    <div className={box}>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-xl"
      >
        {fallback}
      </span>
      <img
        src={src}
        alt={name}
        width={44}
        height={44}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="relative h-full w-full object-cover ring-1 ring-line"
      />
    </div>
  );
}
