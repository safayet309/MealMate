/* =========================================================
   Mealmate — Application Bootstrap
   File: js/app.js

   Depends on:
   - js/config.js
   - js/supabase.js

   Responsibilities:
   - Start the application
   - Initialize common UI
   - Set current date/version
   - Active navigation
   - Sidebar/mobile navigation
   - Network status
   - Supabase connection status
   - Auth state observation
   - Service worker registration
   - Global runtime error handling

   IMPORTANT:
   Feature logic does NOT belong here.
   Dashboard, meals, members, reports etc. will live
   in their own modules later.
   ========================================================= */

import {
  APP_CONFIG,
  ROUTES,
  isFeatureEnabled,
  UI_CONFIG,
} from "./config.js";

import {
  getCurrentUser,
  onAuthStateChange,
  checkSupabaseConnection,
} from "./supabase.js";


/* =========================================================
   1. APP STATE
   ========================================================= */

const appState = {
  initialized: false,
  authenticated: false,
  online: navigator.onLine,
  supabaseConnected: false,
  serviceWorkerRegistered: false,
};


/* =========================================================
   2. BOOTSTRAP
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeApp().catch(handleBootstrapError);
});


/**
 * Main application bootstrap.
 *
 * @returns {Promise<void>}
 */
async function initializeApp() {
  if (appState.initialized) {
    return;
  }

  markAppStarting();

  try {
    initializeVersion();
    initializeDate();
    normalizeFoundationClasses();
    initializeNavigation();
    initializeSidebar();
    initializeNetworkStatus();
    initializeGlobalErrorHandling();

    await initializeSupabaseState();

    await registerServiceWorker();

    appState.initialized = true;

    markAppReady();

    window.dispatchEvent(
      new CustomEvent("mealmate:ready", {
        detail: {
          ...appState,
        },
      })
    );
  } catch (error) {
    handleBootstrapError(error);
  }
}


/* =========================================================
   3. VERSION
   ========================================================= */

function initializeVersion() {
  const versionElements = document.querySelectorAll(
    "[data-app-version]"
  );

  versionElements.forEach((element) => {
    element.textContent = `v${APP_CONFIG.version}`;
  });
}


/* =========================================================
   4. CURRENT DATE
   ========================================================= */

