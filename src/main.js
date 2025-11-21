import htmx from 'htmx.org';
import Alpine from 'alpinejs';
import focus from '@alpinejs/focus';
import persist from '@alpinejs/persist';

import { AppStore } from "@stores/app.js";
import { TranslationStore } from "@stores/translation.js";
import { LoginModal } from "@/modals/login/login-modal.js";
import '@components/theme-toggle.js';

import {
  DEFAULT_LOCALE, LS_APP_LANG, TR_KEYS, SPLASH_MIN_DURATION, FADE_DURATION, LOADING_THRESHOLD, APP_CONTAINER_ID,
  MAIN_CONTAINER_ID, MODAL_CONTAINER_ID, GLOBAL_SPINNER_ID, FADE_OUT_CLASS, FADE_IN_CLASS
} from "@core/config.js";

import { loadTranslations } from "@util/file-util.js";
import { startBackgroundJobs } from '@db/db-service.js';
import { initializeDatabase, seedPredefinedCategories } from "@db/db-util.js";

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./service-worker.js`)
       .then(reg => console.log('Service Worker registered:', reg.scope))
       .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// auto deploy test
// Expose for templates
window.TR_KEYS = TR_KEYS;

// Global flags
window.fullPageTransition = false;
let globalLoadingTimeout = null;


// ===================== APP INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  const splash = document.getElementById('splash');
  const appContent = document.getElementById(APP_CONTAINER_ID);
  const start = performance.now();

  // Start background processes early
  startBackgroundJobs();
  await initializeDatabase();
  await seedPredefinedCategories();

  // Resolve user language
  let locale = localStorage.getItem(LS_APP_LANG)?.replace(/"/g, '') || DEFAULT_LOCALE;
  const browserLang = (navigator.language || navigator.userLanguage)?.substring(0, 2);
  if (!['en', 'pl'].includes(locale) && ['en', 'pl'].includes(browserLang)) {
    locale = browserLang;
  }
  const translations = await loadTranslations(locale);

  // Register Alpine plugins & data
  Alpine.plugin(focus);
  Alpine.plugin(persist);
  Alpine.plugin(AppStore);
  Alpine.plugin(TranslationStore(locale, translations));
  Alpine.data('LoginModal', LoginModal);

  window.Alpine = Alpine;
  window.htmx = htmx;

  htmx.config.selfRequestsOnly = false;
  htmx.config.defaultSwapStyle = 'innerHTML';

  // ===================== HTMX LOADING & SWAP =====================
  document.body.addEventListener('htmx:beforeRequest', async (event) => {
    clearTimeout(globalLoadingTimeout);
    const target = event.detail.target;

    if (target.id === MAIN_CONTAINER_ID && target.firstElementChild) {
      const oldContent = target.firstElementChild;
      oldContent.classList.add(FADE_OUT_CLASS);

      if (window.fullPageTransition) {
        document.getElementById(APP_CONTAINER_ID)?.classList.add(FADE_OUT_CLASS);
      }

      // Start timer to show loader if slow
      globalLoadingTimeout = setTimeout(() => {
        const loader = document.getElementById(GLOBAL_SPINNER_ID);
        if (loader) loader.classList.remove('hidden');
      }, LOADING_THRESHOLD);

    } else if (target.id === MODAL_CONTAINER_ID) {
      document.getElementById('modal-bg').style.opacity = 1;

      globalLoadingTimeout = setTimeout(() => {
        const loader = document.getElementById(GLOBAL_SPINNER_ID);
        if (loader) {
          loader.classList.remove('hidden');
        }
      }, LOADING_THRESHOLD);
    }
  });

  document.body.addEventListener('htmx:beforeSwap', (event) => {
    clearTimeout(globalLoadingTimeout);
    const loader = document.getElementById(GLOBAL_SPINNER_ID);

    const target = event.detail.target;
    if ((target.id === MAIN_CONTAINER_ID) && target.firstElementChild) {

      if (loader) {
        setTimeout(() => {
          loader.classList.add('hidden')
        }, FADE_DURATION * 1000)
      }

      event.detail.shouldSwap = false;

      setTimeout(() => {
        target.innerHTML = event.detail.xhr.responseText;
        const newContent = target.firstElementChild;
        if (newContent) newContent.classList.add(FADE_IN_CLASS);
        if (window.fullPageTransition) {
          const pageBody = document.getElementById(APP_CONTAINER_ID);
          if (pageBody) {
            pageBody.classList.remove(FADE_OUT_CLASS);
            pageBody.classList.add(FADE_IN_CLASS);
          }
        }
      }, FADE_DURATION * 1000);
    } else if (target.id === MODAL_CONTAINER_ID) {
      document.getElementById('modal-bg').style.opacity = 0;
      if (loader) {
        setTimeout(() => {
          loader.classList.add('hidden')
        }, FADE_DURATION * 1000)
      }
    }
  });

  document.body.addEventListener('htmx:afterSwap', (event) => {
    const loader = document.getElementById(GLOBAL_SPINNER_ID);
    const target = event.detail.target;

    if ((target.id === MODAL_CONTAINER_ID)) {
      if (loader) {
        clearTimeout(globalLoadingTimeout);
        // setTimeout(() => {
        loader.classList.add('hidden');
        // }, FADE_DURATION * 1000)
      }
      const newContent = target.firstElementChild;
      newContent.classList.add(FADE_IN_CLASS);
    }
  });

  // Start Alpine
  Alpine.start();

  // Finalize app state after Alpine is ready
  await Alpine.store('app').initPage();

  // ===================== SPLASH HIDE =====================
  const elapsed = performance.now() - start;
  const remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);

  setTimeout(() => {
    // Fade out splash
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), FADE_DURATION * 1000);

    // Reveal app content with fade-in
    appContent.classList.remove('hidden');

    // Trigger fade-in after repaint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        appContent.classList.add('fade-in');
      });
    });
  }, remaining);
});