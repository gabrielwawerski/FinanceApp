import htmx from 'htmx.org';
import { getCurrentUser } from "@util/auth-util.js";
import { clearById, safePersist, throttle } from "@util/util.js";
import {
  AUTH_LOGIN_EVENT, AUTH_LOGOUT_EVENT, LS_CURRENT_USER, MAIN_CONTAINER_ID, MODAL_CONTAINER_ID, PAGES, RESTRICTED_PAGES,
  ROUTE_CONFIGS
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
	currentUser: getCurrentUser(),
	currentPage: '', // TODO: save to local storage later, remove when auth cookie gets removed/logout
	isMobile: safePersist('app.isMobile', false),
	isDarkTheme: safePersist('app.isDarkTheme', true),
	showLoginModal: false,
	// get currentPage() { return this.currentUser ? 'dashboard' : 'index'; },

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
		this.navigateTo(PAGES.LANDING);
	  }

	  const handleResize = () => {
		this.setMobile(window.innerWidth <= 768);
		console.log("resized!")
	  };

	  window.addEventListener('resize', throttle(() => handleResize(), 250));
	  handleResize();
	},

	navigateTo(page, {updateHistory = true} = {}) {
	  const AUTH_REQUIRED_PAGES = [PAGES.DASHBOARD];
	  const AUTH_RESTRICTED_PAGES = [PAGES.LOGIN, PAGES.REGISTER, PAGES.LANDING];

	  if (AUTH_RESTRICTED_PAGES.includes(page) && this.currentUser) {
		console.log(`Access to ${page} denied: User already authenticated`);
		this.goToDashboard();
		return;
	  }

	  // Authentication guard
	  if (AUTH_REQUIRED_PAGES.includes(page) && !this.currentUser) {
		console.log(`Access to ${page} denied: User not authenticated`);
		return;
	  }

	  const route = ROUTE_CONFIGS[page];
	  if (!route) {
		console.error(`Unknown page: ${page}`);
		this.showErrorPage('404 - Page not found');
		return;
	  }

	  this.currentPage = page;

	  // Push state to history for back/forward navigation
	  if (updateHistory) {
		if (RESTRICTED_PAGES.includes(page)) {
		  history.replaceState({page}, '', ''); // replace instead of push
		} else {
		  history.pushState({page}, '', '');
		}
	  }

	  // Handle callbacks based on page
	  switch (page) {
		case PAGES.LOGIN:
		  console.log("login")
		  this.authMode = 'login';
		  break;
		case PAGES.REGISTER:
		  this.authMode = 'register';
		  break;
		case PAGES.DASHBOARD:
		case PAGES.LANDING:
		  break;
		case 'error':
		  break;
	  }

	  // Make the request with comprehensive error handling
	  htmx.ajax('GET', route.url, {
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
	  console.log("landing");
	  this.navigateTo(PAGES.LANDING);
	},

	goToDashboard() {
	  console.log("dashboard");
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
	},

	closeModal() {
	  this.showLoginModal = false;
	  requestAnimationFrame(() => {
		clearById(MODAL_CONTAINER_ID);
	  });
	},

	showErrorPage(message = 'Page not found', error = null) {
	  this.authModalOpen = false;
	  const target = MAIN_CONTAINER_ID;

	  if (error) { console.error('Navigation error:', error); }
	  // Load the 404 page
	  htmx.ajax('GET', '/404.html', {
		target: target,
		swap: 'innerHTML',
		headers: {
		  'HX-Request': 'true'
		},
	  });
	},

	setMobile(value) { this.isMobile = value; },

	toggleTheme() {
	  this.isDarkTheme = !this.isDarkTheme;
	},
  });
};