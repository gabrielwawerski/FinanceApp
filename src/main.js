import db from "@db/db.js";
import htmx from 'htmx.org';
import Alpine from 'alpinejs';
import focus from '@alpinejs/focus';
import persist from '@alpinejs/persist';

import { AppStore } from "@stores/app.js";
import { TranslationStore } from "@stores/translation.js";
import { LoginModal } from "@/modals/login/LoginModal.js";
import '@components/ThemeToggle.js';

import { BASE, DEFAULT_LOCALE, LS_APP_LANG, PAGES, RESTRICTED_PAGES, TR_KEYS } from "@core/config.js";
import { loadTranslations } from "@util/file-util.js";
import { startBackgroundJobs } from '@db/db-service.js';


window.TR_KEYS = TR_KEYS;

// ===================== DATABASE =====================
async function initializeDatabase() {
  try {
    await db.open();
    console.log(`✅ Database opened: ${db.name} v${db.verno}`);
  } catch (error) {
    console.error('❌ Failed to open database', error);
    if (error.name === 'UpgradeError' || error.name === 'VersionError') {
      await db.delete();
      await db.open();
    }
  }
}

// ===================== APP INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  const splash = document.getElementById('splash');
  const appContent = document.getElementById('app-content');
  const MIN_SPLASH = 1000;
  const start = performance.now();

  startBackgroundJobs();
  await initializeDatabase();

  const locale = (localStorage.getItem(LS_APP_LANG) || DEFAULT_LOCALE).replace(/"/g, '');
  const translations = await loadTranslations(locale);

  Alpine.plugin(focus);
  Alpine.plugin(persist);
  Alpine.plugin(AppStore);
  Alpine.plugin(TranslationStore(locale, translations));
  Alpine.data('LoginModal', LoginModal);

  window.Alpine = Alpine;
  window.htmx = htmx;

  htmx.config.selfRequestsOnly = false;
  htmx.config.defaultSwapStyle = 'innerHTML';
  window.fullPageTransition = false;

  // ===================== HTMX SWAP ANIMATION =====================
  document.body.addEventListener('htmx:beforeSwap', (event) => {
    const target = event.detail.target;
    if ((target.id === 'main-content' || target.id === 'modal-content') && target.firstElementChild) {
      const oldContent = target.firstElementChild;
      oldContent.classList.add('fade-out');
      if (fullPageTransition) document.getElementById('page-body').classList.add('fade-out');
      event.detail.shouldSwap = false;

      setTimeout(() => {
        target.innerHTML = event.detail.xhr.responseText;
        const newContent = target.firstElementChild;
        newContent.classList.add('fade-in');
        if (fullPageTransition) {
          document.getElementById('page-body').classList.remove('fade-out');
          document.getElementById('page-body').classList.add('fade-in');
        }
      }, 200);
    }
  });

  document.body.addEventListener('htmx:afterSwap', (event) => {
    const target = event.detail.target;
    if ((target.id === 'main-content' || target.id === 'modal-content') && target.firstElementChild) {
      const newContent = target.firstElementChild;
      newContent.classList.add('fade-in');
    }
  });

  Alpine.start();

  document.addEventListener('alpine:initialized', async () => {
    // ===================== SERVICE WORKER =====================
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${BASE}service-worker.js`)
           .then(reg => console.log('SW registered:', reg.scope))
           .catch(err => console.error('SW failed:', err));
      });
    }
  })


  // ===================== SPLASH FADE =====================
  // Ensure minimum splash duration
  const elapsed = performance.now() - start;
  const remaining = Math.max(0, MIN_SPLASH - elapsed);

  setTimeout(() => {
    splash.classList.add('opacity-0');   // fade out splash
    setTimeout(() => {
          appContent.classList.add('visible'); // fade in app content
    },300);

    // Remove splash after transition
    setTimeout(() => splash.remove(), 400);
  }, remaining);
});


// document.addEventListener('alpine:init', () => {
// window.addEventListener('popstate', (event) => {
// const state = event.state || {};
// const app = Alpine.store('app');
//
// if (state.page && !RESTRICTED_PAGES.includes(state.page)) {
//   console.log(`Navigating to page: ${state.page}`);
//   app.navigateTo(state.page, {updateHistory: false});
// } else {
//   console.log('Navigating to fallback page...');
//   // Optional: if user hits restricted page, redirect to landing/dashboard
//   const fallback = app.currentUser ? PAGES.DASHBOARD : PAGES.LANDING;
//   app.navigateTo(fallback, {updateHistory: false});
// }
// });
// });