// ───────────────────────────────────────────────────────────────────────────────────────
// Config
// ───────────────────────────────────────────────────────────────────────────────────────
export const DEBUG = true;

// ───────────────────────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────────────────────
/* Base URL for the application, read from Vite environment variables */
export const BASE = import.meta.env.BASE_URL;

/* Theme that the app will be set to initially */
export const DEFAULT_THEME = 'dark';
export const DEFAULT_LOCALE = 'en';

// ───────────────────────────────────────────────────────────────────────────────────────
// DOM IDs and classes
// ───────────────────────────────────────────────────────────────────────────────────────
/* HTML Container where HTMX swaps happen */
export const MAIN_CONTAINER_ID = 'main-content';
export const MODAL_CONTAINER_ID = 'modal-content';
export const APP_CONTAINER_ID = 'app-content';
export const GLOBAL_SPINNER_ID = 'global-spinner';

export const FADE_OUT_CLASS = 'fade-out';
export const FADE_IN_CLASS = 'fade-in';

// ───────────────────────────────────────────────────────────────────────────────────────
// Routing
// ───────────────────────────────────────────────────────────────────────────────────────
/* Defines all available pages/routes in the application as constant string values */
export const PAGES = Object.freeze({
  LANDING: 'landing',
  LOGIN: 'login',
  REGISTER: 'register',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  TEST: 'test',
  TEST2: 'test2',
  ERROR: 'error',
});

/* Routing config for each page. Includes: URL, target container and type (modal/page) */
export const ROUTES = Object.freeze({
  [PAGES.LOGIN]: {
    name: PAGES.LOGIN,
    url: `${BASE}views/auth/login.html`,
    path: null,
    target: `#${MODAL_CONTAINER_ID}`,
    type: 'modal',
  },
  [PAGES.REGISTER]: {
    name: PAGES.REGISTER,
    url: `${BASE}views/auth/register.html`,
    path: null,
    target: `#${MODAL_CONTAINER_ID}`,
    type: 'modal',
  },
  [PAGES.DASHBOARD]: {
    name: PAGES.DASHBOARD,
    url: `${BASE}views/dashboard/dashboard.html`,
    path: '/dashboard',
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },
  [PAGES.LANDING]: {
    name: PAGES.LANDING,
    url: `${BASE}views/landing.html`,
    path: '/',
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },
  [PAGES.TEST]: {
    name: PAGES.TEST,
    url: `${BASE}views/test.html`,
    path: '/test',
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },
  [PAGES.TEST2]: {
    name: PAGES.TEST2,
    url: `${BASE}views/test2.html`,
    path: '/test2',
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },
  [PAGES.ERROR]: {
    name: PAGES.ERROR,
    url: `${BASE}views/404.html`,
    path: '/404',
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },
});

export const AUTH = Object.freeze({
  required: [PAGES.DASHBOARD, PAGES.SETTINGS],
  restricted: [PAGES.LOGIN, PAGES.REGISTER, PAGES.LANDING],
  modals: [PAGES.LOGIN, PAGES.REGISTER, PAGES.SETTINGS],
});

// ───────────────────────────────────────────────────────────────────────────────────────
// UX constants
// ───────────────────────────────────────────────────────────────────────────────────────
/* unit: `ms`<p><b>Must</b> be the same as `--fade-duration` in style.css */
export const SPLASH_MIN_DURATION = 1000;
/* seconds — used for ALL fades */
export const FADE_DURATION = 0.2;
/* unit: `ms`<p>How long to wait with showing loader when waiting for server response. */
export const LOADING_THRESHOLD = 800;

// ───────────────────────────────────────────────────────────────────────────────────────
// Translation system
// ───────────────────────────────────────────────────────────────────────────────────────
/* Page content translation keys */
export const TR_KEYS = {
  LANG_NAME: 'lang_name',
  LANG_KEY: 'lang_key',
  APP_NAME: 'app_name',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  SETTINGS: 'settings',

  LANDING_SUBTITLE: 'landing_subtitle',
  DASHBOARD: 'dashboard',
};

/* Local storage key: `locale.lang`<p>Current application language */
export const LS_APP_LANG = 'locale.lang';

// ───────────────────────────────────────────────────────────────────────────────────────
// Store names
// ───────────────────────────────────────────────────────────────────────────────────────
/* Main store name: `app` */
export const APP_STORE_NAME = 'app';
/* Translation store name: `locale` */
export const TRANSLATION_STORE_NAME = 'locale';

// ───────────────────────────────────────────────────────────────────────────────────────
// General local storage keys
// ───────────────────────────────────────────────────────────────────────────────────────
/* Local storage key: `authToken` */
export const LS_AUTH_TOKEN = 'authToken';
/* Local storage key `app.currentUser` */
export const LS_CURRENT_USER = 'app.currentUser';

// ───────────────────────────────────────────────────────────────────────────────────────
// Events for the event system
// ───────────────────────────────────────────────────────────────────────────────────────
/* `auth:login` - Event name */
export const AUTH_LOGIN_EVENT = 'auth:login';
/* `auth:logout` - Event name */
export const AUTH_LOGOUT_EVENT = 'auth:logout';
