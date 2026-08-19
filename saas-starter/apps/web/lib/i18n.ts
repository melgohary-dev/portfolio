export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

const en = {
  app: {
    name: 'SaaS Starter',
  },
  nav: {
    organization: 'Organization',
    dashboard: 'Dashboard',
    orders: 'Orders',
    analytics: 'Analytics',
    settings: 'Settings',
    signOut: 'Sign out',
    changeLanguage: 'Change language',
  },
  plan: {
    free: 'Free',
    pro: 'Pro',
  },
  status: {
    pending: 'Pending',
    paid: 'Paid',
    refunded: 'Refunded',
    failed: 'Failed',
    active: 'Active',
    trialing: 'Trialing',
    canceled: 'Canceled',
    past_due: 'Past due',
    incomplete: 'Incomplete',
    incomplete_expired: 'Incomplete (expired)',
    unpaid: 'Unpaid',
    paused: 'Paused',
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Live stats for this organization',
    totalOrders: 'Total orders',
    revenue: 'Revenue',
    avgOrderValue: 'Avg order value',
    ordersByStatus: 'Orders by status',
    last7Days: 'Orders — last 7 days',
  },
  orders: {
    title: 'Orders',
    ordersTotal: '{n} orders total',
  },
  grid: {
    search: 'Search customer, email or ID…',
    allStatuses: 'All statuses',
    pending: 'Pending',
    paid: 'Paid',
    refunded: 'Refunded',
    failed: 'Failed',
    exportCsv: 'Export CSV',
    loadMore: 'Load more',
    loading: 'Loading…',
    newOrder: 'New order from {name}',
    count: '{n} / {m} orders',
    id: 'ID',
    customer: 'Customer',
    email: 'Email',
    status: 'Status',
    created: 'Created',
    total: 'Total',
    sortAscending: 'sorted ascending',
    sortDescending: 'sorted descending',
    sortNone: 'not sorted',
  },
  analytics: {
    title: 'Analytics',
    subtitle: 'Live analytics from the API, refreshed every 10s',
    totalOrders: 'Total orders',
    revenue: 'Revenue',
    avgOrderValue: 'Avg order value',
    ordersByStatus: 'Orders by status',
    last7Days: 'Orders — last 7 days',
    successRate: 'Payment success rate',
    successRateHint: 'Paid orders as a share of all orders.',
    loading: 'Loading analytics…',
    failed: 'Failed to load stats',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Organization, team and plan',
    upgraded: 'Your organization is now on the Pro plan.',
    cancelled: 'Your subscription was cancelled. You are back on the Free plan.',
    mockPortal: 'Simulated customer portal: in production this links to Stripe.',
    organization: 'Organization',
    billing: 'Billing',
    team: 'Team',
    name: 'Name',
    slug: 'Slug',
    plan: 'Plan',
    freeActive: 'Free (active)',
  },
  billing: {
    manage: 'Manage billing',
    cancelPlan: 'Cancel plan',
    confirmCancel: 'Are you sure?',
    yesCancel: 'Yes, cancel',
    noKeep: 'Keep plan',
    current: 'Current',
    perMonth: '/month',
    upgradeTo: 'Upgrade to {plan}',
    simulatedNote:
      'Simulated billing: set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO_MONTHLY to use live Stripe Checkout.',
    renews: 'Renews {date}',
  },
  checkout: {
    appName: 'SaaS Starter',
    secure: 'Secure',
    planLabel: '{plan} plan',
    perMonth: '/month',
    simulatedNote: 'Simulated checkout — no card is charged. Set Stripe keys to go live.',
    payNow: 'Pay now (simulated)',
    processing: 'Processing…',
    cancel: 'Cancel',
  },
  forms: {
    createOrg: 'Create an organization',
    orgNamePlaceholder: 'Organization name',
    create: 'Create',
    creating: 'Creating…',
    orgCreated: 'Organization created — switch to it from the sidebar.',
    inviteMember: 'Invite a member',
    teammateEmail: 'teammate@company.com',
    member: 'Member',
    admin: 'Admin',
    invite: 'Invite',
    inviting: 'Inviting…',
    invited: 'Invitation sent.',
  },
  auth: {
    signInTitle: 'Sign in to your workspace',
    emailPlaceholder: 'you@company.com',
    passwordPlaceholder: 'Password',
    signingIn: 'Signing in…',
    signIn: 'Sign in',
    createAccount: 'Create an account',
    forgotPassword: 'Forgot password?',
  },
  register: {
    title: 'Create your workspace',
    subtitle: 'An organization is created for you',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'you@company.com',
    orgNamePlaceholder: 'Organization name',
    passwordPlaceholder: 'Password (min. 8 characters)',
    creating: 'Creating account…',
    submit: 'Create account',
    alreadyHave: 'Already have an account?',
    logIn: 'Log in',
  },
  forgot: {
    title: 'Reset your password',
    subtitle: "We'll email you a link to choose a new one",
    emailPlaceholder: 'you@company.com',
    sent: 'If an account exists for that email, a reset link is on its way.',
    sending: 'Sending…',
    submit: 'Send reset link',
    backToLogin: 'Back to log in',
  },
  reset: {
    invalidTitle: 'Invalid link',
    invalidBody: 'This reset link is missing a token. Request a new one.',
    requestNew: 'Request a new link',
    chooseTitle: 'Choose a new password',
    passwordPlaceholder: 'New password (min. 8 characters)',
    updated: 'Password updated. You can now log in.',
    goToLogin: 'Go to log in',
    saving: 'Saving…',
    submit: 'Update password',
  },
  error: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    INVALID_INPUT: 'Enter a valid email and password.',
    EMAIL_EXISTS: 'An account with this email already exists.',
    ACCOUNT_CREATE_FAILED: 'Could not create your account.',
    AUTO_SIGNIN_FAILED: 'Account created. Please sign in.',
    ENTER_VALID_EMAIL: 'Enter a valid email address.',
    ENTER_ORG_NAME: 'Enter an organization name.',
    ENTER_VALID_EMAIL_ADDRESS: 'Enter a valid email address.',
    NOT_SIGNED_IN: 'Not signed in.',
    NO_ORGANIZATION: 'No organization selected.',
    RESET_INVALID: 'Password must be at least 8 characters.',
    RESET_EXPIRED: 'This reset link is invalid or has expired.',
    INVITE_USER_NOT_FOUND: 'No account found for that email yet.',
    INVITE_ALREADY_MEMBER: 'That user is already a member.',
  },
};

