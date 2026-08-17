import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ScanBarcode,
  PauseCircle,
  RotateCcw,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Pencil,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { db } from "@offlinepos/core/browser";
import type { Discount, DiscountType, Order, Tax, TaxType } from "@offlinepos/core/types";
import { useCartStore } from "../store/cart";
import { useCheckout } from "../hooks/useCheckout";
import { computePricing, normalizeDiscount, normalizeTaxes } from "@offlinepos/core";
import { cn, formatMoney } from "../lib/utils";
import { PAYMENT_METHODS, type PaymentMethodId } from "../lib/payments";
import { useI18n } from "../i18n";
import { useLocalizedName } from "../hooks/useLocalizedName";
import { Receipt } from "./Receipt";
import { ProductThumb } from "./ProductThumb";

type Stage = "review" | "payment";

const QUICK_TENDER = [20, 50, 100, 200];

export function CartPanel({
  onClose,
  onCancelEdit,
  onEditSaved,
}: {
  onClose?: () => void;
  onCancelEdit?: () => void;
  onEditSaved?: (orderId: string) => void;
}) {
  const lines = useCartStore((s) => s.lines);
  const discount = useCartStore((s) => s.discount);
  const taxes = useCartStore((s) => s.taxes);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const parked = useCartStore((s) => s.parked);
  const editSession = useCartStore((s) => s.editSession);
  // Actions are stable, so grouped with useShallow the whole object stays
  // referentially stable — no re-renders from resubscribing.
  const {
    setDiscountType,
    setDiscountValue,
    addTax,
    updateTax,
    removeTax,
    setPaymentMethod,
    park,
    resume,
    discardParked,
    clearCart,
    cancelEdit,
    setLastEditedOrderId,
  } = useCartStore(
    useShallow((s) => ({
      setDiscountType: s.setDiscountType,
      setDiscountValue: s.setDiscountValue,
      addTax: s.addTax,
      updateTax: s.updateTax,
      removeTax: s.removeTax,
      setPaymentMethod: s.setPaymentMethod,
      park: s.park,
      resume: s.resume,
      discardParked: s.discardParked,
      clearCart: s.clearCart,
      cancelEdit: s.cancelEdit,
      setLastEditedOrderId: s.setLastEditedOrderId,
    })),
  );
  const { placing, lastOrder, placeOrder, saveEdit, dismissReceipt } = useCheckout();
  const { t } = useI18n();

  const [stage, setStage] = useState<Stage>("review");
  // Tendered cash is tracked against the total it was entered for, so a change
  // to the cart (qty, discount, tax) automatically invalidates it.
  const [tenderedState, setTenderedState] = useState<{ key: string; value: number }>({
    key: "",
    value: 0,
  });
  const [parking, setParking] = useState(false);
  const [parkLabel, setParkLabel] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  const pricing = useMemo(
    () => computePricing(lines, discount, taxes),
    [lines, discount, taxes],
  );
  const total = pricing.total;
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const empty = lines.length === 0;

  const original = useMemo(
    () => (editSession ? db.findOrder(editSession.orderId) : undefined),
    [editSession],
  );
  const diff = original ? Number((total - original.total).toFixed(2)) : 0;

  const prevEditSession = useRef(editSession);
  useEffect(() => {
    if (editSession && !prevEditSession.current) setStage("review");
    prevEditSession.current = editSession;
  }, [editSession]);

  const prevCount = useRef(itemCount);
  useEffect(() => {
    if (itemCount > prevCount.current) {
      setAddedFlash(true);
      const tt = setTimeout(() => setAddedFlash(false), 400);
      prevCount.current = itemCount;
      return () => clearTimeout(tt);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  const totalKey = `${total}`;
  const tendered = tenderedState.key === totalKey ? tenderedState.value : 0;
  const setTendered = useCallback(
    (value: number) => setTenderedState({ key: totalKey, value }),
    [totalKey],
  );

  const isCash = paymentMethod === "cash";
  const change = isCash ? tendered - total : 0;
  const canCharge =
    !placing &&
    !empty &&
    (editSession ? true : !isCash ? true : tendered >= total);

  const doCharge = () => {
    if (!canCharge) return;
    // placeOrder/saveEdit return whether the charge was ACCEPTED — a re-entry
    // (double-tap within the same frame) is rejected by the synchronous guard
    // in useCheckout, so only the first tap advances the stage.
    if (editSession) {
      setLastEditedOrderId(editSession.orderId);
      if (saveEdit()) setStage("review");
    } else if (placeOrder()) {
      setStage("review");
    }
  };

  const handleCancelEdit = () => {
    cancelEdit();
    setStage("review");
    onCancelEdit?.();
  };

  const confirmPark = () => {
    park(parkLabel);
    setParking(false);
    setParkLabel("");
    setStage("review");
  };

  // Cashier shortcuts: Esc walks back, Enter advances / charges. Typing in a
  // field never hijacks Enter. Bound ONCE on window — the ref holds the latest
  // handler state, so the listener itself never needs re-binding.
  const keyHandlerRef = useRef({ parking, stage, empty, canCharge, doCharge, onClose });

  // Keep the ref in sync with the latest handler state after every render —
  // writing it here (not during render) still guarantees the single window
  // listener below always sees fresh values.
  useEffect(() => {
    keyHandlerRef.current = { parking, stage, empty, canCharge, doCharge, onClose };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = keyHandlerRef.current;
      const target = e.target as HTMLElement;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable;

      if (e.key === "Escape") {
        if (h.parking) {
          setParking(false);
          return;
        }
        if (h.stage === "payment") {
          setStage("review");
          return;
        }
        h.onClose?.();
        return;
      }

      if (e.key === "Enter" && !typing) {
        e.preventDefault();
        if (h.stage === "review" && !h.empty) setStage("payment");
        else if (h.stage === "payment" && h.canCharge) h.doCharge();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // After an edit is saved the receipt stays up until dismissed; once it's
  // dismissed, hand the order back to the caller (App) so it can navigate
  // straight to the order's details.
  useEffect(() => {
    if (lastOrder !== null) return;
    const orderId = useCartStore.getState().lastEditedOrderId;
    if (orderId) {
      useCartStore.getState().setLastEditedOrderId(null);
      onEditSaved?.(orderId);
    }
  }, [lastOrder, onEditSaved]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              addedFlash ? "bg-brand-light text-brand" : "bg-brand/10 text-brand",
            )}
          >
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-bold text-primary">{t("currentOrder")}</h2>
            {!empty && (
              <p className="text-[11px] text-faint">
                {itemCount === 1
                  ? t("item", { n: itemCount })
                  : t("items", { n: itemCount })}
              </p>
            )}
          </div>
        </div>

        {!empty && (
          <div className="flex items-center gap-1">
            {!editSession && stage === "review" && (
              <>
                <button
                  type="button"
                  onClick={() => setParking((v) => !v)}
                  className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:ring-amber-900 dark:hover:bg-amber-950/40"
                  title={t("parkTitle")}
                >
                  <PauseCircle className="h-3.5 w-3.5" />
                  {t("park")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmClear) {
                      clearCart();
                      setConfirmClear(false);
                    } else {
                      setConfirmClear(true);
                      setTimeout(() => setConfirmClear(false), 2500);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ring-1 transition-colors",
                    confirmClear
                      ? "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900"
                      : "text-faint-strong ring-line hover:bg-sunken",
                  )}
                  title={t("clearTitle")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmClear ? t("tapToConfirm") : t("clear")}
                </button>
              </>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full p-1.5 text-faint hover:bg-sunken hover:text-secondary"
                aria-label={t("closeCart")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </header>

      {parking && !empty && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <input
            type="text"
            name="park-label"
            value={parkLabel}
            onChange={(e) => setParkLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmPark();
              if (e.key === "Escape") setParking(false);
            }}
            placeholder={t("parkPlaceholder")}
            autoFocus
            aria-label={t("parkPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-surface px-2.5 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={confirmPark}
            className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            {t("parkOrder")}
          </button>
          <button
            type="button"
            onClick={() => setParking(false)}
            className="cursor-pointer rounded-lg p-1 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/40"
            aria-label={t("cancelParking")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {editSession && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {t("editingOrder", { handle: editSession.handle })}
                </span>
              </p>
              <div className="mt-1">
                {diff > 0.001 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <TrendingUp className="h-3 w-3" />
                    {t("collectExtra", { money: formatMoney(diff) })}
                  </span>
                ) : diff < -0.001 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    <TrendingDown className="h-3 w-3" />
                    {t("refundMoney", { money: formatMoney(-diff) })}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {t("noMoneyDiff")}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="shrink-0 cursor-pointer rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-700"
            >
              {t("cancelEdit")}
            </button>
          </div>
        </div>
      )}

      {empty ? (
        editSession ? (
          <EditEmptyState onCancelEdit={handleCancelEdit} />
        ) : (
          <EmptyState
            parked={parked}
            onResume={resume}
            onDiscard={discardParked}
            onClose={onClose}
          />
        )
      ) : (
        <>
          <StageTabs stage={stage} onChange={setStage} />

          {stage === "review" ? (
            <ReviewStage lines={lines} />
          ) : (
            <PaymentStage
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              discount={discount}
              setDiscountType={setDiscountType}
              setDiscountValue={setDiscountValue}
              taxes={taxes}
              addTax={addTax}
              updateTax={updateTax}
              removeTax={removeTax}
              tendered={tendered}
              setTendered={setTendered}
              isCash={isCash}
              change={change}
              total={total}
              editMode={!!editSession}
              paid={original?.total ?? total}
            />
          )}

          <div className="space-y-1 border-t border-line bg-elevated/60 px-4 py-3 text-sm">
            <TotalsRows pricing={pricing} discount={discount} />

            {stage === "review" ? (
              <button
                type="button"
                onClick={() => setStage("payment")}
                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand to-brand-dark py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-brand-dark hover:to-brand-dark active:scale-[0.99]"
              >
                {t("continueToPayment")}
                <ChevronRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStage("review")}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl bg-surface py-3 text-sm font-semibold text-secondary ring-1 ring-line transition-colors hover:bg-sunken active:scale-[0.99]"
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  {t("back")}
                </button>
                <button
                  type="button"
                  disabled={!canCharge}
                  onClick={doCharge}
                  className={cn(
                    "flex flex-[2] cursor-pointer items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
                    placing
                      ? "bg-slate-400"
                      : "bg-gradient-to-b from-brand to-brand-dark hover:from-brand-dark hover:to-brand-dark",
                  )}
                >
                  {placing
                    ? t("processing")
                    : editSession
                      ? diff > 0.001
                        ? t("saveCollect", { money: formatMoney(diff) })
                        : diff < -0.001
                          ? t("saveRefund", { money: formatMoney(-diff) })
                          : t("saveOrderChanges")
                      : isCash && tendered > 0 && change >= 0
                        ? t("chargeChange", { money: formatMoney(change) })
                        : t("charge", { money: formatMoney(total) })}
                </button>
              </div>
            )}
            <p className="pb-0.5 text-center text-[11px] text-faint">
              {t("offlineHint")}{" "}
              <kbd className="rounded border border-line bg-surface px-1 font-mono text-[10px]">
                Enter
              </kbd>{" "}
              {t("pressEnter")}
            </p>
          </div>
        </>
      )}

      {/* The overlay is memoized so the receipt never re-renders when the cart
          behind it changes (e.g. a sync event touching unrelated state). */}
      <ReceiptOverlay order={lastOrder} onClose={dismissReceipt} />
    </div>
  );
}

/**
 * Receipt rendered over the panel. Memoized because `order` is only null→order
 * once: while a receipt is open, cart churn (parking, sync events) must not
 * re-render the printed ticket.
 */
const ReceiptOverlay = memo(function ReceiptOverlay({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  if (!order) return null;
  return <Receipt order={order} onClose={onClose} />;
});

/* ------------------------------- Steps -------------------------------- */

const StageTabs = memo(function StageTabs({
  stage,
  onChange,
}: {
  stage: Stage;
  onChange: (s: Stage) => void;
}) {
  const { t } = useI18n();
  const steps: { id: Stage; label: string }[] = [
    { id: "review", label: t("review") },
    { id: "payment", label: t("payment") },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-line px-4 pt-2.5 pb-0">
      {steps.map((step, i) => {
        const active = stage === step.id;
        const done = i === 0 && stage === "payment";
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onChange(step.id)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "border-brand text-brand"
                : "border-transparent text-faint hover:text-secondary",
            )}
          >
            <span
              className={cn(
                "flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-bold",
                active || done ? "bg-brand text-white" : "bg-sunken text-faint-strong",
              )}
            >
              {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
            </span>
            {step.label}
          </button>
        );
      })}
    </div>
  );
});

/* ---------------------------- Review stage ---------------------------- */

const ReviewStage = memo(function ReviewStage({
  lines,
}: {
  lines: { productId: string; name: string; emoji: string; image?: string; price: number; quantity: number; lineTotal: number }[];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
      <ul className="divide-y divide-line">
        {lines.map((line) => (
          <LineRow key={line.productId} line={line} />
        ))}
      </ul>
    </div>
  );
});

const LineRow = memo(function LineRow({
  line,
}: {
  line: { productId: string; name: string; emoji: string; image?: string; price: number; quantity: number; lineTotal: number };
}) {
  const { t } = useI18n();
  const name = useLocalizedName(line.productId, line.name);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <ProductThumb
        productId={line.productId}
        name={name}
        emoji={line.emoji}
        image={line.image}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{name}</p>
        <p className="tabular text-xs text-faint-strong">{formatMoney(line.price)}</p>
      </div>
      <Stepper
        productId={line.productId}
        name={name}
        quantity={line.quantity}
      />
      <span className="tabular w-16 text-end text-sm font-bold text-primary">
        {formatMoney(line.lineTotal)}
      </span>
      <button
        type="button"
        onClick={() => useCartStore.getState().removeLine(line.productId)}
        className="cursor-pointer rounded-lg p-1 text-line-strong transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
        aria-label={t("removeItem", { name })}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
});

/* --------------------------- Payment stage ---------------------------- */

const PaymentStage = memo(function PaymentStage({
  paymentMethod,
  setPaymentMethod,
  discount,
  setDiscountType,
  setDiscountValue,
  taxes,
  addTax,
  updateTax,
  removeTax,
  tendered,
  setTendered,
  isCash,
  change,
  total,
  editMode,
  paid,
}: {
  paymentMethod: PaymentMethodId;
  setPaymentMethod: (m: PaymentMethodId) => void;
  discount: Discount;
  setDiscountType: (type: DiscountType) => void;
  setDiscountValue: (value: number) => void;
  taxes: Tax[];
  addTax: (tax: Tax) => void;
  updateTax: (id: string, patch: Partial<Tax>) => void;
  removeTax: (id: string) => void;
  tendered: number;
  setTendered: (n: number) => void;
  isCash: boolean;
  change: number;
  total: number;
  editMode: boolean;
  paid: number;
}) {
  const { t } = useI18n();
  const diff = Number((total - paid).toFixed(2));
  const quickAmounts = useMemo(() => {
    const set = new Set<number>([Math.ceil(total), ...QUICK_TENDER]);
    return [...set].sort((a, b) => a - b);
  }, [total]);

  const insufficient = tendered > 0 && tendered < total;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
      <section>
        <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-faint">
          {t("paymentMethod")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((method) => {
            const selected = paymentMethod === method.id;
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id)}
                aria-pressed={selected}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 bg-surface px-2 py-3 text-xs font-semibold transition-all active:scale-[0.98]",
                  selected
                    ? "border-brand bg-brand-light text-brand shadow-sm"
                    : "border-line text-secondary hover:border-line-strong hover:bg-sunken",
                )}
              >
                <Icon className="h-5 w-5" />
                {t(method.labelKey)}
                {selected && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </section>

      {editMode && (
        <section className="rounded-xl bg-elevated/70 p-3 ring-1 ring-line">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-secondary">
              <span>{t("paidOriginal")}</span>
              <span className="tabular">{formatMoney(paid)}</span>
            </div>
            <div className="flex justify-between text-secondary">
              <span>{t("total")}</span>
              <span className="tabular">{formatMoney(total)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-line-strong pt-1.5 font-bold text-primary">
              <span>{t("moneyDiff")}</span>
              <span
                className={cn(
                  "tabular",
                  diff > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : diff < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-faint-strong",
                )}
              >
                {diff > 0 ? `+${formatMoney(diff)}` : formatMoney(diff)}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <span className="text-xs font-medium text-secondary">{t("discount")}</span>
          <div className="mt-1 flex gap-1.5">
            <div className="flex shrink-0 rounded-lg bg-sunken p-0.5 ring-1 ring-line">
              {(["fixed", "percent"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDiscountType(mode)}
                  aria-pressed={discount.type === mode}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors",
                    discount.type === mode
                      ? "bg-surface text-primary shadow-sm ring-1 ring-line"
                      : "text-faint hover:text-secondary",
                  )}
                >
                  {mode === "percent" ? "%" : "SAR"}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              step={discount.type === "percent" ? 0.5 : 0.5}
              max={discount.type === "percent" ? 100 : undefined}
              name="discount"
              aria-label={t("discount")}
              value={
                discount.type === "percent"
                  ? Math.round(discount.value * 100)
                  : discount.value
              }
              onChange={(e) =>
                setDiscountValue(
                  discount.type === "percent"
                    ? (Number(e.target.value) || 0) / 100
                    : Number(e.target.value) || 0,
                )
              }
              className="tabular min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <TaxEditor
          taxes={taxes}
          addTax={addTax}
          updateTax={updateTax}
          removeTax={removeTax}
        />

        {isCash && !editMode && (
          <div>
            <span className="text-xs font-medium text-secondary">{t("amountTendered")}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {quickAmounts.map((amount) => {
                const active = tendered === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTendered(active ? 0 : amount)}
                    aria-pressed={active}
                    className={cn(
                      "tabular cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition-all active:scale-95",
                      active
                        ? "bg-brand text-white ring-brand"
                        : "bg-surface text-secondary ring-line hover:bg-sunken",
                    )}
                  >
                    {amount >= total ? formatMoney(amount) : `${formatMoney(amount)}+`}
                  </button>
                );
              })}
            </div>
            <input
              type="number"
              min={0}
              step={0.5}
              name="tendered"
              value={tendered || ""}
              onChange={(e) => setTendered(Math.max(0, Number(e.target.value) || 0))}
              placeholder={t("customAmount")}
              inputMode="decimal"
              aria-label={t("amountTendered")}
              className="tabular mt-2 w-full rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-primary focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {insufficient && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("stillDue", { money: formatMoney(total - tendered) })}
              </p>
            )}
            {change >= 0 && tendered > 0 && (
              <p
                className={cn(
                  "mt-1.5 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                )}
              >
                <span>{change === 0 ? t("exactAmount") : t("changeDue")}</span>
                <span className="tabular">{formatMoney(change)}</span>
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
});

/* --------------------------- Shared pieces ---------------------------- */

const TotalsRows = memo(function TotalsRows({
  pricing,
  discount,
}: {
  pricing: ReturnType<typeof computePricing>;
  discount: Discount;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-secondary">
        <span>{t("subtotal")}</span>
        <span className="tabular">{formatMoney(pricing.subtotal)}</span>
      </div>
      {pricing.discountAmount > 0 && (
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
          <span>
            {discount.type === "percent"
              ? t("discountLinePct", { pct: Math.round(discount.value * 100) })
              : t("discountLine")}
          </span>
          <span className="tabular">-{formatMoney(pricing.discountAmount)}</span>
        </div>
      )}
      {pricing.taxAmounts
        .filter(({ amount }) => amount > 0)
        .map(({ tax, amount }) => (
          <div key={tax.id} className="flex justify-between text-secondary">
            <span>
              {tax.type === "percent"
                ? t("taxLinePct", { name: tax.name, pct: Math.round((tax.rate ?? 0) * 100) })
                : tax.name}
            </span>
            <span className="tabular">{formatMoney(amount)}</span>
          </div>
        ))}
      <div className="flex justify-between border-t border-dashed border-line-strong pt-2 text-base font-bold text-primary">
        <span>{t("total")}</span>
        <span className="tabular">{formatMoney(pricing.total)}</span>
      </div>
    </div>
  );
});

const TaxEditor = memo(function TaxEditor({
  taxes,
  addTax,
  updateTax,
  removeTax,
}: {
  taxes: Tax[];
  addTax: (tax: Tax) => void;
  updateTax: (id: string, patch: Partial<Tax>) => void;
  removeTax: (id: string) => void;
}) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<TaxType>("percent");
  const [value, setValue] = useState("");

  const confirmAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addTax({
      id: `tax_${crypto.randomUUID()}`,
      name: trimmed,
      kind: "custom",
      type,
      ...(type === "percent"
        ? { rate: Math.max(0, Math.min(1, (Number(value) || 0) / 100)) }
        : { value: Math.max(0, Number(value) || 0) }),
    });
    setName("");
    setValue("");
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-secondary">{t("taxes")}</span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand-light"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addTax")}
        </button>
      </div>

      <ul className="mt-1.5 space-y-1.5">
        {taxes.map((tax) => {
          const isVat = tax.kind === "vat";
          return (
            <li
              key={tax.id}
              className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-2 ring-1 ring-line"
            >
              <input
                type="text"
                value={tax.name}
                disabled={isVat}
                onChange={(e) => updateTax(tax.id, { name: e.target.value })}
                aria-label={t("taxNamePlaceholder")}
                className={cn(
                  "min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-primary focus:border-brand focus:bg-surface focus:outline-none",
                  isVat && "opacity-60",
                )}
              />
              {tax.type === "percent" ? (
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={Math.round((tax.rate ?? 0) * 100)}
                    onChange={(e) =>
                      updateTax(tax.id, {
                        rate: Math.max(0, Math.min(1, (Number(e.target.value) || 0) / 100)),
                      })
                    }
                    aria-label={t("taxRate")}
                    className="tabular w-14 rounded border border-line-strong bg-surface px-1.5 py-0.5 text-end text-sm text-primary focus:border-brand focus:outline-none"
                  />
                  <span className="text-xs text-faint">%</span>
                </span>
              ) : (
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={tax.value ?? 0}
                  onChange={(e) =>
                    updateTax(tax.id, { value: Math.max(0, Number(e.target.value) || 0) })
                  }
                  aria-label={t("taxAmount")}
                  className="tabular w-20 rounded border border-line-strong bg-surface px-1.5 py-0.5 text-end text-sm text-primary focus:border-brand focus:outline-none"
                />
              )}
              {!isVat && (
                <button
                  type="button"
                  onClick={() => removeTax(tax.id)}
                  aria-label={t("removeTax", { name: tax.name })}
                  className="cursor-pointer rounded-md p-1 text-line-strong transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {adding && (
        <div className="mt-1.5 space-y-1.5 rounded-lg bg-elevated p-2.5 ring-1 ring-line">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("taxNamePlaceholder")}
            aria-label={t("taxNamePlaceholder")}
            className="w-full rounded border border-line-strong bg-surface px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
          />
          <div className="flex items-center gap-1.5">
            <div className="flex shrink-0 rounded-lg bg-sunken p-0.5 ring-1 ring-line">
              {(["percent", "fixed"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setType(m)}
                  aria-pressed={type === m}
                  className={cn(
                    "cursor-pointer rounded-md px-2 py-1 text-xs font-bold transition-colors",
                    type === m
                      ? "bg-surface text-primary shadow-sm ring-1 ring-line"
                      : "text-faint hover:text-secondary",
                  )}
                >
                  {m === "percent" ? "%" : "SAR"}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              step={0.5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "percent" ? "%" : "SAR"}
              aria-label={t("taxAmount")}
              className="tabular min-w-0 flex-1 rounded border border-line-strong bg-surface px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
            />
            <button
              type="button"
              onClick={confirmAdd}
              className="shrink-0 cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark"
            >
              {t("add")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

const Stepper = memo(function Stepper({
  productId,
  name,
  quantity,
}: {
  productId: string;
  name: string;
  quantity: number;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 rounded-lg ring-1 ring-line">
      <button
        type="button"
        onClick={() => useCartStore.getState().setQuantity(productId, quantity - 1)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-s-lg text-secondary transition-colors hover:bg-sunken active:bg-line"
        aria-label={t("decrease", { name })}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="tabular w-7 text-center text-sm font-semibold text-primary">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => useCartStore.getState().setQuantity(productId, quantity + 1)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-e-lg text-secondary transition-colors hover:bg-sunken active:bg-line"
        aria-label={t("increase", { name })}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

function EditEmptyState({ onCancelEdit }: { onCancelEdit: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40">
        <Pencil className="h-6 w-6 text-amber-600 dark:text-amber-400" />
      </div>
      <p className="text-sm font-medium text-secondary">{t("editModeEmpty")}</p>
      <p className="max-w-[240px] text-xs text-faint">{t("editModeEmptyHint")}</p>
      <button
        type="button"
        onClick={onCancelEdit}
        className="mt-2 cursor-pointer rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700"
      >
        {t("cancelEdit")}
      </button>
    </div>
  );
}

function EmptyState({
  parked,
  onResume,
  onDiscard,
  onClose,
}: {
  parked: {
    id: string;
    label: string;
    lines: { quantity: number; lineTotal: number }[];
    discount: Discount;
    taxes: Tax[];
  }[];
  onResume: (id: string) => void;
  onDiscard: (id: string) => void;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunken">
          <ScanBarcode className="h-6 w-6 text-faint" />
        </div>
        <p className="text-sm font-medium text-secondary">{t("cartEmpty")}</p>
        <p className="max-w-[220px] text-xs text-faint">{t("cartEmptyHint")}</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold text-faint-strong ring-1 ring-line hover:bg-sunken"
          >
            {t("closeCart")}
          </button>
        )}
      </div>

      {parked.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">
            {t("parkedOrders", { n: parked.length })}
          </p>
          <ul className="space-y-2">
            {parked.map((p) => {
              const parkedTotal = computePricing(
                p.lines,
                normalizeDiscount(p.discount),
                normalizeTaxes(p.taxes),
              ).total;
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 shadow-sm ring-1 ring-line"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary">{p.label}</p>
                    <p className="tabular text-xs text-faint">
                      {t("items", {
                        n: p.lines.reduce((s, l) => s + l.quantity, 0),
                      })}{" "}
                      · {formatMoney(parkedTotal)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onResume(p.id)}
                      className="flex cursor-pointer items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t("resume")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDiscard(p.id)}
                      className="cursor-pointer rounded-lg p-1.5 text-faint hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                      aria-label={t("removeItem", { name: p.label })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
