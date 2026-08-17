import type { Product } from "@offlinepos/core/types";

/** First-launch catalog for the mobile client (a subset of the web demo). */
export const CATALOG: Product[] = [
  { id: "p01", name: "Espresso", nameAr: "إسبريسو", category: "coffee", price: 8, emoji: "☕", image: "", inStock: true },
  { id: "p02", name: "Cappuccino", nameAr: "كابتشينو", category: "coffee", price: 12, emoji: "🥤", image: "", inStock: true },
  { id: "p03", name: "Croissant", nameAr: "كرواسون", category: "bakery", price: 9, emoji: "🥐", image: "", inStock: true },
  { id: "p04", name: "Cheesecake", nameAr: "تشيز كيك", category: "dessert", price: 18, emoji: "🍰", image: "", inStock: true },
  { id: "p05", name: "Orange Juice", nameAr: "عصير برتقال", category: "drinks", price: 11, emoji: "🍊", image: "", inStock: true },
  { id: "p06", name: "Bottled Water", nameAr: "مياه معدنية", category: "drinks", price: 4, emoji: "💧", image: "", inStock: true },
  { id: "p07", name: "Muffin", nameAr: "مفن", category: "bakery", price: 10, emoji: "🧁", image: "", inStock: true },
  { id: "p08", name: "Iced Latte", nameAr: "لاتيه مثلج", category: "coffee", price: 14, emoji: "🧋", image: "", inStock: true },
];
