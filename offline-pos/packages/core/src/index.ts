/**
 * `@offlinepos/core` — platform-neutral offline-first POS engine.
 *
 * Everything here runs anywhere: browser, Electron renderer, React Native,
 * Node. No `window`/`navigator`/`localStorage` at module scope, no sql.js.
 *
 * Browser-only pieces (Web Serial, OPFS/SQLite, tab sync, `localStorage`
 * provider, and the singleton wiring) live in `@offlinepos/core/browser`.
 * Mobile apps compose their own storage/sync/printer instances from this
 * entry — e.g. an `AsyncStorage` provider implementing `StorageProvider`.
 */
export { DatabaseManager } from "./db-manager";
export { EventBus, type EventMap, type EventName } from "./events";
export { MockServer, type MockServerOptions } from "./mock-server";
export { MutationQueue, type Mutation, type MutationStatus, type MutationOperation } from "./mutation-queue";
export {
  computeDiscountAmount,
  computePricing,
  computeTaxAmount,
  DEFAULT_TAXES,
  normalizeDiscount,
  normalizeTaxes,
  round2,
  vatRate,
  type Pricing,
  type TaxAmount,
} from "./pricing";
export {
  MemoryReceiptPrinter,
  PrinterManager,
  type PrinterResult,
  type PrinterSettings,
  type PrinterState,
  type ReceiptPrinter,
} from "./printer";
export {
  DEFAULT_THERMAL_LABELS,
  ESC_POS_CUT,
  THERMAL_WIDTH,
  renderThermalReceipt,
  wrapLine,
  type ThermalReceiptLabels,
} from "./receipt-text";
export { MemoryStorageProvider, type StorageProvider } from "./storage";
export { SyncEngine, type SyncEngineOptions, type SyncFn, type SyncReport, type SyncResult } from "./sync-engine";
export type {
  CartLine,
  CreateOrderInput,
  Discount,
  DiscountType,
  Order,
  OrderLine,
  OrderLineInput,
  OrderStatus,
  OrderTax,
  PaymentMethod,
  Product,
  Tax,
  TaxKind,
  TaxType,
  UpdateOrderInput,
} from "./types";
