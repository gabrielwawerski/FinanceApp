/**
 * Login modal Alpine.js component
 * @namespace LoginModal
 * @type {Function}
 * @returns {Object} Alpine.js component with methods and properties
 */
export const LoginModal = () => ({
	username: '',
	password: '',

	/**
	 * Initialize the component
	 * @memberof LoginModal
	 */
	init() {
	},

	closeModal() {
		Alpine.store('app').closeModal();
	},
});