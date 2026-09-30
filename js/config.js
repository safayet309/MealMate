/* =========================================================
   Mealmate — Application Configuration
   File: js/config.js

   Responsibility:
   - App-wide constants
   - Supabase connection configuration
   - Business-rule constants
   - UI/runtime defaults

   Important:
   - Only Supabase publishable key belongs in browser code.
   - NEVER put a Supabase secret/service-role key here.
   - Do not hardcode business calculations in page modules.
   ========================================================= */


/* =========================================================
   1. APPLICATION
   ========================================================= */

export const APP_CONFIG = Object.freeze({
  name: "Mealmate",
  shortName: "Mealmate",
  version: "1.0.0",
  environment: "production",

  timezone: "Asia/Dhaka",
  locale: "bn-BD",

  currency: "BDT",
  currencySymbol: "৳",

  dateFormat: "dd MMMM yyyy",
  timeFormat: "hh:mm a",

  storageNamespace: "mealmate",

  features: Object.freeze({
    setupWizard: true,
    dailyMeals: true,
    carryForward: true,
    guestMeals: true,
    fridayFeast: true,
    money: true,
    reports: true,
    csvExport: true,
    pwa: true,
  }),
});


/* =========================================================
   2. SUPABASE
   ========================================================= */

/*
  Add the values from:
  Supabase Dashboard → Connect

  Example:

  url:
  https://xxxxxxxxxxxx.supabase.co

  publishableKey:
  sb_publishable_xxxxxxxxxxxxxxxxx

  IMPORTANT:
  Never put:
  - sb_secret_...
  - service_role
  - any server-only secret
  in this file.
*/

export const SUPABASE_CONFIG = Object.freeze({
  url: "",
  publishableKey: "",

  options: Object.freeze({
    db: Object.freeze({
      schema: "public",
    }),

    auth: Object.freeze({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    }),

    global: Object.freeze({
      headers: Object.freeze({
        "x-client-info": "mealmate-web",
      }),
    }),
  }),
});


/* =========================================================
   3. DATABASE CONTRACT
   ========================================================= */

export const DB_CONFIG = Object.freeze({
  schema: "public",

  tables: Object.freeze({
    mess: "mess",
    messUsers: "mess_users",
    messSettings: "mess_settings",
    rooms: "rooms",
    members: "members",
    mealRates: "meal_rates",
    dailyMeals: "daily_meals",
    guestMeals: "guest_meals",
    moneyTransactions: "money_transactions",
    dailySummary: "daily_summary",
    fridayFeasts: "friday_feasts",
  }),
});


/* =========================================================
   4. BUSINESS RULES
   ========================================================= */

export const BUSINESS_RULES = Object.freeze({
  /* Meal types */
  mealTypes: Object.freeze([
    "full",
    "day",
    "night",
    "none",
  ]),

  /* Money transaction types */
  transactionTypes: Object.freeze([
    "deposit",
    "adjustment",
    "refund",
    "other",
  ]),

  /* Friday */
  fridayDayIndex: 5,

  /* Negative balance */
  negativeBalanceThreshold: 0,

  /* Strong warning threshold */
  strongNegativeBalanceThreshold: -500,

  /* Minimum valid rate */
  minimumRate: 0,

  /* Room range */
  minimumRoomNumber: 1,
  maximumRoomNumber: 99999,

  /* Guest quantity */
  minimumGuestQuantity: 1,

  /* Default pagination */
  defaultPageSize: 50,
});


/* =========================================================
   5. VALIDATION
   ========================================================= */

export const VALIDATION_CONFIG = Object.freeze({
  messName: Object.freeze({
    minLength: 2,
    maxLength: 100,
  }),

  memberName: Object.freeze({
    minLength: 2,
    maxLength: 100,
  }),

  note: Object.freeze({
    maxLength: 500,
  }),

  roomNumber: Object.freeze({
    integerOnly: true,
  }),

  moneyAmount: Object.freeze({
    min: 0,
    max: 999999999,
    decimals: 2,
  }),
});


/* =========================================================
   6. UI CONFIGURATION
   ========================================================= */

export const UI_CONFIG = Object.freeze({
  toastDuration: 3500,

  debounceDelay: 250,

  animationDuration: 200,

  loadingText: "তথ্য লোড হচ্ছে...",

  messages: Object.freeze({
    genericError:
      "তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",

    networkError:
      "ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।",

    unauthorized:
      "এই তথ্য দেখার অনুমতি আপনার নেই।",

    sessionExpired:
      "আপনার সেশন শেষ হয়েছে। আবার প্রবেশ করুন।",

    saveSuccess:
      "তথ্য সফলভাবে সংরক্ষণ হয়েছে।",

    updateSuccess:
      "তথ্য সফলভাবে আপডেট হয়েছে।",

    deleteSuccess:
      "তথ্য সফলভাবে মুছে ফেলা হয়েছে।",

    deactivateSuccess:
      "Member-কে Deactivate করা হয়েছে।",

    validationError:
      "দয়া করে প্রয়োজনীয় তথ্যগুলো সঠিকভাবে পূরণ করুন।",
  }),
});


/* =========================================================
   7. ROUTES
   ========================================================= */

export const ROUTES = Object.freeze({
  home: "index.html",
  setup: "pages/setup.html",
  meals: "pages/meals.html",
  members: "pages/members.html",
  reports: "pages/reports.html",
  settings: "pages/settings.html",
});


/* =========================================================
   8. NAVIGATION
   ========================================================= */

export const NAV_ITEMS = Object.freeze([
  Object.freeze({
    id: "dashboard",
    label: "Dashboard",
    href: ROUTES.home,
    icon: "dashboard",
  }),

  Object.freeze({
    id: "meals",
    label: "Meals",
    href: ROUTES.meals,
    icon: "meal",
  }),

  Object.freeze({
    id: "members",
    label: "Members",
    href: ROUTES.members,
    icon: "members",
  }),

  Object.freeze({
    id: "reports",
    label: "Reports",
    href: ROUTES.reports,
    icon: "reports",
  }),

  Object.freeze({
    id: "settings",
    label: "Settings",
    href: ROUTES.settings,
    icon: "settings",
  }),
]);


/* =========================================================
   9. CACHE / PWA
   ========================================================= */

export const PWA_CONFIG = Object.freeze({
  cacheName: "mealmate-static-v1",

  staticAssets: Object.freeze([
    "/",
    "/index.html",

    "/css/variables.css",
    "/css/global.css",
    "/css/components.css",
    "/css/responsive.css",

    "/js/config.js",
  ]),

  offlineFallback: "/index.html",
});


/* =========================================================
   10. RUNTIME HELPERS
   ========================================================= */

/**
 * Returns whether Supabase credentials have been configured.
 *
 * This only checks whether values exist.
 * It does not make a network request.
 */
export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_CONFIG.url &&
    SUPABASE_CONFIG.publishableKey
  );
}


/**
 * Throws a clear configuration error before
 * the app attempts a Supabase connection.
 */
export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase configuration is missing."
    );
  }
}


/**
 * Returns the current application environment.
 */
export function getEnvironment() {
  return APP_CONFIG.environment;
}


/**
 * Returns whether a feature is enabled.
 *
 * @param {keyof typeof APP_CONFIG.features} featureName
 * @returns {boolean}
 */
export function isFeatureEnabled(featureName) {
  return APP_CONFIG.features[featureName] === true;
}
