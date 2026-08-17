import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { PRODUCTS, CATEGORIES, CATEGORY_KEYS } from "../data/products";
import { cn } from "../lib/utils";
import { useCartStore } from "../store/cart";
import { formatMoney } from "../lib/utils";
import { useLocaleStore, t } from "../i18n";
import type { Product } from "@offlinepos/core/types";

export function ProductCatalog() {
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const add = useCartStore((state) => state.add);
  const locale = useLocaleStore((s) => s.locale);

  // In-cart quantities, keyed by product id — shows a badge on the tile so the
  // cashier sees what's already on the till without glancing at the cart.
  const lines = useCartStore((state) => state.lines);
  const quantities = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) map.set(line.productId, line.quantity);
    return map;
  }, [lines]);

  const query = search.trim().toLowerCase();

  const products = useMemo(() => {
    const byCategory =
      category === "All"
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category === category);
    if (!query) return byCategory;
    return byCategory.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.nameAr.includes(query) ||
        p.category.toLowerCase().includes(query),
    );
  }, [category, query]);

  // Press "/" or "f" anywhere to jump to search (skip while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "/" || e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2 px-1 pt-1 sm:flex-row sm:items-center sm:gap-2">
        <div className="no-scrollbar -mx-1 flex shrink-0 gap-1 overflow-x-auto rounded-full bg-surface p-1 ring-1 ring-line sm:mx-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                category === cat
                  ? "bg-brand text-white shadow-sm"
                  : "text-secondary hover:bg-sunken",
              )}
            >
              {t(CATEGORY_KEYS[cat])}
            </button>
          ))}
        </div>

        <div className="relative ms-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            ref={searchRef}
            type="search"
            name="product-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchProducts")}
            aria-label={t("searchProducts")}
            className="w-full rounded-full border-0 bg-surface py-2 ps-9 pe-9 text-sm text-primary shadow-sm ring-1 ring-line placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-elevated px-1.5 font-mono text-[10px] text-faint sm:block">
            /
          </kbd>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 text-center text-sm text-faint">
          {t("noProducts", { q: search })}
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-3 overflow-y-auto p-1">
          {products.map((product) => {
            const qty = quantities.get(product.id) ?? 0;
            return (
              <button
                key={product.id}
                type="button"
                disabled={!product.inStock}
                onClick={() =>
                  add(product.id, product.name, product.emoji, product.price, product.image)
                }
                className={cn(
                  "group relative flex cursor-pointer flex-col items-start gap-2 overflow-hidden rounded-2xl bg-surface p-2 text-start shadow-sm ring-1 ring-line transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
                  !product.inStock && "cursor-not-allowed opacity-50",
                )}
              >
                {qty > 0 && (
                  <span className="tabular absolute end-2 top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-surface">
                    {qty}
                  </span>
                )}
                <ProductImage product={product} />
                <div className="w-full space-y-0.5 px-1 pb-1">
                  <span className="block truncate text-sm font-semibold text-primary">
                    {locale === "ar" && product.nameAr ? product.nameAr : product.name}
                  </span>
                  <span className="tabular block text-sm font-bold text-brand">
                    {formatMoney(product.price)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductImage({ product }: { product: Product }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const locale = useLocaleStore((s) => s.locale);

  if (status === "error") {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-sunken text-4xl">
        {product.emoji}
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-sunken">
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-sunken via-line to-sunken" />
      )}
      <img
        src={product.image}
        alt={locale === "ar" && product.nameAr ? product.nameAr : product.name}
        loading="lazy"
        decoding="async"
        width={320}
        height={240}
        draggable={false}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={cn(
          "h-full w-full object-cover transition-all duration-300 group-hover:scale-105",
          status === "loaded" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
