/* =========================================================
   Mealmate — Authentication Layer
   File: js/auth.js

   Depends on:
   - js/config.js
   - js/supabase.js

   Responsibilities:
   - Sign up
   - Sign in
   - Sign out
   - Password reset request
   - Current user/session access
   - Active Mess membership lookup
   - First-run destination detection
   - Auth guards
   - Safe authentication error messages

   IMPORTANT:
   - No UI markup belongs here.
   - No business calculations belong here.
   - No direct createClient() belongs here.
   ========================================================= */

import {
  supabase,
  getSession,
  getCurrentUser,
  onAuthStateChange,
  normalizeSupabaseError,
} from "./supabase.js";

import {
  UI_CONFIG,
  ROUTES,
} from "./config.js";


/* =========================================================
   1. AUTH CONSTANTS
   ========================================================= */

const AUTH_CONFIG = Object.freeze({
  minimumPasswordLength: 8,

  /*
   Auth pages will be added immediately after this module.
   Kept here temporarily so this file has no hardcoded
   dependency on an HTML implementation.
  */
  loginRoute: "pages/login.html",

  setupRoute: ROUTES.setup,
  homeRoute: ROUTES.home,
});


/* =========================================================
   2. SIGN UP
   ========================================================= */

/**
 * Creates a new Supabase Auth account.
 *
 * Email confirmation behavior depends on the Supabase
 * project's Authentication settings.
 *
 * @param {string} email
 * @param {string} password
 *
 * @returns {Promise<{
 *   user: object|null,
 *   session: object|null,
 *   needsEmailConfirmation: boolean
 * }>}
 */
export async function signUp(
  email,
  password
) {
  const normalizedEmail =
    normalizeEmail(email);

  validateEmail(normalizedEmail);
  validatePassword(password);

  try {
    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw normalizeSupabaseError(error);
    }

    return {
      user: data?.user ?? null,
      session: data?.session ?? null,

      needsEmailConfirmation:
        Boolean(
          data?.user &&
          !data?.session
        ),
    };
  } catch (error) {
    throw normalizeAuthError(error);
  }
}


/* =========================================================
   3. SIGN IN
   ========================================================= */

/**
 * Signs in an existing user with email/password.
 *
 * @param {string} email
 * @param {string} password
 *
 * @returns {Promise<{
 *   user: object,
 *   session: object
 * }>}
 */
export async function signIn(
  email,
  password
) {
  const normalizedEmail =
    normalizeEmail(email);

  validateEmail(normalizedEmail);

  if (
    typeof password !== "string" ||
    password.length === 0
  ) {
    throw createAuthError(
      "পাসওয়ার্ড লিখুন।"
    );
  }

  try {
    const {
      data,
      error,
    } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      throw normalizeSupabaseError(error);
    }

    if (!data?.session || !data?.user) {
      throw createAuthError(
        "লগইন সম্পন্ন হয়নি। আবার চেষ্টা করুন।"
      );
    }

    return {
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    throw normalizeAuthError(error);
  }
}


/* =========================================================
   4. SIGN OUT
   ========================================================= */

/**
 * Signs out only the current browser session.
 *
 * Supabase's default signOut scope is global. We explicitly
 * use local so another device/session is not unnecessarily
 * logged out.
 *
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    const {
      error,
    } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      throw normalizeSupabaseError(error);
    }
  } catch (error) {
    throw normalizeAuthError(error);
  }
}


/* =========================================================
   5. PASSWORD RESET REQUEST
   ========================================================= */

/**
 * Sends the password recovery email.
 *
 * @param {string} email
 *
 * @returns {Promise<void>}
 */
export async function requestPasswordReset(
  email
) {
  const normalizedEmail =
    normalizeEmail(email);

  validateEmail(normalizedEmail);

  try {
    const redirectTo =
      buildAppUrl(
        AUTH_CONFIG.loginRoute
      );

    const {
      error,
    } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo,
      }
    );

    if (error) {
      throw normalizeSupabaseError(error);
    }
  } catch (error) {
    throw normalizeAuthError(error);
  }
}


/* =========================================================
   6. SESSION / USER
   ========================================================= */

/**
 * Returns the current session.
 *
 * @returns {Promise<object|null>}
 */
export async function getAuthSession() {
  return getSession();
}


/**
 * Returns the authenticated user.
 *
 * @returns {Promise<object|null>}
 */
export async function getAuthUser() {
  return getCurrentUser();
}


/**
 * Returns true when an authenticated session exists.
 *
 * @returns {Promise<boolean>}
 */
