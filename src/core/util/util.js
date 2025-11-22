import Alpine from 'alpinejs';

/**
 * Persist data to `localStorage` with fallback handling
 * @param {string} key - localStorage key
 * @param {*} value - Actual value to store
 * @param {*} defaultValue - Default value to use if none found or invalid
 * @returns {*} Alpine.js persisted value
 */
export function safePersist(key, value, defaultValue = value) {
  try {
    const stored = localStorage.getItem(key);

    // Handle cases where stored value is null/undefined
    if (stored === null || stored === undefined) {
      return Alpine.$persist(defaultValue).as(key);
    }

    // Handle special cases for "null" and "undefined" strings
    if (stored === 'null') {
      return Alpine.$persist(null).as(key);
    }

    if (stored === 'undefined') {
      return Alpine.$persist(defaultValue).as(key);
    }

    // Try to parse JSON, fallback to defaultValue if invalid
    try {
      const parsed = JSON.parse(stored);
      return Alpine.$persist(parsed).as(key);
    } catch (parseError) {
      // Invalid JSON - use default value
      console.warn(`Invalid JSON in localStorage for key "${key}",
				using default value: ${defaultValue}`);
      localStorage.removeItem(key);
      return Alpine.$persist(defaultValue).as(key);
    }
  } catch (error) {
    // Any other error - use default value
    console.warn(
      `Error accessing localStorage for key "${key}", using default value:`,
      error,
    );
    localStorage.removeItem(key);
    return Alpine.$persist(defaultValue).as(key);
  }
}

export function throttle(fn, limit) {
  let waiting = false;
  return (...args) => {
    if (!waiting) {
      fn.apply(this, args);
      waiting = true;
      console.log('throttle ran');
      setTimeout(() => (waiting = false), limit);
    }
  };
}

export function clearById(element) {
  document.getElementById(element).innerHTML = '';
}

// WAIT FOR X
export async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function restartSpinner() {
  const ring = document.querySelector('.spinner-ring');
  if (!ring) return;

  ring.style.animation = 'none';
  requestAnimationFrame(() => {
    ring.style.animation =
      'spin 5s linear infinite, dash 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite';
  });
}

export function normalizePath(path) {
  let p = path.replace(/\/\/+/g, '/'); // collapse internal //
  // p = p.replace(/\/+$/, ''); // trim trailing /
  return p === '' ? '/' : p;
}

// htmx-ext-alpine-morph inlined to use in es6 modules
// htmx.defineExtension('alpine-morph', {
//   onEvent: function(name, evt) {
//     if (name === 'htmx:swap') {
//       // Tell htmx to use morph instead of default swap
//       if (Alpine && Alpine.morph) {
//         evt.detail.shouldMorph = true;
//         evt.detail.swap = function(target, fragment) {
//           Alpine.morph(target, fragment);
//         };
//       }
//     }
//   }
// });
