import htmx from 'htmx.org';
import { clearById, safePersist, throttle } from "@util/util.js";
import {
  AUTH_LOGIN_EVENT, AUTH_LOGOUT_EVENT, MAIN_CONTAINER_ID, MODAL_CONTAINER_ID, PAGES, RESTRICTED_PAGES, ROUTE_CONFIGS
} from "@core/config.js";
import { events } from "@core/events.js";


/**
 * Application store for managing global state:
 * - **User authentication** - Manages current user login state
 * - **Viewport size** - Tracks device screen dimensions
 * - **Theme preference** - Handles light/dark mode selection
 * - **Current page routing** - Manages navigation state
 *
 * > Registered as a store in {@linkcode main.js}
 *
 * @property {Object|null} currentUser - The authenticated user object
 * @property {boolean} isMobile - Whether the viewport is mobile-sized (≤768px)
 * @property {boolean} isDarkTheme - Whether dark theme is active
 * @property {string} currentPage - Current page ('dashboard' if authenticated, 'index' otherwise)
 * @property {Function} init - Initializes the store
 * @property {Function} setMobile - Updates mobile viewport state
 * @property {Function} toggleTheme - Toggles between light/dark themes
 * @returns {Object} object with state and methods
 *
 * @see App.init
 *
 * @namespace App
 */
export const AppStore = (Alpine) => {
  Alpine.store('app', {
	currentUser: null,
	lastPage: null,
	currentPage: '',
	isMobile: safePersist('app.isMobile', false),
	isDarkTheme: safePersist('app.isDarkTheme', true),
	showLoginModal: false,

	/**
	 * Initializes the app store state and behavior:
	 * - Attaches a `resize` event listener for updating the `isMobile` state
	 * - Applies the current theme (dark or light) to the document's root element
	 * - Initial resize
	 *
	 * @memberof App
	 * @namespace init
	 */
	init() {
	  if (this.currentUser) {
		this.navigateTo(PAGES.DASHBOARD);
	  } else {
		this.navigateTo(PAGES.LANDING, {updateHistory: false});
	  }

	  // Window resize tracking
	  const handleResize = () => {
		this.setMobile(window.innerWidth <= 768);
	  };

	  window.addEventListener('resize', throttle(() => handleResize(), 250));
	  handleResize();
	},


	/* ============================
	   Navigation
	============================= */
	async navigateTo(page, {updateHistory = true} = {}) {
	  if (this.currentPage === page) return;
	  const AUTH_REQUIRED_PAGES = [PAGES.DASHBOARD];
	  const AUTH_RESTRICTED_PAGES = [PAGES.LOGIN, PAGES.REGISTER, PAGES.LANDING];

	  // Guards
	  if (AUTH_RESTRICTED_PAGES.includes(page) && this.currentUser) {
		this.goToDashboard();
		return;
	  }

	  if (AUTH_REQUIRED_PAGES.includes(page) && !this.currentUser) {
		console.warn(`Access to ${page} denied: unauthenticated`);
		return;
	  }

	  const route = ROUTE_CONFIGS[page];
	  if (!route) {
		this.showErrorPage('404 - Page not found');
		return;
	  }

	  this.lastPage = this.currentPage;
	  this.currentPage = page;

	  // Push state to history for back/forward navigation
	  if (updateHistory) {
		if (RESTRICTED_PAGES.includes(page)) {
		  history.replaceState({page}, '', '');
		} else {
		  history.pushState({page}, '', '');
		}
	  }

	  // Auth mode feeling
	  switch (page) {
		case PAGES.LOGIN:
		  this.authMode = 'login';
		  break;
		case PAGES.REGISTER:
		  this.authMode = 'register';
		  break;
	  }

	  // htmx load
	  await htmx.ajax('get', route.url, {
		target: route.target,
		swap: 'innerHTML',
		headers: {
		  'HX-Request': 'true',
		  'Accept': 'text/html'
		},
	  });
	},

	goToLogin() {
	  this.showLoginModal = true;
	  this.navigateTo(PAGES.LOGIN);
	},

	goToRegister() {
	  this.navigateTo(PAGES.REGISTER);
	},

	goToLanding() {
	  this.navigateTo(PAGES.LANDING);
	},

	goToDashboard() {
	  this.navigateTo(PAGES.DASHBOARD);
	},

	handleLogoClick() {
	  if (this.currentUser) {
		this.goToDashboard();
	  } else {
		this.goToLanding();
	  }
	},

	login(userData) {
	  localStorage.setItem(LS_CURRENT_USER, JSON.stringify(userData));
	  this.currentUser = userData;

	  events.emit(AUTH_LOGIN_EVENT, {user: userData});
	},

	logout() {
	  localStorage.removeItem(LS_CURRENT_USER);
	  this.currentUser = null;
	  events.emit(AUTH_LOGOUT_EVENT);
	  await this.navigateTo(PAGES.LANDING);
	},


	/* ============================
	   Utility
	============================= */
	closeModal() {
	  this.showLoginModal = false;
	  this.currentPage = this.lastPage ?? PAGES.DASHBOARD;
	  requestAnimationFrame(() => {
		clearById(MODAL_CONTAINER_ID);
	  });
	},

	showErrorPage(message = 'Page not found', error = null) {
	  if (error) {
		console.error('Navigation error:', error);
	  }

	  if (error) { console.error('Navigation error:', error); }
	  // Load the 404 page
	  htmx.ajax('GET', '/404.html', {
		target: MAIN_CONTAINER_ID,
		swap: 'innerHTML',
		headers: {
		  'HX-Request': 'true'
		},
	  });
	},

	setMobile(value) { this.isMobile = value; },

	toggleTheme() {
	  this.isDarkTheme = !this.isDarkTheme;
	}
  });
};