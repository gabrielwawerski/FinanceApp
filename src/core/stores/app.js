import htmx from 'htmx.org';
import { clearById, normalizePath, safePersist, throttle } from '@util/util.js';
import {
  AUTH,
  AUTH_LOGIN_EVENT,
  AUTH_LOGOUT_EVENT,
  BASE,
  DEBUG,
  FADE_DURATION,
  MODAL_CONTAINER_ID,
  PAGES,
  ROUTES,
} from '@core/config.js';
import { events } from '@core/events.js';
import DatabaseService, { startBackgroundJobs } from '@db/db-service.js';

/**
 * Initializes and manages the global application store using Alpine.js.
 * The `AppStore` encapsulates application state, user management, theme preferences,
 * navigation, and various utility methods to streamline app functionality.
 *
 * The `AppStore` includes the following key features:
 *
 * - **Global State Management**: Stores universal app-level data such as the current
 *     user, page, device type, and theme preference.
 * - **Initialization**: Provides `init` and `initApp` methods for setting up essential
 *     app behaviors, such as detecting screen sizes, retrieving saved pages, and
 *     handling initial user authentication.
 * - **Authentication**:
 *   - Logs in users, verifies credentials, and manages session tokens.
 *   - Supports logout with options to clear local data for shared devices.
 * - **Navigation**: Facilitates navigation between pages, ensures authentication
 *     requirements are met, and updates the UI accordingly.
 * - **UI Modifications and Utilities**:
 *   - Supports toggling between light and dark themes.
 *   - Manages mobile responsiveness based on screen size.
 *   - Provides utility methods for displaying and hiding modals, handling navigation
 *     errors, and dynamically loading user-specific data.
 * - **Data Operations**: Provides wrappers for secure interaction with a backend
 *     service, such as adding categories, creating transactions, and loading dashboard
 *     data.
 *
 * This store is essential for handling reactive state across the application, ensuring a
 * consistent user experience, and simplifying the coordination of UI interactions
 * and backend integrations.
 *
 * @param {Object} Alpine - The Alpine.js instance used to register and manage the
 *                          application store.
 */