const ar: typeof en = {
  app: {
    name: 'ساس ستارتر',
  },
  nav: {
    organization: 'المؤسسة',
    dashboard: 'لوحة التحكم',
    orders: 'الطلبات',
    analytics: 'التحليلات',
    settings: 'الإعدادات',
    signOut: 'تسجيل الخروج',
    changeLanguage: 'تغيير اللغة',
  },
  plan: {
    free: 'مجاني',
    pro: 'احترافي',
  },
  status: {
    pending: 'قيد الانتظار',
    paid: 'مدفوع',
    refunded: 'مسترد',
    failed: 'فاشل',
    active: 'نشط',
    trialing: 'فترة تجريبية',
    canceled: 'ملغى',
    past_due: 'متأخر الدفع',
    incomplete: 'غير مكتمل',
    incomplete_expired: 'غير مكتمل (منتهي)',
    unpaid: 'غير مدفوع',
    paused: 'متوقف',
  },
  dashboard: {
    title: 'لوحة التحكم',
    subtitle: 'إحصائيات مباشرة لهذه المؤسسة',
    totalOrders: 'إجمالي الطلبات',
    revenue: 'الإيرادات',
    avgOrderValue: 'متوسط قيمة الطلب',
    ordersByStatus: 'الطلبات حسب الحالة',
    last7Days: 'الطلبات — آخر 7 أيام',
  },
  orders: {
    title: 'الطلبات',
    ordersTotal: '{n} طلب إجمالاً',
  },
  grid: {
    search: 'ابحث عن عميل أو بريد أو معرّف…',
    allStatuses: 'كل الحالات',
    pending: 'قيد الانتظار',
    paid: 'مدفوع',
    refunded: 'مسترد',
    failed: 'فاشل',
    exportCsv: 'تصدير CSV',
    loadMore: 'تحميل المزيد',
    loading: 'جارٍ التحميل…',
    newOrder: 'طلب جديد من {name}',
    count: '{n} / {m} طلب',
    id: 'المعرّف',
    customer: 'العميل',
    email: 'البريد الإلكتروني',
    status: 'الحالة',
    created: 'تاريخ الإنشاء',
    total: 'الإجمالي',
    sortAscending: 'مرتب تصاعديًا',
    sortDescending: 'مرتب تنازليًا',
    sortNone: 'غير مرتب',
  },
  analytics: {
    title: 'التحليلات',
    subtitle: 'تحليلات مباشرة من الواجهة البرمجية، تُحدَّث كل 10 ثوانٍ',
    totalOrders: 'إجمالي الطلبات',
    revenue: 'الإيرادات',
    avgOrderValue: 'متوسط قيمة الطلب',
    ordersByStatus: 'الطلبات حسب الحالة',
    last7Days: 'الطلبات — آخر 7 أيام',
    successRate: 'نسبة نجاح الدفع',
    successRateHint: 'الطلبات المدفوعة كنسبة من إجمالي الطلبات.',
    loading: 'جارٍ تحميل التحليلات…',
    failed: 'تعذّر تحميل الإحصائيات',
  },
  settings: {
    title: 'الإعدادات',
    subtitle: 'المؤسسة والفريق والخطة',
    upgraded: 'مؤسستك الآن على الخطة الاحترافية.',
    cancelled: 'تم إلغاء اشتراكك. عدت إلى الخطة المجانية.',
    mockPortal: 'بوابة عملاء تجريبية: في الإنتاج تُربط بـ Stripe.',
    organization: 'المؤسسة',
    billing: 'الفوترة',
    team: 'الفريق',
    name: 'الاسم',
    slug: 'المعرّف',
    plan: 'الخطة',
    freeActive: 'مجاني (نشط)',
  },
  billing: {
    manage: 'إدارة الفوترة',
    cancelPlan: 'إلغاء الخطة',
    confirmCancel: 'هل أنت متأكد؟',
    yesCancel: 'نعم، إلغاء',
    noKeep: 'الاحتفاظ بالخطة',
    current: 'الحالية',
    perMonth: '/شهر',
    upgradeTo: 'الترقية إلى {plan}',
    simulatedNote:
      'فوترة تجريبية: اضبط STRIPE_SECRET_KEY و STRIPE_PRICE_PRO_MONTHLY للتبديل إلى Stripe مباشرة.',
    renews: 'يتجدد في {date}',
  },
  checkout: {
    appName: 'ساس ستارتر',
    secure: 'آمن',
    planLabel: 'خطة {plan}',
    perMonth: '/شهر',
    simulatedNote: 'دفع تجريبي — لا تُسجَّل أي بطاقة. اضبط مفاتيح Stripe للتفعيل.',
    payNow: 'ادفع الآن (تجريبي)',
    processing: 'جارٍ المعالجة…',
    cancel: 'إلغاء',
  },
  forms: {
    createOrg: 'إنشاء مؤسسة',
    orgNamePlaceholder: 'اسم المؤسسة',
    create: 'إنشاء',
    creating: 'جارٍ الإنشاء…',
    orgCreated: 'تم إنشاء المؤسسة — انتقل إليها من الشريط الجانبي.',
    inviteMember: 'دعوة عضو',
    teammateEmail: 'teammate@company.com',
    member: 'عضو',
    admin: 'مدير',
    invite: 'دعوة',
    inviting: 'جارٍ الدعوة…',
    invited: 'تم إرسال الدعوة.',
  },
  auth: {
    signInTitle: 'تسجيل الدخول إلى مساحة عملك',
    emailPlaceholder: 'you@company.com',
    passwordPlaceholder: 'كلمة المرور',
    signingIn: 'جارٍ تسجيل الدخول…',
    signIn: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    forgotPassword: 'نسيت كلمة المرور؟',
  },
  register: {
    title: 'أنشئ مساحة عملك',
    subtitle: 'سيتم إنشاء مؤسسة لك تلقائيًا',
    namePlaceholder: 'اسمك',
    emailPlaceholder: 'you@company.com',
    orgNamePlaceholder: 'اسم المؤسسة',
    passwordPlaceholder: 'كلمة المرور (8 أحرف على الأقل)',
    creating: 'جارٍ إنشاء الحساب…',
    submit: 'إنشاء حساب',
    alreadyHave: 'لديك حساب بالفعل؟',
    logIn: 'تسجيل الدخول',
  },
  forgot: {
    title: 'إعادة تعيين كلمة المرور',
    subtitle: 'سنرسل إليك رابطًا لاختيار كلمة مرور جديدة',
    emailPlaceholder: 'you@company.com',
    sent: 'إذا كان هناك حساب لهذا البريد، فسيصلك رابط إعادة التعيين.',
    sending: 'جارٍ الإرسال…',
    submit: 'إرسال رابط إعادة التعيين',
    backToLogin: 'العودة إلى تسجيل الدخول',
  },
  reset: {
    invalidTitle: 'رابط غير صالح',
    invalidBody: 'هذا الرابط يفتقر إلى رمز التحقق. اطلب رابطًا جديدًا.',
    requestNew: 'اطلب رابطًا جديدًا',
    chooseTitle: 'اختر كلمة مرور جديدة',
    passwordPlaceholder: 'كلمة المرور الجديدة (8 أحرف على الأقل)',
    updated: 'تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول.',
    goToLogin: 'الانتقال إلى تسجيل الدخول',
    saving: 'جارٍ الحفظ…',
    submit: 'تحديث كلمة المرور',
  },
  error: {
    INVALID_CREDENTIALS: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    INVALID_INPUT: 'أدخل بريدًا إلكترونيًا وكلمة مرور صالحة.',
    EMAIL_EXISTS: 'يوجد حساب بهذا البريد الإلكتروني بالفعل.',
    ACCOUNT_CREATE_FAILED: 'تعذّر إنشاء حسابك.',
    AUTO_SIGNIN_FAILED: 'تم إنشاء الحساب. يرجى تسجيل الدخول.',
    ENTER_VALID_EMAIL: 'أدخل عنوان بريد إلكتروني صالح.',
    ENTER_ORG_NAME: 'أدخل اسم المؤسسة.',
    ENTER_VALID_EMAIL_ADDRESS: 'أدخل عنوان بريد إلكتروني صالح.',
    NOT_SIGNED_IN: 'غير مسجل الدخول.',
    NO_ORGANIZATION: 'لم يتم اختيار مؤسسة.',
    RESET_INVALID: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    RESET_EXPIRED: 'رابط إعادة التعيين هذا غير صالح أو منتهي الصلاحية.',
    INVITE_USER_NOT_FOUND: 'لا يوجد حساب لهذا البريد الإلكتروني.',
    INVITE_ALREADY_MEMBER: 'هذا المستخدم عضو بالفعل.',
  },
};