function initializeDate() {
  const dateElements = document.querySelectorAll(
    "[data-today-date]"
  );

  if (!dateElements.length) {
    return;
  }

  const today = getDhakaDate();

  const formattedDate = new Intl.DateTimeFormat(
    APP_CONFIG.locale,
    {
      timeZone: APP_CONFIG.timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(today);

  dateElements.forEach((element) => {
    element.textContent = formattedDate;
  });
}


/**
 * Creates a Date representing the current moment.
 *
 * We intentionally use the user's configured application
 * timezone when formatting rather than relying on the
 * browser's local timezone.
 *
 * @returns {Date}
 */
function getDhakaDate() {
  return new Date();
}


/* =========================================================
   5. FOUNDATION CLASS COMPATIBILITY
   ========================================================= */

/**
 * The initial HTML foundation used the older:
 *
 *   button
 *   button--primary
 *   icon-button
 *
 * class names.
 *
 * The final component contract uses:
 *
 *   btn
 *   btn--primary
 *   icon-btn
 *
 * This one-time normalization prevents a visual contract
 * mismatch without changing application behavior.
 */
function normalizeFoundationClasses() {
  const classMappings = [
    ["button", "btn"],
    ["icon-button", "icon-btn"],
  ];

  document.querySelectorAll(
    ".button, .icon-button"
  ).forEach((element) => {
    classMappings.forEach(([from, to]) => {
      if (element.classList.contains(from)) {
        element.classList.remove(from);
        element.classList.add(to);
      }
    });
  });
}


/* =========================================================
   6. NAVIGATION
   ========================================================= */

function initializeNavigation() {
  const routeLinks = document.querySelectorAll(
    "[data-route]"
  );

  if (!routeLinks.length) {
    return;
  }

  const currentRoute = getCurrentRoute();

  routeLinks.forEach((link) => {
    const route = link.dataset.route;

    const isActive =
      route === currentRoute;

    link.classList.toggle(
      "is-active",
      isActive
    );

    if (isActive) {
      link.setAttribute(
        "aria-current",
        "page"
      );
    } else {
      link.removeAttribute(
        "aria-current"
      );
    }

    link.addEventListener(
      "click",
      () => {
        closeSidebar();
      }
    );
  });
}


/**
 * Resolves the current application route from the URL.
 *
 * @returns {string}
 */
function getCurrentRoute() {
  const path = window.location.pathname
    .replace(/\\/g, "/");

  if (
    path.endsWith("/") ||
    path.endsWith("/index.html")
  ) {
    return "dashboard";
  }

  if (path.endsWith("/meals.html")) {
    return "meals";
  }

  if (path.endsWith("/members.html")) {
    return "members";
  }

  if (path.endsWith("/reports.html")) {
    return "reports";
  }

  if (path.endsWith("/settings.html")) {
    return "settings";
  }

  if (path.endsWith("/setup.html")) {
    return "setup";
  }

  return "dashboard";
}


/* =========================================================
   7. SIDEBAR
   ========================================================= */

function initializeSidebar() {
  const toggleButton = document.querySelector(
    '[data-action="toggle-sidebar"]'
  );

  const sidebar = document.querySelector(
    "[data-app-sidebar]"
  );

  const layout = document.querySelector(
    ".app-layout"
  );

  if (!toggleButton || !sidebar || !layout) {
    return;
  }

  toggleButton.addEventListener(
    "click",
    () => {
      const isOpen =
        sidebar.classList.toggle("is-open");

      layout.classList.toggle(
        "sidebar-open",
        isOpen
      );

      toggleButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );

  layout.addEventListener(
    "click",
    (event) => {
      if (
        event.target === layout &&
        layout.classList.contains("sidebar-open")
      ) {
        closeSidebar();
      }
    }
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    }
  );
}


/**
 * Closes the mobile/tablet sidebar.
 */
function closeSidebar() {
  const sidebar = document.querySelector(
    "[data-app-sidebar]"
  );

  const layout = document.querySelector(
    ".app-layout"
  );

  const toggleButton = document.querySelector(
    '[data-action="toggle-sidebar"]'
  );

  if (sidebar) {
    sidebar.classList.remove("is-open");
  }

  if (layout) {
    layout.classList.remove("sidebar-open");
  }

  if (toggleButton) {
    toggleButton.setAttribute(
      "aria-expanded",
      "false"
    );
  }
}


/* =========================================================
   8. NETWORK STATUS
   ========================================================= */

function initializeNetworkStatus() {
  updateNetworkState();

  window.addEventListener(
    "online",
    () => {
      appState.online = true;
      updateNetworkState();
      refreshSupabaseConnection();
    }
  );

  window.addEventListener(
    "offline",
    () => {
      appState.online = false;
      updateNetworkState();
    }
  );
}


function updateNetworkState() {
  appState.online = navigator.onLine;

  const statusElements =
    document.querySelectorAll(
      "[data-sync-status]"
    );

  statusElements.forEach((element) => {
    if (!appState.online) {
      element.textContent = "Offline";
      element.dataset.status = "offline";
      return;
    }

    if (appState.supabaseConnected) {
      element.textContent = "Online";
      element.dataset.status = "online";
      return;
    }

    element.textContent = "Connecting";
    element.dataset.status = "syncing";
  });
}


/* =========================================================
   9. SUPABASE STATE
   ========================================================= */

async function initializeSupabaseState() {
  const connection =
    await checkSupabaseConnection();

  appState.supabaseConnected =
    connection.ok;

  const user =
    await getCurrentUserSafely();

  appState.authenticated =
    Boolean(user);

  updateNetworkState();

  if (!connection.ok) {
    dispatchSupabaseStatus("error", {
      error: connection.error,
    });
  } else {
    dispatchSupabaseStatus("connected", {
      authenticated: appState.authenticated,
    });
  }

  subscribeToAuthChanges();
}


/**
 * Safe current-user lookup.
 *
 * Connection failure should not crash the visual app shell.
 *
 * @returns {Promise<object|null>}
 */
async function getCurrentUserSafely() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}


/**
 * Subscribe once to future auth changes.
 */
function subscribeToAuthChanges() {
  onAuthStateChange(
    (_event, session) => {
      appState.authenticated =
        Boolean(session);

      window.dispatchEvent(
        new CustomEvent(
          "mealmate:auth-change",
          {
            detail: {
              authenticated:
                appState.authenticated,
              session,
            },
          }
        )
      );
    }
  );
}


/**
 * Re-check Supabase after the browser comes online.
 */
async function refreshSupabaseConnection() {
  if (!navigator.onLine) {
    return;
  }

  setSyncStatus("syncing");

  try {
    const connection =
      await checkSupabaseConnection();

    appState.supabaseConnected =
      connection.ok;

    if (connection.ok) {
      setSyncStatus("online");
      dispatchSupabaseStatus(
        "connected",
        {
          authenticated:
            connection.authenticated,
        }
      );
    } else {
      setSyncStatus("error");
      dispatchSupabaseStatus(
        "error",
        {
          error: connection.error,
        }
      );
    }
  } catch (error) {
    appState.supabaseConnected = false;
    setSyncStatus("error");

    dispatchSupabaseStatus(
      "error",
      {
        error,
      }
    );
  }
}


/**
 * Updates visible sync status.
 *
 * @param {"offline"|"syncing"|"online"|"error"} status
 */
function setSyncStatus(status) {
  const statusElements =
    document.querySelectorAll(
      "[data-sync-status]"
    );

  const labels = {
    offline: "Offline",
    syncing: "Connecting",
    online: "Online",
    error: "Sync error",
  };

  statusElements.forEach((element) => {
    element.textContent =
      labels[status] ?? "Unknown";

    element.dataset.status =
      status;
  });
}


/**
 * Dispatches an application-level Supabase event.
 *
 * Feature modules can listen without importing app.js.
 *
 * @param {string} status
 * @param {object} detail
 */
function dispatchSupabaseStatus(
  status,
  detail = {}
) {
  window.dispatchEvent(
    new CustomEvent(
      "mealmate:supabase-status",
      {
        detail: {
          status,
          ...detail,
        },
      }
    )
  );
}


/* =========================================================
   10. SERVICE WORKER
   ========================================================= */

async function registerServiceWorker() {
  if (
    !isFeatureEnabled("pwa") ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  try {
    const registration =
      await navigator.serviceWorker.register(
        "./sw.js",
        {
          scope: "./",
        }
      );

    appState.serviceWorkerRegistered =
      Boolean(registration);

    window.dispatchEvent(
      new CustomEvent(
        "mealmate:pwa-ready",
        {
          detail: {
            registration,
          },
        }
      )
    );
  } catch (error) {
    /*
      During Foundation development sw.js may not exist yet.
      This must remain non-fatal.
    */

    appState.serviceWorkerRegistered = false;

    window.dispatchEvent(
      new CustomEvent(
        "mealmate:pwa-error",
        {
          detail: {
            error,
          },
        }
      )
    );
  }
}


/* =========================================================
   11. GLOBAL ERROR HANDLING
   ========================================================= */

function initializeGlobalErrorHandling() {
  window.addEventListener(
    "error",
    (event) => {
      reportRuntimeError(
        event.error ??
        new Error(
          event.message ||
          "Unknown runtime error"
        )
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      reportRuntimeError(
        event.reason ??
        new Error(
          "Unhandled promise rejection"
        )
      );
    }
  );
}


/**
 * Converts technical errors into a safe application event.
 *
 * Technical details remain available to developers
 * through `console.error`, but are not directly shown
 * to the user.
 *
 * @param {unknown} error
 */
function reportRuntimeError(error) {
  console.error(
    "[Mealmate]",
    error
  );

  window.dispatchEvent(
    new CustomEvent(
      "mealmate:runtime-error",
      {
        detail: {
          error,
          userMessage:
            UI_CONFIG.messages.genericError,
        },
      }
    )
  );
}


/* =========================================================
   12. APP STATUS
   ========================================================= */

function markAppStarting() {
  const app =
    document.querySelector("#app");

  if (!app) {
    return;
  }

  app.dataset.appState = "starting";
}


function markAppReady() {
  const app =
    document.querySelector("#app");

  if (!app) {
    return;
  }

  app.dataset.appState = "ready";
}


function handleBootstrapError(error) {
  console.error(
    "[Mealmate Bootstrap Error]",
    error
  );

  const app =
    document.querySelector("#app");

  if (app) {
    app.dataset.appState = "error";
  }

  window.dispatchEvent(
    new CustomEvent(
      "mealmate:bootstrap-error",
      {
        detail: {
          error,
          userMessage:
            UI_CONFIG.messages.genericError,
        },
      }
    )
  );
}


/* =========================================================
   13. PUBLIC READ-ONLY STATE
   ========================================================= */

/**
 * Returns a snapshot of the current application state.
 *
 * Feature modules should treat this as read-only.
 *
 * @returns {Readonly<object>}
 */
export function getAppState() {
  return Object.freeze({
    ...appState,
  });
}


/* =========================================================
   14. DEVELOPMENT DIAGNOSTICS
   ========================================================= */

/**
 * Exposes minimal non-secret diagnostics.
 *
 * Supabase credentials are intentionally excluded.
 */
export function getAppDiagnostics() {
  return Object.freeze({
    app: APP_CONFIG.name,
    version: APP_CONFIG.version,
    route: getCurrentRoute(),
    authenticated: appState.authenticated,
    browserOnline: appState.online,
    supabaseConnected:
      appState.supabaseConnected,
    serviceWorkerRegistered:
      appState.serviceWorkerRegistered,
  });
}
