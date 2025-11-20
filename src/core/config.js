// Define available views as a frozen object for immutability
export const PAGES = Object.freeze({
  LANDING: 'landing',
  LOGIN: 'login',
  REGISTER: 'register',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
  TEST: 'test'
});

// UX constants — ONE SOURCE OF TRUTH
export const SPLASH_MIN_DURATION = 1100;  // ms
export const FADE_DURATION = 0.25;        // seconds — used for ALL fades
export const LOADING_THRESHOLD = 800;    // ms before showing loader

export const MAIN_CONTAINER_ID = 'main-content';
export const MODAL_CONTAINER_ID = 'modal-content';
export const APP_CONTAINER_ID = 'app-content';
export const GLOBAL_SPINNER_ID = 'global-spinner';

export const FADE_OUT_CLASS = 'fade-out';
export const FADE_IN_CLASS = 'fade-in';

export const BASE = import.meta.env.BASE_URL;

export const ROUTE_CONFIGS = Object.freeze({
  [PAGES.LOGIN]: {
    url: `${BASE}views/auth/login.html`,
    target: `#${MODAL_CONTAINER_ID}`,
    type: 'modal',
  },
  [PAGES.REGISTER]: {
    url: `${BASE}views/auth/register.html`,
    target: `#${MODAL_CONTAINER_ID}`,
    type: 'modal',
  },
  [PAGES.DASHBOARD]: {
    url: `${BASE}views/dashboard/dashboard.html`,
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },
  [PAGES.LANDING]: {
    url: `${BASE}views/landing.html`,
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },

  [PAGES.TEST]: {
    url: `${BASE}views/test.html`,
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  },

  error: {
    url: `${BASE}views/404.html`,
    target: `#${MAIN_CONTAINER_ID}`,
    type: 'page',
  }
});

export const RESTRICTED_PAGES = [PAGES.LOGIN, PAGES.REGISTER, 'error'];


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

export const DEFAULT_LOCALE = 'en';
export const DEFAULT_THEME = 'dark';

export const APP_STORE_NAME = 'app';
export const TRANSLATION_STORE_NAME = 'locale';


export const LS_APP_LANG = 'locale.lang';

/** `authToken` **/
export const LS_AUTH_TOKEN = 'authToken';

/** Local storage key `app.currentUser` */
export const LS_CURRENT_USER = 'app.currentUser';

/** `auth:login` */
export const AUTH_LOGIN_EVENT = 'auth:login';
/** `auth:logout` */
export const AUTH_LOGOUT_EVENT = 'auth:logout';