export type Messages = typeof en;
export const messages: Record<Locale, Messages> = { en, ar };

export type NestedKeyOf<Obj, Prefix extends string = ''> = {
  [K in keyof Obj]: Obj[K] extends string
    ? Prefix extends ''
      ? K
      : `${Prefix}.${K & string}`
    : NestedKeyOf<
        Obj[K],
        Prefix extends '' ? K & string : `${Prefix}.${K & string}`
      >;
}[keyof Obj];

export type MessageKey = NestedKeyOf<Messages>;

const validStatuses = new Set<string>([
  'pending', 'paid', 'refunded', 'failed',
  'active', 'trialing', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'paused',
]);

const validErrors = new Set<string>([
  'INVALID_INPUT', 'INVALID_CREDENTIALS', 'EMAIL_EXISTS', 'ACCOUNT_CREATE_FAILED',
  'AUTO_SIGNIN_FAILED', 'ENTER_VALID_EMAIL', 'RESET_INVALID', 'RESET_EXPIRED',
  'NOT_SIGNED_IN', 'ENTER_ORG_NAME', 'ENTER_VALID_EMAIL_ADDRESS', 'NO_ORGANIZATION',
  'INVITE_USER_NOT_FOUND', 'INVITE_ALREADY_MEMBER',
]);

/** Safely build a status translation key, falling back to the raw value. */
export function statusKey(status: string): MessageKey {
  return validStatuses.has(status) ? (`status.${status}` as MessageKey) : 'status.pending';
}

/** Safely build an error translation key, falling back to the raw value. */
export function errorKey(code: string): MessageKey {
  return validErrors.has(code) ? (`error.${code}` as MessageKey) : 'error.INVALID_INPUT';
}

export function resolvePath(
  obj: unknown,
  path: string,
): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : undefined;
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const template =
    resolvePath(messages[locale], key) ??
    resolvePath(messages.en, key) ??
    key;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
