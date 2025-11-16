/**
 * Login modal Alpine.js component
 * @namespace loginModal
 * @type {Function}
 * @returns {Object} Alpine.js component with methods and properties
 */
export const loginModal = () => ({
  username: '',
  password: '',

  /**
   * Initialize the component
   * @memberof loginModal
   */
  init() {
	this.$watch('username', () => Alpine.store('currentUser').name = this.username);
  },

  closeModal() {
	Alpine.store('app').closeModal();
  },
})