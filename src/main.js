/**
 * @file Main application entry point
 * @description Initializes Alpine.js with plugins and stores, configures htmx, and starts the application
 * @namespace main.js
 */
import htmx from 'htmx.org';
import Alpine from 'alpinejs';
import focus from '@alpinejs/focus';
import persist from '@alpinejs/persist';
// import stores using aliases
import { AppStore } from "@stores/app.js";
import { TranslationStore } from "@stores/translation.js";
// import
import { LoginModal } from "@/modals/login/LoginModal.js";
// import components
import '@components/ThemeToggle.js';
import { DEFAULT_LOCALE, LS_APP_LANG, PAGES, RESTRICTED_PAGES, TR_KEYS } from "@core/config.js";
import { loadTranslations } from "@util/file-util.js";

window.TR_KEYS = TR_KEYS

const locale = (localStorage.getItem(LS_APP_LANG) || DEFAULT_LOCALE).replace(/"/g,'');
const translations = await loadTranslations(locale);

// register Alpine plugins
Alpine.plugin(focus);
Alpine.plugin(persist);

// register stores with Alpine.plugin()
Alpine.plugin(AppStore);
Alpine.plugin(TranslationStore(locale, translations));

// register alpine components
Alpine.data('LoginModal', LoginModal)

// Configure htmx
htmx.config.selfRequestsOnly = false;
htmx.config.defaultSwapStyle = 'innerHTML';

// Make globals available for htmx and other libraries
window.Alpine = Alpine;
window.htmx = htmx;

document.body.addEventListener('htmx:beforeSwap', (event) => {
	const target = event.detail.target;
	if ((target.id === 'main-content' || target.id === 'modal-content') && target.firstElementChild) {
		const oldContent = target.firstElementChild;
		oldContent.classList.add('fade-out');

		// Prevent immediate swap
		event.detail.shouldSwap = false;

		setTimeout(() => {
			target.innerHTML = event.detail.xhr.responseText;
			const newContent = target.firstElementChild;
			newContent.classList.add('fade-in');
		}, 300); // match animation duration
	}
});


document.body.addEventListener('htmx:afterSwap', (event) => {
	const target = event.detail.target;
	if ((target.id === 'main-content' || target.id === 'modal-content') && target.firstElementChild) {
		const newContent = target.firstElementChild;
		newContent.classList.add('fade-in');
	}
});



document.addEventListener('alpine:init', () => {
  // Handle ALL htmx swaps with Morph to preserve Alpine state
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
});


// Start Alpine after all registrations are complete
Alpine.start();


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