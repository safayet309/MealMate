/* =========================================================
   Mealmate — Supabase Client Layer
   File: js/supabase.js

   Depends on:
   - js/config.js

   Responsibilities:
   - Create the single Supabase client
   - Centralize Supabase configuration
   - Session helpers
   - Connection health check
   - Friendly Supabase error mapping

   IMPORTANT:
   Feature modules should import `supabase` from this file.
   They should NOT create another Supabase client.
   ========================================================= */

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm";

import {
  SUPABASE_CONFIG,
  assertSupabaseConfigured,
  APP_CONFIG,
  UI_CONFIG,
} from "./config.js";


/* =========================================================
   1. CONFIGURATION GUARD
   ========================================================= */

assertSupabaseConfigured();


/* =========================================================
   2. SUPABASE CLIENT
   ========================================================= */

export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.publishableKey,
  SUPABASE_CONFIG.options
);


/* =========================================================
   3. CLIENT INFORMATION
   ========================================================= */

export const SUPABASE_CLIENT_INFO = Object.freeze({
  appName: APP_CONFIG.name,
  sdk: "@supabase/supabase-js",
  sdkVersion: "2.117.1",
  schema: SUPABASE_CONFIG.options.db.schema,
});


/* =========================================================
   4. SESSION HELPERS
   ========================================================= */

/**
 * Returns the current Supabase session.
 *
 * @returns {Promise<import("@supabase/supabase-js").Session|null>}
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw normalizeSupabaseError(error);
  }

  return data?.session ?? null;
}


/**
 * Returns the authenticated user.
 *
 * This returns null when no user is signed in.
 *
 * @returns {Promise<import("@supabase/supabase-js").User|null>}
 */
export async function getCurrentUser() {
  const session = await getSession();

  return session?.user ?? null;
}


/**
 * Returns whether the app currently has a signed-in user.
 *
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const session = await getSession();

  return Boolean(session?.user);
}


/* =========================================================
   5. AUTH STATE LISTENER
   ========================================================= */

/**
 * Subscribe to authentication state changes.
 *
 * Usage:
 *
 * const unsubscribe = onAuthStateChange((event, session) => {
 *   console.log(event, session);
 * });
 *
 * unsubscribe();
 *
 * @param {(event: string, session: object|null) => void} callback
 * @returns {() => void}
 */
export function onAuthStateChange(callback) {
  if (typeof callback !== "function") {
    throw new TypeError(
      "onAuthStateChange callback must be a function."
    );
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}


/* =========================================================
   6. CONNECTION HEALTH CHECK
   ========================================================= */

/**
 * Checks whether the Supabase project is reachable.
 *
 * This does not require any application table to exist.
 * It uses the Auth endpoint, which makes it suitable for
 * Foundation-stage connection testing.
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   authenticated: boolean,
 *   error: Error|null
 * }>}
 */
export async function checkSupabaseConnection() {
  try {
    const session = await getSession();

    return {
      ok: true,
      authenticated: Boolean(session?.user),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      authenticated: false,
      error: normalizeSupabaseError(error),
    };
  }
}


/* =========================================================
   7. NETWORK STATE
   ========================================================= */

/**
 * Returns browser network availability.
 *
 * This is only a local browser signal.
 * It does NOT guarantee Supabase availability.
 *
 * @returns {boolean}
 */
export function isBrowserOnline() {
  return navigator.onLine;
}


/* =========================================================
   8. STANDARDIZED ERROR
   ========================================================= */

/**
 * Converts Supabase/API errors into an app-friendly Error.
 *
 * Technical Supabase details are kept in `cause`
 * for debugging, while the user-facing message remains Bangla.
 *
 * @param {unknown} error
 * @returns {Error}
 */
export function normalizeSupabaseError(error) {
  if (error instanceof Error) {
    const normalized = new Error(
      getSupabaseErrorMessage(error)
    );

    normalized.name = "MealmateSupabaseError";
    normalized.cause = error;

    return normalized;
  }

  const normalized = new Error(
    UI_CONFIG.messages.genericError
  );

  normalized.name = "MealmateSupabaseError";
  normalized.cause = error;

  return normalized;
}


/**
 * Maps known technical errors to safe UI messages.
 *
 * @param {unknown} error
 * @returns {string}
 */
function getSupabaseErrorMessage(error) {
  const message = String(
    error?.message ?? ""
  ).toLowerCase();

  const code = String(
    error?.code ?? ""
  ).toLowerCase();

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch") ||
    code === "network_error"
  ) {
    return UI_CONFIG.messages.networkError;
  }

  if (
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("session") ||
    code.includes("auth")
  ) {
    return UI_CONFIG.messages.sessionExpired;
  }

  if (
    message.includes("permission") ||
    message.includes("not allowed") ||
    message.includes("row-level security") ||
    code === "42501"
  ) {
    return UI_CONFIG.messages.unauthorized;
  }

  return UI_CONFIG.messages.genericError;
}


/* =========================================================
   9. GENERIC QUERY HELPERS
   ========================================================= */

/**
 * Executes an async Supabase operation and converts errors
 * into the standardized Mealmate error format.
 *
 * Usage:
 *
 * const data = await executeSupabase(
 *   () => supabase.from("members").select("*")
 * );
 *
 * @template T
 * @param {() => Promise<{data: T, error: object|null}>} operation
 * @returns {Promise<T>}
 */
export async function executeSupabase(operation) {
  if (typeof operation !== "function") {
    throw new TypeError(
      "Supabase operation must be a function."
    );
  }

  try {
    const result = await operation();

    if (!result) {
      throw new Error(
        UI_CONFIG.messages.genericError
      );
    }

    if (result.error) {
      throw normalizeSupabaseError(result.error);
    }

    return result.data;
  } catch (error) {
    throw normalizeSupabaseError(error);
  }
}


/**
 * Executes a mutation/query and returns both data and error
 * in a safe, standardized way for modules that need full
 * result handling.
 *
 * @template T
 * @param {() => Promise<{data: T, error: object|null}>} operation
 * @returns {Promise<{data: T|null, error: Error|null}>}
 */
export async function safeSupabase(operation) {
  try {
    const result = await operation();

    if (!result) {
      return {
        data: null,
        error: normalizeSupabaseError(
          new Error(
            UI_CONFIG.messages.genericError
          )
        ),
      };
    }

    if (result.error) {
      return {
        data: null,
        error: normalizeSupabaseError(result.error),
      };
    }

    return {
      data: result.data ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: normalizeSupabaseError(error),
    };
  }
}


/* =========================================================
   10. DEVELOPMENT / DIAGNOSTIC HELPERS
   ========================================================= */

/**
 * Returns non-secret information useful for diagnostics.
 *
 * NEVER returns the Supabase key.
 *
 * @returns {{
 *   app: string,
 *   environment: string,
 *   supabaseUrl: string,
 *   schema: string,
 *   sdk: string,
 *   sdkVersion: string,
 *   browserOnline: boolean
 * }}
 */
export function getSupabaseDiagnostics() {
  return {
    app: APP_CONFIG.name,
    environment: APP_CONFIG.environment,
    supabaseUrl: SUPABASE_CONFIG.url,
    schema: SUPABASE_CONFIG.options.db.schema,
    sdk: SUPABASE_CLIENT_INFO.sdk,
    sdkVersion: SUPABASE_CLIENT_INFO.sdkVersion,
    browserOnline: isBrowserOnline(),
  };
}