export async function isUserAuthenticated() {
  const session =
    await getSession();

  return Boolean(session);
}


/* =========================================================
   7. ACTIVE MESS MEMBERSHIPS
   ========================================================= */

/**
 * Returns all active Mess memberships belonging to
 * the currently authenticated user.
 *
 * Current database contract:
 *
 * mess_users
 * ├── mess_id
 * ├── user_id
 * ├── role
 * └── active
 *
 * @returns {Promise<Array>}
 */
export async function getActiveMessMemberships() {
  const user =
    await getCurrentUser();

  if (!user) {
    return [];
  }

  try {
    const {
      data,
      error,
    } = await supabase
      .from("mess_users")
      .select(`
        id,
        mess_id,
        user_id,
        role,
        active,
        created_at,
        mess:mess_id (
          id,
          name,
          room_start,
          room_end,
          border_count
        )
      `)
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      throw normalizeSupabaseError(error);
    }

    return Array.isArray(data)
      ? data
      : [];
  } catch (error) {
    throw normalizeAuthError(error);
  }
}


/**
 * Returns one active Mess membership when exactly one
 * active membership exists.
 *
 * Returns null when:
 * - user is unauthenticated
 * - user has no active membership
 *
 * Throws when:
 * - user has multiple active memberships
 *
 * Multiple Mess selection can be implemented later
 * without changing the underlying data model.
 *
 * @returns {Promise<object|null>}
 */
export async function getActiveMessMembership() {
  const memberships =
    await getActiveMessMemberships();

  if (memberships.length === 0) {
    return null;
  }

  if (memberships.length > 1) {
    throw createAuthError(
      "একাধিক Mess পাওয়া গেছে। একটি Mess নির্বাচন করুন।"
    );
  }

  return memberships[0];
}


/**
 * Returns the active Mess ID when exactly one membership
 * exists.
 *
 * @returns {Promise<string|null>}
 */
export async function getActiveMessId() {
  const membership =
    await getActiveMessMembership();

  return membership?.mess_id ?? null;
}


/* =========================================================
   8. FIRST-RUN DESTINATION
   ========================================================= */

/**
 * Determines where the authenticated user should go.
 *
 * Result:
 *
 * unauthenticated
 *   → login
 *
 * authenticated + no Mess
 *   → setup
 *
 * authenticated + Mess
 *   → dashboard
 *
 * @returns {Promise<{
 *   destination: "login"|"setup"|"dashboard",
 *   authenticated: boolean,
 *   membership: object|null
 * }>}
 */
export async function getFirstRunDestination() {
  const session =
    await getSession();

  if (!session) {
    return {
      destination: "login",
      authenticated: false,
      membership: null,
    };
  }

  const membership =
    await getActiveMessMembership();

  if (!membership) {
    return {
      destination: "setup",
      authenticated: true,
      membership: null,
    };
  }

  return {
    destination: "dashboard",
    authenticated: true,
    membership,
  };
}


/* =========================================================
   9. AUTH GUARDS
   ========================================================= */

/**
 * Requires an authenticated user.
 *
 * When `redirect` is true, redirects to login.
 *
 * @param {boolean} redirect
 *
 * @returns {Promise<object|null>}
 */
export async function requireAuthentication(
  redirect = true
) {
  const session =
    await getSession();

  if (session) {
    return session;
  }

  if (redirect) {
    redirectTo(
      AUTH_CONFIG.loginRoute
    );
  }

  return null;
}


/**
 * Requires an authenticated user with an active Mess.
 *
 * When no Mess exists, redirects to Setup.
 *
 * @param {boolean} redirect
 *
 * @returns {Promise<object|null>}
 */
export async function requireMess(
  redirect = true
) {
  const session =
    await requireAuthentication(
      redirect
    );

  if (!session) {
    return null;
  }

  const membership =
    await getActiveMessMembership();

  if (membership) {
    return membership;
  }

  if (redirect) {
    redirectTo(
      AUTH_CONFIG.setupRoute
    );
  }

  return null;
}


/* =========================================================
   10. AUTH STATE SUBSCRIPTION
   ========================================================= */

/**
 * Subscribes to Supabase auth changes.
 *
 * @param {(event: string, session: object|null) => void} callback
 * @returns {() => void}
 */
export function subscribeToAuth(
  callback
) {
  return onAuthStateChange(
    (event, session) => {
      callback(
        event,
        session
      );
    }
  );
}


/* =========================================================
   11. EMAIL VALIDATION
   ========================================================= */