export const AppStore = Alpine => {
  Alpine.store('app', {
    currentUser: null,
    lastPage: null,
    currentPage: '',
    isMobile: safePersist('app.isMobile', false),
    isDarkTheme: safePersist('app.isDarkTheme', true),
    showLoginModal: false,
    activeModal: null,

    async init() {
      startBackgroundJobs();
      const handleResize = () => this.setMobile(window.innerWidth <= 768);
      window.addEventListener('resize', throttle(handleResize, 250));
      handleResize();
      if (DEBUG) console.log('AppStore initialized');
    },

    async initApp() {
      // ──────────────────────────────────────────────────────────────
      // Resolve initial page from URL and render it (replaceState)
      // ──────────────────────────────────────────────────────────────
      const requestedPage = this.getPageFromUrl();
      try {
        // use replaceState on first load so we don't create a duplicate entry
        await this.navigateTo(requestedPage, { updateHistory: false });
      } catch (err) {
        if (DEBUG) console.warn('initApp: initial navigate failed', err);
        // fallback to landing if anything goes wrong
        await this.navigateTo(PAGES.LANDING, { updateHistory: false });
      }

      // ──────────────────────────────────────────────────────────────
      // Session restore: if we have a token, attempt to rehydrate user
      // and restore their last saved page. Use replaceState for restore.
      // ──────────────────────────────────────────────────────────────
      const token = localStorage.getItem('sessionToken');
      if (!token) return;

      try {
        const user = await DatabaseService.getCurrentUser();
        if (!user) {
          // token was stale or invalid
          localStorage.removeItem('sessionToken');
          return;
        }

        this.currentUser = user;

        const lastPage = await DatabaseService.loadPage(user.id);
        const targetPage =
          lastPage && ROUTES[lastPage] && ROUTES[lastPage].type === 'page'
            ? lastPage
            : PAGES.DASHBOARD;

        if (DEBUG)
          console.log(
            'initApp: restoring session for user',
            user.username,
            '->',
            targetPage,
          );
        // replaceState to avoid inserting an extra history entry on boot
        await this.navigateTo(targetPage, { updateHistory: false });
      } catch (err) {
        if (DEBUG) console.warn('initApp: session restore failed', err);
        localStorage.removeItem('sessionToken');
      }
    },

    // ───────────────────────────────────────────────────────────────
    // PAGE ROUTER
    // ───────────────────────────────────────────────────────────────
    async navigateTo(page, { updateHistory = true } = {}) {
      const route = ROUTES[page];

      // Unknown route → landing page
      if (!route) return this.navigateTo(PAGES.LANDING, { updateHistory });

      if (route.name === this.currentPage) return;

      // If modal, handle separately
      if (route.type === 'modal') {
        return this.openModal(page);
      }

      // Guard access
      if (!this.canAccess(page)) {
        return this.navigateTo(PAGES.LANDING, { updateHistory: false });
      }

      // Close modal if switching page
      if (this.activeModal && route.type === 'page') {
        this.closeModals();
      }

      const targetPath = normalizePath(page);
      const currentPath = normalizePath(location.pathname);

      if (updateHistory) {
        if (currentPath !== targetPath) {
          history.pushState({ page }, '', targetPath);
        }
      } else {
        history.replaceState({ page }, '', targetPath);
      }

      // Persist or fallback to sessionStorage
      if (this.currentUser) {
        await DatabaseService.persistPage(this.currentUser.id, page);
      } else {
        sessionStorage.setItem('app.currentPage', page);
      }

      // Load via HTMX
      await htmx.ajax('get', route.url, {
        target: route.target,
        swap: 'innerHTML',
        headers: { 'HX-Request': 'true', Accept: 'text/html' },
      });

      // Update store state
      this.lastPage = this.currentPage;
      this.currentPage = page;
    },

    // ───────────────────────────────────────────────────────────────────────────────────
    // Navigation helpers
    // ───────────────────────────────────────────────────────────────────────────────────
    goToLogin() {
      this.showLoginModal = true;
      this.navigateTo(PAGES.LOGIN, { updateHistory: false });
    },

    goToRegister() {},

    goToLanding(updateHistory = true) {
      this.navigateTo(PAGES.LANDING, { updateHistory });
    },

    goToDashboard(updateHistory = true) {
      this.navigateTo(PAGES.DASHBOARD, { updateHistory });
    },

    handleLogoClick() {
      if (this.currentUser) this.goToDashboard();
      else this.goToLanding();
    },

    // ───────────────────────────────────────────────────────────────────────────────────
    // Auth
    // ───────────────────────────────────────────────────────────────────────────────────
    async login({ username, password, rememberMe = false }) {
      const user = await DatabaseService.verifyLogin(username, password);
      if (!user) {
        alert('Invalid credentials');
        return false;
      }

      const token = await DatabaseService.createSession(user.id, rememberMe);
      localStorage.setItem('sessionToken', token);

      this.currentUser = user;
      events.emit(AUTH_LOGIN_EVENT, { user });

      const lastPage = await DatabaseService.loadPage(user.id);
      await this.navigateTo(lastPage || PAGES.DASHBOARD);
      return true;
    },

    /**
     * Logout with optional local-data clearing for public devices.
     * clearLocalData = true will remove categories/transactions and lastPage.
     */
    async logout({ keepData = true } = {}) {
      if (!this.currentUser) return;

      await DatabaseService.clearSession({ userId: this.currentUser.id });
      localStorage.removeItem('sessionToken');
      sessionStorage.removeItem('app.currentPage');

      if (!keepData) {
        await DatabaseService.clearUserData(this.currentUser.id);
        // Optional: await DatabaseService.wipeEverything();
      }

      this.currentUser = null;
      events.emit(AUTH_LOGOUT_EVENT);
      this.navigateTo(PAGES.LANDING);
    },

    logoutAndForget() {
      this.logout({ keepData: false });
    },

    // ───────────────────────────────────────────────────────────────────────────────────
    // UI helpers
    // ───────────────────────────────────────────────────────────────────────────────────
    async openModal(page) {
      const route = ROUTES[page];
      if (!route || route.type !== 'modal') return;

      // Load modal content
      await htmx.ajax('get', route.url, {
        target: route.target,
        swap: 'innerHTML',
        headers: { 'HX-Request': 'true', Accept: 'text/html' },
      });

      this.activeModal = page;
    },

    closeModals() {
      this.closeLoginModal();
      this.activeModal = null;
    },

    closeLoginModal() {
      const loginModal = document.getElementById('login-modal');
      if (!loginModal) return;

      loginModal.classList.add('fade-out');

      setTimeout(() => {
        requestAnimationFrame(() => {
          this.showLoginModal = false;
          clearById(MODAL_CONTAINER_ID);
        });
      }, FADE_DURATION * 1000);
      this.activeModal = null;
    },

    setMobile(value) {
      this.isMobile = value;
    },
    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
    },

    /* Convenience wrappers for data operations */
    async addCategory(data) {
      if (!this.currentUser) throw new Error('Not authenticated');
      return await DatabaseService.createCategory(this.currentUser.id, data);
    },

    async addTransaction(data) {
      if (!this.currentUser) throw new Error('Not authenticated');
      return await DatabaseService.createTransaction(this.currentUser.id, data);
    },

    async loadDashboardData({ daysBack = 30 } = {}) {
      if (!this.currentUser) return;
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - daysBack);

        this.categories = await DatabaseService.getCategories(this.currentUser.id);
        this.transactions = await DatabaseService.getTransactions(
          this.currentUser.id,
          start,
          end,
        );
      } catch (err) {
        if (DEBUG) console.error('loadDashboardData error', err);
      }
    },

    // ───────────────────────────────────────────────────────────────────────────────────
    // Util
    // ───────────────────────────────────────────────────────────────────────────────────
    canAccess(page) {
      if (!this.currentUser && AUTH.required.includes(page)) return false;
      return !(this.currentUser && AUTH.restricted.includes(page));
    },

    getPageFromUrl() {
      const path = normalizePath(location.pathname);

      for (const [pageKey, route] of Object.entries(ROUTES)) {
        if (route.type !== 'page') continue;

        const full = normalizePath(this._buildFullPath(route.path));
        if (path === full) return pageKey;
      }
      return PAGES.LANDING;
    },

    _buildFullPath(relativePath) {
      // Normalizes BASE + relativePath into a single absolute-ish path string.
      // Examples:
      //   BASE = '/'        + '/test'  => '/test'
      //   BASE = '/app/'    + 'test'   => '/app/test'
      //   BASE = '/app'     + '/'      => '/app'
      const base = (BASE || '/').replace(/\/+$/, '');
      const clean = (relativePath || '').replace(/^\/+/, '');
      return clean ? `${base}/${clean}` : base || '/';
    },
  });
};

export default AppStore;
