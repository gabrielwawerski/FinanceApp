/**
 * @file Main application entry point
 * @description Initializes Alpine.js with plugins and stores, configures htmx, and starts the application
 * @namespace main.js
 */
import htmx from 'htmx.org';
import Alpine from 'alpinejs';
import focus from '@alpinejs/focus';
import persist from '@alpinejs/persist';
import morph from "@alpinejs/morph";
// Import stores using aliases
import { AppStore } from "@stores/app.js";
import { TranslationStore } from "@stores/translation.js";
// import
import { LoginModal } from "@/modals/login/LoginModal.js";
// Import components
import '@components/ThemeToggle.js';
import { DEFAULT_LOCALE, LS_APP_LANG, PAGES, RESTRICTED_PAGES, TR_KEYS } from "@core/config.js";
import { loadTranslations } from "@util/file-util.js";

window.TR_KEYS = TR_KEYS

const locale = (localStorage.getItem(LS_APP_LANG) || DEFAULT_LOCALE).replace(/"/g,'');
const translations = await loadTranslations(locale);

// Register Alpine plugins
Alpine.plugin(focus);
Alpine.plugin(persist);
Alpine.plugin(morph);

// JS Modules way of adding stores(Alpine.store) and components(Alpine.data):
// Everything needs to be done BEFORE Alpine.start()
// Register stores with Alpine.plugin()
Alpine.plugin(AppStore);
Alpine.plugin(TranslationStore(locale, translations));

Alpine.data('LoginModal', LoginModal)

// Configure htmx
htmx.config.selfRequestsOnly = false;
htmx.config.defaultSwapStyle = 'innerHTML';

// Make globals available for htmx and other libraries
window.Alpine = Alpine;
window.Alpine.morph = morph;
window.htmx = htmx;


document.addEventListener('alpine:init', () => {
  // Handle ALL htmx swaps with Morph to preserve Alpine state
  document.body.addEventListener('htmx:afterSwap', (event) => {
	const target = event.detail.target;

	// Only morph if there are Alpine components in the swapped content
	if (target.querySelector('[x-data]') || target.hasAttribute('x-data')) {
	  // Use Alpine.morph to preserve state while updating DOM
	  Alpine.morph(target, event.detail.xhr.response, {
		lookahead: true, // Enables better element movement detection
		updating(el, toEl, childrenOnly, skip) {
		  // Skip script tags to prevent duplicate execution
		  if (el.tagName === 'SCRIPT') skip();
		}
	  });
	}
  });

  if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
	  navigator.serviceWorker.register('/service-worker.js')
		 .then(registration => {
		   console.log('ServiceWorker registered with scope:', registration.scope);
		 })
		 .catch(error => {
		   console.error('ServiceWorker registration failed:', error);
		 });
	});
  }

  window.addEventListener('popstate', (event) => {
	const state = event.state || {};
	const app = Alpine.store('app');

	if (state.page && !RESTRICTED_PAGES.includes(state.page)) {
	  app.navigateTo(state.page, {updateHistory: false});
	} else {
	  // Optional: if user hits restricted page, redirect to landing/dashboard
	  const fallback = app.currentUser ? PAGES.DASHBOARD : PAGES.LANDING;
	  app.navigateTo(fallback, {updateHistory: false});
	}
  });

});


// Start Alpine after all registrations are complete
Alpine.start();