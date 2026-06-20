import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const en = {
  app: 'CULINOVA — Cash Flow CFO',
  nav: {
    dashboard: 'Dashboard',
    forecast: '13-Week Forecast',
    projects: 'Projects',
    collections: 'Collections',
    payments: 'Payments',
    inventory: 'Inventory & Stock',
    reserve: 'Reserve Fund',
    scenario: 'Scenario Analysis',
    supplierLedger: 'Supplier Ledger',
    customerLedger: 'Customer Ledger',
    aging: 'AR Aging',
    settings: 'Settings',
    users: 'User Management',
    audit: 'Audit Log',
    logout: 'Logout',
  },
  kpi: {
    bankBalance: 'Current Bank Balance',
    collections30: 'Expected Collections (30d)',
    payments30: 'Expected Payments (30d)',
    netCash: 'Net Cash Position (30d)',
    cashStatus: 'Cash Status',
    reserveBalance: 'Reserve Fund Balance',
    reserveGap: 'Reserve Gap',
    minClosing: 'Min Closing (13 wk)',
    criticalWeek: 'Critical Week',
    targetReserve: 'Target Reserve',
  },
  status: { Green: 'Healthy', Yellow: 'Watch', Red: 'Warning', Critical: 'Critical' },
  common: {
    add: 'Add New',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    actions: 'Actions',
    search: 'Search…',
    confirmDelete: 'Are you sure you want to delete this record?',
    noData: 'No records yet. Click “Add New” to begin.',
    saved: 'Saved successfully',
    deleted: 'Deleted',
    loading: 'Loading…',
    total: 'Total',
    language: 'Language',
    currency: 'Display Currency',
    welcome: 'Welcome back',
    signIn: 'Sign in',
    email: 'Email',
    password: 'Password',
    rows: 'rows',
  },
  charts: {
    closingBalance: '13-Week Closing Cash Balance',
    weeklyFlow: 'Weekly Cash Flow (In vs Out)',
    cashTrend: 'Cash Position Trend',
    scenarioCompare: 'Scenario Comparison',
  },
};

const ar = {
  app: 'كولينوفا — التدفق النقدي',
  nav: {
    dashboard: 'لوحة التحكم',
    forecast: 'توقعات 13 أسبوع',
    projects: 'المشاريع',
    collections: 'التحصيلات',
    payments: 'المدفوعات',
    inventory: 'المخزون',
    reserve: 'صندوق الاحتياطي',
    scenario: 'تحليل السيناريو',
    supplierLedger: 'دفتر الموردين',
    customerLedger: 'دفتر العملاء',
    aging: 'أعمار الذمم',
    settings: 'الإعدادات',
    users: 'إدارة المستخدمين',
    audit: 'سجل التدقيق',
    logout: 'تسجيل الخروج',
  },
  kpi: {
    bankBalance: 'رصيد البنك الحالي',
    collections30: 'التحصيلات المتوقعة (30 يوم)',
    payments30: 'المدفوعات المتوقعة (30 يوم)',
    netCash: 'صافي المركز النقدي (30 يوم)',
    cashStatus: 'حالة النقد',
    reserveBalance: 'رصيد الاحتياطي',
    reserveGap: 'فجوة الاحتياطي',
    minClosing: 'أدنى رصيد (13 أسبوع)',
    criticalWeek: 'الأسبوع الحرج',
    targetReserve: 'الاحتياطي المستهدف',
  },
  status: { Green: 'جيد', Yellow: 'مراقبة', Red: 'تحذير', Critical: 'حرج' },
  common: {
    add: 'إضافة جديد',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    actions: 'إجراءات',
    search: 'بحث…',
    confirmDelete: 'هل أنت متأكد من حذف هذا السجل؟',
    noData: 'لا توجد سجلات بعد. اضغط "إضافة جديد" للبدء.',
    saved: 'تم الحفظ بنجاح',
    deleted: 'تم الحذف',
    loading: 'جارٍ التحميل…',
    total: 'الإجمالي',
    language: 'اللغة',
    currency: 'عملة العرض',
    welcome: 'مرحباً بعودتك',
    signIn: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    rows: 'سجلات',
  },
  charts: {
    closingBalance: 'الرصيد النقدي الختامي 13 أسبوع',
    weeklyFlow: 'التدفق النقدي الأسبوعي',
    cashTrend: 'اتجاه المركز النقدي',
    scenarioCompare: 'مقارنة السيناريوهات',
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

export function applyDir(lng) {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
}
applyDir(i18n.language || 'en');
i18n.on('languageChanged', applyDir);

export default i18n;
