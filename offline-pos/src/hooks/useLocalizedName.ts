import { useLocaleStore } from "../i18n";
import { PRODUCT_BY_ID } from "../data/products";

/**
 * Returns the localized display name for a cart/order line. Lines persist the
 * English name at add-time, so in Arabic we look the product up by id and
 * fall back to the stored name for legacy/unknown rows.
 */
export function useLocalizedName(productId: string, fallback: string): string {
  const locale = useLocaleStore((s) => s.locale);
  if (locale === "ar") {
    const product = PRODUCT_BY_ID.get(productId);
    return product?.nameAr ?? fallback;
  }
  return fallback;
}