function normalizeEmail(email) {
  if (
    typeof email !== "string"
  ) {
    return "";
  }

  return email
    .trim()
    .toLowerCase();
}


function validateEmail(email) {
  if (!email) {
    throw createAuthError(
      "ইমেইল লিখুন।"
    );
  }

  /*
   * Intentionally simple browser-side validation.
   * Supabase remains the final authority.
   */
  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw createAuthError(
      "সঠিক ইমেইল ঠিকানা লিখুন।"
    );
  }
}


/* =========================================================
   12. PASSWORD VALIDATION
   ========================================================= */

function validatePassword(password) {
  if (
    typeof password !== "string" ||
    password.length === 0
  ) {
    throw createAuthError(
      "পাসওয়ার্ড লিখুন।"
    );
  }

  if (
    password.length <
    AUTH_CONFIG.minimumPasswordLength
  ) {
    throw createAuthError(
      `পাসওয়ার্ড কমপক্ষে ${AUTH_CONFIG.minimumPasswordLength} অক্ষরের হতে হবে।`
    );
  }
}


/* =========================================================
   13. SAFE AUTH ERROR
   ========================================================= */

/**
 * Converts technical Auth errors into safe Bangla UI text.
 *
 * @param {unknown} error
 * @returns {Error}
 */
function normalizeAuthError(error) {
  if (
    error?.name === "MealmateAuthError"
  ) {
    return error;
  }

  const technicalMessage =
    String(
      error?.cause?.message ??
      error?.message ??
      ""
    ).toLowerCase();

  if (
    technicalMessage.includes(
      "invalid login credentials"
    ) ||
    technicalMessage.includes(
      "invalid credentials"
    )
  ) {
    return createAuthError(
      "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।"
    );
  }

  if (
    technicalMessage.includes(
      "email not confirmed"
    )
  ) {
    return createAuthError(
      "ইমেইলটি এখনো verify করা হয়নি। আপনার ইমেইল চেক করুন।"
    );
  }

  if (
    technicalMessage.includes(
      "user already registered"
    )
  ) {
    return createAuthError(
      "এই ইমেইল দিয়ে আগে থেকেই একটি account আছে।"
    );
  }

  if (
    technicalMessage.includes(
      "password"
    ) &&
    technicalMessage.includes(
      "weak"
    )
  ) {
    return createAuthError(
      "আরও শক্তিশালী password ব্যবহার করুন।"
    );
  }

  return error instanceof Error
    ? error
    : normalizeSupabaseError(error);
}


/**
 * Creates a standardized Mealmate Auth Error.
 *
 * @param {string} message
 * @returns {Error}
 */
function createAuthError(message) {
  const error =
    new Error(message);

  error.name =
    "MealmateAuthError";

  return error;
}


/* =========================================================
   14. NAVIGATION
   ========================================================= */

/**
 * Builds a route URL that works for:
 *
 * GitHub Pages root
 * and
 * GitHub Pages project/repository hosting.
 *
 * Examples:
 *
 * root/index.html
 * root/pages/setup.html
 * root/pages/login.html
 *
 * @param {string} route
 * @returns {string}
 */
export function buildAppUrl(route) {
  const cleanRoute =
    String(route)
      .replace(/^\/+/, "");

  const currentPath =
    window.location.pathname
      .replace(/\\/g, "/");

  const isInsidePages =
    currentPath.includes("/pages/");

  const relativeRoute =
    isInsidePages
      ? `../${cleanRoute}`
      : `./${cleanRoute}`;

  return new URL(
    relativeRoute,
    window.location.href
  ).href;
}


/**
 * Redirects using the application route.
 *
 * @param {string} route
 */
export function redirectTo(route) {
  window.location.assign(
    buildAppUrl(route)
  );
}


/**
 * Returns the login route.
 *
 * @returns {string}
 */
export function getLoginRoute() {
  return AUTH_CONFIG.loginRoute;
}


/* =========================================================
   15. AUTH SUMMARY
   ========================================================= */

/**
 * Returns a safe, non-secret auth summary.
 *
 * @returns {Promise<{
 *   authenticated: boolean,
 *   userId: string|null,
 *   email: string|null,
 *   membershipCount: number
 * }>}
 */
export async function getAuthSummary() {
  const user =
    await getCurrentUser();

  if (!user) {
    return {
      authenticated: false,
      userId: null,
      email: null,
      membershipCount: 0,
    };
  }

  const memberships =
    await getActiveMessMemberships();

  return {
    authenticated: true,
    userId: user.id ?? null,
    email: user.email ?? null,
    membershipCount:
      memberships.length,
  };
}
