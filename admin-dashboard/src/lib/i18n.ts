import type { PaymentMethod, OrderStatus } from "./orders";
import type { UserRole, UserStatus } from "./data";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

const en = {
  app: {
    name: "Admin Console",
    tagline: "SaaS back-office",
    demo: "Demo · local mock data",
  },
  nav: {
    dashboard: "Dashboard",
    users: "Users",
    orders: "Orders",
    settings: "Settings",
    main: "Main",
  },
  aria: {
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    theme: "Toggle theme",
    language: "Change language",
    skipToContent: "Skip to content",
    themeLight: "Light theme",
    themeDark: "Dark theme",
    themeSystem: "System theme",
    selectTheme: "Select theme",
    selectLanguage: "Select language",
    selectSidebar: "Sidebar layout",
    selectCurrency: "Default currency",
    mobileNav: "Navigation",
  },
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of revenue, orders, and customers.",
    totalRevenue: "Total Revenue",
    orders: "Orders",
    activeCustomers: "Active Customers",
    refundRate: "Refund Rate",
    avgOrderValue: "Avg Order Value",
    vsLastMonth: "vs last month",
    revenueOrders: "Revenue & Orders",
    inSar: "in SAR",
    months3: "3 months",
    months6: "6 months",
    months12: "12 months",
    revenue: "Revenue",
    paymentMethods: "Payment Methods",
    paymentSubtitle: "Share of revenue this month",
    total: "Total",
    topProducts: "Top Products",
    topProductsSubtitle: "Best sellers this month",
    units: "units",
    recentOrders: "Recent Orders",
    recentOrdersSubtitle: "Latest transactions",
    order: "Order",
    customer: "Customer",
    payment: "Payment",
    status: "Status",
    date: "Date",
    totalColumn: "Total",
  },
  grid: {
    search: "Search orders…",
    statusAll: "All statuses",
    regionAll: "All regions",
    region: "Region",
    exportCsv: "Export CSV",
    exporting: "Exporting…",
    saveView: "Save view",
    viewName: "View name…",
    savedViews: "Saved views",
    noSavedViews: "No saved views yet",
    loadView: "Load",
    deleteView: "Delete",
    showing: "Showing",
    of: "of",
    resultCount: "{n} results",
    noResults: "No orders match your filters.",
    avgOrder: "Avg order",
    aggregate: "Web Worker aggregation",
    ms: "ms",
    columns: "Columns",
    showAll: "Show all",
    editStatus: "Change status",
    resizeHint: "Drag to resize",
    rowOf: "Row {n} of {m}",
    kbdHint:
      "Use arrow keys to move, Home/End for first and last row, Enter to change status.",
    ordersGrid: "Orders data grid",
    modeLabel: "Rows",
    modeVirtual: "Virtual",
    modePaged: "Infinite",
    loadedOf: "Loaded {n} of {m}",
    loadingMore: "Loading more…",
    aggregateScope: "full dataset",
    aggregateScopeFiltered: "current filter",
    aggregateError: "aggregation failed",
    aggregateHint:
      "Computed on a background thread over the full dataset — the UI never blocks.",
  },
  status: {
    paid: "Paid",
    pending: "Pending",
    refunded: "Refunded",
    active: "Active",
    suspended: "Suspended",
    invited: "Invited",
  },
  payment: {
    card: "Card",
    cash: "Cash",
    wallet: "Wallet",
  },
  users: {
    title: "Users",
    subtitle: "Manage team members and roles.",
    name: "Name",
    email: "Email",
    role: "Role",
    status: "Status",
    created: "Created",
  },
  role: {
    admin: "Admin",
    cashier: "Cashier",
    manager: "Manager",
  },
  settings: {
    title: "Settings",
    subtitle: "Appearance, language, and app preferences.",
    appearance: "Appearance",
    appearanceSubtitle: "These controls update the app instantly.",
    themeLabel: "Theme",
    languageLabel: "Language",
    languageSubtitle: "Switch between English and Arabic (RTL).",
    sidebarLabel: "Sidebar",
    sidebarSubtitle: "Collapse the sidebar for a more compact layout.",
    sidebarExpanded: "Expanded",
    sidebarCollapsed: "Collapsed",
    sidebarExpandedDesc: "Labels always visible",
    sidebarCollapsedDesc: "Icons only with tooltips",
    currencyLabel: "Currency",
    currencySubtitle: "Used across the whole app.",
    storeProfile: "Store profile",
    storeProfileSubtitle: "Saved locally in this demo.",
    storeName: "Store name",
    vatRate: "VAT rate (%)",
    emailNotifications: "Email notifications",
    emailNotificationsSub: "Receive order and refund alerts",
    saveChanges: "Save changes",
    saved: "Changes saved",
  },
};

