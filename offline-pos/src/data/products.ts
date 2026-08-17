import type { Product } from "@offlinepos/core/types";
import type { MessageKey } from "../i18n/messages";

export const CATEGORIES = [
  "All",
  "Hot Drinks",
  "Cold Drinks",
  "Pastries",
  "Snacks",
] as const;

/** Category id (stable, locale-independent) → displayed name key. */
export const CATEGORY_KEYS: Record<string, MessageKey> = {
  All: "catAll",
  "Hot Drinks": "catHot",
  "Cold Drinks": "catCold",
  Pastries: "catPastries",
  Snacks: "catSnacks",
};

const img = (file: string) => `/images/${file}`;

export const PRODUCTS: Product[] = [
  // Hot drinks
  { id: "p01", name: "Espresso", nameAr: "إسبريسو", category: "Hot Drinks", price: 8, emoji: "☕", image: img("p01.jpg"), inStock: true },
  { id: "p02", name: "Cappuccino", nameAr: "كابتشينو", category: "Hot Drinks", price: 14, emoji: "☕", image: img("p02.jpg"), inStock: true },
  { id: "p03", name: "Latte", nameAr: "لاتيه", category: "Hot Drinks", price: 15, emoji: "🥛", image: img("p03.jpg"), inStock: true },
  { id: "p04", name: "Flat White", nameAr: "فلات وايت", category: "Hot Drinks", price: 16, emoji: "☕", image: img("p04.jpg"), inStock: true },
  { id: "p05", name: "Mocha", nameAr: "موكا", category: "Hot Drinks", price: 17, emoji: "🍫", image: img("p05.jpg"), inStock: true },
  { id: "p06", name: "Turkish Coffee", nameAr: "قهوة تركية", category: "Hot Drinks", price: 10, emoji: "🫖", image: img("p06.jpg"), inStock: true },
  { id: "p07", name: "Hot Chocolate", nameAr: "شوكولاتة ساخنة", category: "Hot Drinks", price: 15, emoji: "🍫", image: img("p07.jpg"), inStock: true },
  { id: "p08", name: "Green Tea", nameAr: "شاي أخضر", category: "Hot Drinks", price: 9, emoji: "🍵", image: img("p08.jpg"), inStock: true },
  { id: "p09", name: "Mint Tea", nameAr: "شاي بالنعناع", category: "Hot Drinks", price: 9, emoji: "🌿", image: img("p09.jpg"), inStock: true },
  // Cold drinks
  { id: "p10", name: "Iced Latte", nameAr: "لاتيه مثلج", category: "Cold Drinks", price: 18, emoji: "🧊", image: img("p10.jpg"), inStock: true },
  { id: "p11", name: "Iced Mocha", nameAr: "موكا مثلجة", category: "Cold Drinks", price: 19, emoji: "🧋", image: img("p11.jpg"), inStock: true },
  { id: "p12", name: "Fresh Orange", nameAr: "عصير برتقال طازج", category: "Cold Drinks", price: 16, emoji: "🍊", image: img("p12.jpg"), inStock: true },
  { id: "p13", name: "Lemon Mint", nameAr: "ليمون بالنعناع", category: "Cold Drinks", price: 14, emoji: "🍋", image: img("p13.jpg"), inStock: true },
  { id: "p14", name: "Sparkling Water", nameAr: "مياه غازية", category: "Cold Drinks", price: 6, emoji: "💧", image: img("p14.jpg"), inStock: true },
  { id: "p15", name: "Strawberry Shake", nameAr: "ميلك شيك فراولة", category: "Cold Drinks", price: 20, emoji: "🍓", image: img("p15.jpg"), inStock: true },
  // Pastries
  { id: "p16", name: "Croissant", nameAr: "كرواسون", category: "Pastries", price: 12, emoji: "🥐", image: img("p16.jpg"), inStock: true },
  { id: "p17", name: "Chocolate Cake", nameAr: "كيك شوكولاتة", category: "Pastries", price: 22, emoji: "🍰", image: img("p17.jpg"), inStock: true },
  { id: "p18", name: "Cheesecake", nameAr: "تشيز كيك", category: "Pastries", price: 24, emoji: "🍰", image: img("p18.jpg"), inStock: true },
  { id: "p19", name: "Cookie", nameAr: "بسكويت", category: "Pastries", price: 7, emoji: "🍪", image: img("p19.jpg"), inStock: true },
  { id: "p20", name: "Muffin", nameAr: "مافن", category: "Pastries", price: 11, emoji: "🧁", image: img("p20.jpg"), inStock: true },
  // Snacks
  { id: "p21", name: "Sandwich", nameAr: "ساندويتش", category: "Snacks", price: 18, emoji: "🥪", image: img("p21.jpg"), inStock: true },
  { id: "p22", name: "Salad Bowl", nameAr: "طبق سلطة", category: "Snacks", price: 21, emoji: "🥗", image: img("p22.jpg"), inStock: true },
  { id: "p23", name: "Potato Chips", nameAr: "رقائق بطاطس", category: "Snacks", price: 6, emoji: "🍟", image: img("p23.jpg"), inStock: true },
  { id: "p24", name: "Granola Bar", nameAr: "لوح جرانولا", category: "Snacks", price: 8, emoji: "🍫", image: img("p24.jpg"), inStock: true },
];

export const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
