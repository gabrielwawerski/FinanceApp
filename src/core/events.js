/**
 * Lightweight DOM-based event bus.
 * Uses CustomEvent for payloads.
 */
export const events = {
  /**
   * Dispatch a custom event.
   * @param {string} name - event name
   * @param {object|null} detail - optional payload
   */
  emit(name, detail = null) {
	document.dispatchEvent(
	   new CustomEvent(name, {detail})
	);
  },

  /**
   * Subscribe to an event.
   * @param {string} name - event name
   * @param {Function} callback - receives Event object
   * @returns {Function} unsubscribe function
   */
  on(name, callback) {
	document.addEventListener(name, callback);
	return () => {
	  document.removeEventListener(name, callback);
	};
  }
};