const ar: typeof en = {
  app: {
    name: "لوحة التحكم",
    tagline: "نظام إدارة الأعمال",
    demo: "عرض تجريبي · بيانات محلية",
  },
  nav: {
    dashboard: "لوحة التحكم",
    users: "المستخدمون",
    orders: "الطلبات",
    settings: "الإعدادات",
    main: "الرئيسية",
  },
  aria: {
    collapseSidebar: "طي الشريط الجانبي",
    expandSidebar: "توسيع الشريط الجانبي",
    openMenu: "فتح قائمة التنقل",
    closeMenu: "إغلاق قائمة التنقل",
    theme: "تبديل المظهر",
    language: "تغيير اللغة",
    skipToContent: "تخطي إلى المحتوى",
    themeLight: "الوضع الفاتح",
    themeDark: "الوضع الداكن",
    themeSystem: "الوضع التلقائي",
    selectTheme: "اختر المظهر",
    selectLanguage: "اختر اللغة",
    selectSidebar: "تخطيط الشريط الجانبي",
    selectCurrency: "العملة الافتراضية",
    mobileNav: "التنقل",
  },
  dashboard: {
    title: "لوحة التحكم",
    subtitle: "نظرة عامة على الإيرادات والطلبات والعملاء.",
    totalRevenue: "إجمالي الإيرادات",
    orders: "الطلبات",
    activeCustomers: "العملاء النشطون",
    refundRate: "معدل الاسترداد",
    avgOrderValue: "متوسط قيمة الطلب",
    vsLastMonth: "مقابل الشهر الماضي",
    revenueOrders: "الإيرادات والطلبات",
    inSar: "بالريال السعودي",
    months3: "3 أشهر",
    months6: "6 أشهر",
    months12: "12 شهرًا",
    revenue: "الإيرادات",
    paymentMethods: "طرق الدفع",
    paymentSubtitle: "حصة الإيرادات هذا الشهر",
    total: "الإجمالي",
    topProducts: "المنتجات الأعلى مبيعًا",
    topProductsSubtitle: "الأكثر مبيعًا هذا الشهر",
    units: "وحدة",
    recentOrders: "أحدث الطلبات",
    recentOrdersSubtitle: "آخر العمليات",
    order: "الطلب",
    customer: "العميل",
    payment: "الدفع",
    status: "الحالة",
    date: "التاريخ",
    totalColumn: "الإجمالي",
  },
  grid: {
    search: "ابحث في الطلبات…",
    statusAll: "كل الحالات",
    regionAll: "كل المناطق",
    region: "المنطقة",
    exportCsv: "تصدير CSV",
    exporting: "جارٍ التصدير…",
    saveView: "حفظ العرض",
    viewName: "اسم العرض…",
    savedViews: "العروض المحفوظة",
    noSavedViews: "لا توجد عروض محفوظة بعد",
    loadView: "تحميل",
    deleteView: "حذف",
    showing: "عرض",
    of: "من",
    resultCount: "{n} نتيجة",
    noResults: "لا توجد طلبات تطابق عوامل التصفية.",
    avgOrder: "متوسط الطلب",
    aggregate: "تجميع عبر Web Worker",
    ms: "مللي ثانية",
    columns: "الأعمدة",
    showAll: "عرض الكل",
    editStatus: "تغيير الحالة",
    resizeHint: "اسحب لتغيير العرض",
    rowOf: "الصف {n} من {m}",
    kbdHint:
      "استخدم مفاتيح الأسهم للتنقل، Home/End للانتقال إلى أول وآخر صف، وEnter لتغيير الحالة.",
    ordersGrid: "شبكة بيانات الطلبات",
    modeLabel: "الصفوف",
    modeVirtual: "افتراضي",
    modePaged: "لا نهائي",
    loadedOf: "تم تحميل {n} من {m}",
    loadingMore: "جارٍ تحميل المزيد…",
    aggregateScope: "كامل مجموعة البيانات",
    aggregateScopeFiltered: "عامل التصفية الحالي",
    aggregateError: "فشل التجميع",
    aggregateHint:
      "يُحسب على خيط خلفي على كامل مجموعة البيانات — لا تتجمد الواجهة أبدًا.",
  },
  status: {
    paid: "مدفوع",
    pending: "قيد الانتظار",
    refunded: "مسترد",
    active: "نشط",
    suspended: "موقوف",
    invited: "مدعو",
  },
  payment: {
    card: "بطاقة",
    cash: "نقدي",
    wallet: "محفظة",
  },
  users: {
    title: "المستخدمون",
    subtitle: "إدارة أعضاء الفريق والأدوار.",
    name: "الاسم",
    email: "البريد الإلكتروني",
    role: "الدور",
    status: "الحالة",
    created: "تاريخ الإنشاء",
  },
  role: {
    admin: "مدير",
    cashier: "أمين صندوق",
    manager: "مشرف",
  },
  settings: {
    title: "الإعدادات",
    subtitle: "المظهر واللغة وتفضيلات التطبيق.",
    appearance: "المظهر",
    appearanceSubtitle: "تتحكم هذه الخيارات في التطبيق فورًا.",
    themeLabel: "السمة",
    languageLabel: "اللغة",
    languageSubtitle: "التبديل بين الإنجليزية والعربية (RTL).",
    sidebarLabel: "الشريط الجانبي",
    sidebarSubtitle: "اطوِ الشريط الجانبي للحصول على تخطيط مدمج.",
    sidebarExpanded: "موسّع",
    sidebarCollapsed: "مطوي",
    sidebarExpandedDesc: "التسميات ظاهرة دائمًا",
    sidebarCollapsedDesc: "أيقونات فقط مع تلميحات",
    currencyLabel: "العملة",
    currencySubtitle: "تُستخدم في جميع أنحاء التطبيق.",
    storeProfile: "ملف المتجر",
    storeProfileSubtitle: "يُحفظ محليًا في هذا العرض التجريبي.",
    storeName: "اسم المتجر",
    vatRate: "نسبة الضريبة (٪)",
    emailNotifications: "إشعارات البريد الإلكتروني",
    emailNotificationsSub: "استلام تنبيهات الطلبات والاسترداد",
    saveChanges: "حفظ التغييرات",
    saved: "تم حفظ التغييرات",
  },
};

