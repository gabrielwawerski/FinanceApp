import htmx from 'htmx.org';
import { clearById, safePersist, throttle } from '@util/util.js';
import {
  AUTH_LOGIN_EVENT, AUTH_LOGOUT_EVENT, MAIN_CONTAINER_ID, MODAL_CONTAINER_ID, PAGES, RESTRICTED_PAGES, ROUTE_CONFIGS
} from '@core/config.js';
import { events } from '@core/events.js';
import DatabaseService, { startBackgroundJobs } from '@db/db-service.js';


export const AppStore = (Alpine) => {
  Alpine.store('app', {
    currentUser: null,
    lastPage: null,
    isReady: false,
    currentPage: '',
    isMobile: safePersist('app.isMobile', false),
    isDarkTheme: safePersist('app.isDarkTheme', true),
    showLoginModal: false,

    async init() {
      startBackgroundJobs(); // ← critical

      const splashMinDuration = 1200; // minimum time splash is visible
      const splashStart = performance.now();

      const token = localStorage.getItem('sessionToken');
      if (token) {
        const user = await DatabaseService.getCurrentUser(); // checks expiry too
        if (user) {
          this.currentUser = user;
          const lastPage = await DatabaseService.loadPage(user.id);
          this.navigateTo(lastPage || PAGES.DASHBOARD, {updateHistory: false});
        } else {
          this.navigateTo(PAGES.LANDING, {updateHistory: false});
        }
      } else {
        this.navigateTo(PAGES.LANDING, {updateHistory: false});
      }

      const handleResize = () => this.setMobile(window.innerWidth <= 768);
      window.addEventListener('resize', throttle(handleResize, 250));
      handleResize();

      // Ensure splash is visible at least `splashMinDuration`
      const elapsed = performance.now() - splashStart;
      const remaining = Math.max(0, splashMinDuration - elapsed);
      setTimeout(() => {
        this.isReady = true; // triggers splash fade
        document.body.classList.add('app-ready'); // fades in main layout
        document.body.classList.remove('opacity-0');
      }, remaining);
    },

    /* --------------------
       Navigation
    -------------------- */
    async navigateTo(page, {updateHistory = true} = {}) {
      if (this.currentPage === page) {
        this.lastPage = this.currentPage;
        return
      }
      const AUTH_REQUIRED_PAGES = [PAGES.DASHBOARD];
      const AUTH_RESTRICTED_PAGES = [PAGES.LOGIN, PAGES.REGISTER, PAGES.LANDING];

      // guards
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

      // persist page per-user if logged in
      if (this.currentUser) {
        try {
          await DatabaseService.persistPage(this.currentUser.id, page);
        } catch (e) {
          console.warn('persistPage failed', e);
        }
      } else {
        // persist globally to safePersist localStorage
        localStorage.setItem('app.currentPage', page);
      }

      // History management: make URLs stable by using `?page=...` optionally
      if (updateHistory) {
        const state = {page};
        try {
          if (RESTRICTED_PAGES.includes(page)) history.replaceState(state, '', '');
          else history.pushState(state, '', `?page=${encodeURIComponent(page)}`);
        } catch (e) {
          // Some older browsers or weird environments may throw; ignore
          console.warn('history pushState failed', e);
        }
      }

      // set authMode for auth pages
      if (page === PAGES.LOGIN) this.authMode = 'login';
      if (page === PAGES.REGISTER) this.authMode = 'register';

      // load via htmx
      htmx.ajax('GET', route.url, {
        target: route.target,
        swap: 'innerHTML',
        headers: {'HX-Request': 'true', 'Accept': 'text/html'}
      });
    },

    /* Navigation helpers */
    goToLogin() {
      this.showLoginModal = true;
      this.navigateTo(PAGES.LOGIN);
    },
    goToRegister() { this.navigateTo(PAGES.REGISTER); },
    goToLanding() { this.navigateTo(PAGES.LANDING); },
    goToDashboard() { this.navigateTo(PAGES.DASHBOARD); },

    handleLogoClick() {
      if (this.currentUser) this.goToDashboard(); else this.goToLanding();
    },

    /* --------------------
       Auth
    -------------------- */
    async login({username, password, rememberMe = false}) {
      const user = await DatabaseService.verifyLogin(username, password);
      if (!user) {
        alert('Invalid credentials');
        return false;
      }

      const token = await DatabaseService.createSession(user.id, rememberMe);
      localStorage.setItem('sessionToken', token);

      this.currentUser = user;
      events.emit(AUTH_LOGIN_EVENT, {user});

      const lastPage = await DatabaseService.loadPage(user.id);
      this.navigateTo(lastPage || PAGES.DASHBOARD);
      return true;
    },

    /**
     * Logout with optional local-data clearing for public devices.
     * clearLocalData = true will remove categories/transactions and lastPage.
     */
    async logout({keepData = true} = {}) {
      if (!this.currentUser) return;

      await DatabaseService.clearSession({userId: this.currentUser.id});
      localStorage.removeItem('sessionToken');

      if (!keepData) {
        await DatabaseService.clearUserData(this.currentUser.id);
        // Optional: await DatabaseService.wipeEverything();
      }

      this.currentUser = null;
      events.emit(AUTH_LOGOUT_EVENT);
      this.navigateTo(PAGES.LANDING);
    },

    logoutAndForget() {
      this.logout({keepData: false});
    },

    /* --------------------
       UI helpers / misc
    -------------------- */
    closeModal() {
      this.showLoginModal = false;
      this.currentPage = this.lastPage ?? this.currentUser ? PAGES.DASHBOARD : PAGES.LANDING;
      requestAnimationFrame(() => clearById(MODAL_CONTAINER_ID));
    },

    showErrorPage(message = 'Page not found', error = null) {
      if (error) console.error('Navigation error:', error);
      htmx.ajax('GET', '/404.html', {
        target: MAIN_CONTAINER_ID,
        swap: 'innerHTML',
        headers: {'HX-Request': 'true'}
      });
    },

    setMobile(value) { this.isMobile = value; },
    toggleTheme() { this.isDarkTheme = !this.isDarkTheme; },

    /* Convenience wrappers for data operations */
    async addCategory(data) {
      if (!this.currentUser) throw new Error('Not authenticated');
      return await DatabaseService.createCategory(this.currentUser.id, data);
    },

    async addTransaction(data) {
      if (!this.currentUser) throw new Error('Not authenticated');
      return await DatabaseService.createTransaction(this.currentUser.id, data);
    },

    async loadDashboardData({daysBack = 30} = {}) {
      if (!this.currentUser) return;
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - daysBack);

        this.categories = await DatabaseService.getCategories(this.currentUser.id);
        this.transactions = await DatabaseService.getTransactions(this.currentUser.id, start, end);
      } catch (err) {
        console.error('loadDashboardData error', err);
      }
    }
  });
};

export default AppStore;
