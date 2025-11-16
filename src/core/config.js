// Define available pages as a frozen object for immutability
export const PAGES = Object.freeze({
  LANDING: 'landing',
  LOGIN: 'login',
  REGISTER: 'register',
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings',
});

export const MAIN_CONTAINER_ID = 'main-content';
export const MODAL_CONTAINER_ID = 'modal-content';

// Route definitions with only static data
export const ROUTE_CONFIGS = Object.freeze({
  [PAGES.LOGIN]: {
	url: '/pages/auth/login.html',
	target: `#${MODAL_CONTAINER_ID}`
  },
  [PAGES.REGISTER]: {
	url: '/pages/auth/register.html',
	target: `#${MODAL_CONTAINER_ID}`,
  },
  [PAGES.DASHBOARD]: {
	url: '/pages/dashboard/dashboard.html',
	target: `#${MAIN_CONTAINER_ID}`,
  },
  [PAGES.LANDING]: {
	url: '/pages/landing.html',
	target: `#${MAIN_CONTAINER_ID}`,
  },
  error: {
	url: '/pages/404.html',
	target: `#${MAIN_CONTAINER_ID}`,
  }
});

export const RESTRICTED_PAGES = [PAGES.LOGIN, PAGES.REGISTER, 'error'];

/** `authToken` **/
export const LS_AUTH_TOKEN = 'authToken';

/** Local storage key `app.currentUser` */
export const LS_CURRENT_USER = 'app.currentUser';

/** `auth:login` */
export const AUTH_LOGIN_EVENT = 'auth:login';
/** `auth:logout` */
export const AUTH_LOGOUT_EVENT = 'auth:logout';