export type Messages = typeof en;
export const messages: Record<Locale, Messages> = { en, ar };

/**
 * Typed lookups for enum-like keys. Instead of `t(\`status.${x}\` as never)`
 * these build the key from a closed union, so typos are caught at compile time
 * and the result is guaranteed to be a valid i18n path.
 */
export type StatusKey = OrderStatus | UserStatus;
export const tStatus = (status: StatusKey): NestedKeyOf<Messages> =>
  `status.${status}` as NestedKeyOf<Messages>;

export const tPayment = (payment: PaymentMethod): NestedKeyOf<Messages> =>
  `payment.${payment}` as NestedKeyOf<Messages>;

export const tRole = (role: UserRole): NestedKeyOf<Messages> =>
  `role.${role.toLowerCase()}` as NestedKeyOf<Messages>;

/**
 * Builds the flattened dotted-path union of a nested dictionary. `Obj` is
 * recursed while values are still objects; leaf strings yield their path.
 */
export type NestedKeyOf<Obj, Prefix extends string = ""> = {
  [K in keyof Obj]: Obj[K] extends string
    ? Prefix extends ""
      ? K
      : `${Prefix}.${K & string}`
    : NestedKeyOf<
        Obj[K],
        Prefix extends "" ? K & string : `${Prefix}.${K & string}`
      >;
}[keyof Obj];

/**
 * Resolves a dotted path against a dictionary. Returns `undefined` for missing
 * keys so callers can build a fallback chain: active locale -> English -> the
 * raw key itself (see `settings-provider.tsx`).
 */
export function resolvePath(
  obj: unknown,
  path: string,
): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : undefined;
}
