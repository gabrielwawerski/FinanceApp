import Alpine from 'alpinejs';


/**
 * Persist data to localStorage with fallback handling
 * @param {*} defaultValue - Default value to use if none found or invalid
 * @param {string} key - localStorage key
 * @returns {*} Alpine.js persisted value
 */
export function persist(defaultValue, key) {
  try {
	const stored = localStorage.getItem(key);

	// Handle cases where stored value is null/undefined
	if (stored === null || stored === undefined) {
	  return Alpine.$persist(defaultValue).as(key);
	}

	// Handle special cases for "null" and "undefined" strings
	if (stored === "null") {
	  return Alpine.$persist(null).as(key);
	}

	if (stored === "undefined") {
	  return Alpine.$persist(defaultValue).as(key);
	}

	// Try to parse JSON, fallback to defaultValue if invalid
	try {
	  const parsed = JSON.parse(stored);
	  return Alpine.$persist(parsed).as(key);
	} catch (parseError) {
	  // Invalid JSON - use default value
	  console.warn(`Invalid JSON in localStorage for key "${key}", using default value`);
	  return Alpine.$persist(defaultValue).as(key);
	}
  } catch (error) {
	// Any other error - use default value
	console.warn(`Error accessing localStorage for key "${key}", using default value:`, error);
	return Alpine.$persist(defaultValue).as(key);
  }
}


export function throttle(fn, limit) {
  let waiting = false;
  return (...args) => {
	if (!waiting) {
	  fn.apply(this, args);
	  waiting = true;
	  console.log("throttle ran")
	  setTimeout(() => waiting = false, limit);
	}
  };
}

export function clearById(element) {
  document.getElementById(element).innerHTML = '';
}