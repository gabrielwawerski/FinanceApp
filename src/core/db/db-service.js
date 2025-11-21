// src/db/db-service.js
import db from './db.js';
import { SYNC_STATUS, SESSION_EXPIRY } from './constants.js';

// Helper: UUID fallback
function makeToken() {
	return crypto.randomUUID?.() || 'local-' + Math.random().toString(36).slice(2) +
		Date.now().toString(36);
}

// Timestamps helper
const withTimestamps = (obj) => ({
	...obj, created_at: new Date(), updated_at: new Date(),
});
const withUpdatedAt = (obj) => ({ ...obj, updated_at: new Date() });

export const DatabaseService = {
	// ────────────────────────────────────────────────────────────────────────────────────
	// UI helpers / misc
	// ────────────────────────────────────────────────────────────────────────────────────
	async saveUser(userData, password = null) {
		try {
			let passwordHash = null;
			let passwordSalt = null;

			if (password) {
				const encoder = new TextEncoder();
				const saltBytes = crypto.getRandomValues(new Uint8Array(16));
				const key = await crypto.subtle.importKey('raw',
					encoder.encode(password),
					'PBKDF2',
					false,
					['deriveBits'],
				);
				const bits = await crypto.subtle.deriveBits({
					name: 'PBKDF2', salt: saltBytes, iterations: 600000, hash: 'SHA-256',
				}, key, 256);
				passwordHash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).
				padStart(2, '0')).join('');
				passwordSalt = Array.from(saltBytes).
				map(b => b.toString(16).padStart(2, '0')).
				join('');
			}

			const record = withTimestamps({
				username: userData.username || '',
				email: userData.email || '',
				firstName: userData.firstName || '',
				lastName: userData.lastName || '',
				lastPage: userData.lastPage || null,
				passwordHash,
				passwordSalt, ...userData,
			});

			if (userData.id) {
				await db.users.update(userData.id, withUpdatedAt(record));
				return userData.id;
			} else {
				return await db.users.add(record);
			}
		} catch (err) {
			console.error('saveUser error', err);
			throw err;
		}
	},

	async verifyLogin(usernameOrEmail, password) {
		try {
			const user = await db.users.where('username').
			equals(usernameOrEmail).
			or('email').
			equals(usernameOrEmail).
			first();

			if (!user || !user.passwordHash || !user.passwordSalt) return null;

			const encoder = new TextEncoder();
			const saltBytes = Uint8Array.from(user.passwordSalt.match(/.{2}/g).
			map(b => parseInt(b, 16)));
			const key = await crypto.subtle.importKey('raw',
				encoder.encode(password),
				'PBKDF2',
				false,
				['deriveBits'],
			);
			const bits = await crypto.subtle.deriveBits({
				name: 'PBKDF2', salt: saltBytes, iterations: 600000, hash: 'SHA-256',
			}, key, 256);
			const attemptHash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).
			padStart(2, '0')).join('');

			return attemptHash === user.passwordHash ? user : null;
		} catch (err) {
			console.error('verifyLogin error', err);
			return null;
		}
	},

	async getCurrentUser() {
		try {
			const token = localStorage.getItem('sessionToken');
			if (!token) return null;
			const session = await db.session.where('token').equals(token).first();
			if (!session || new Date(session.expires_at) < new Date()) {
				if (session) await db.session.delete(session.id);
				localStorage.removeItem('sessionToken');
				return null;
			}
			return await db.users.get(session.user_id);
		} catch (err) {
			console.error('getCurrentUser error', err);
			return null;
		}
	},

	async getUserBySession(token) {
		// Same logic as above, but reusable
		return this.getCurrentUser(); // token is already checked via localStorage
	},

	// ────────────────────────────────────────────────────────────────────────────────────
	// UI helpers / misc
	// ────────────────────────────────────────────────────────────────────────────────────
	async createSession(userId, rememberMe = false) {
		try {
			const token = makeToken();
			const expiresIn = rememberMe ? SESSION_EXPIRY.LONG : SESSION_EXPIRY.SHORT;
			const expires_at = new Date(Date.now() + expiresIn);

			await db.session.where('user_id').equals(userId).delete();
			await db.session.add(withTimestamps({ user_id: userId, token, expires_at }));

			return token;
		} catch (err) {
			console.error('createSession error', err);
			throw err;
		}
	},

	async clearSession({ userId = null, token = null } = {}) {
		try {
			if (userId) {
				await db.session.where('user_id').equals(userId).delete();
			} else if (token) {
				await db.session.where('token').equals(token).delete();
			} else {
				await db.session.clear();
			}

			const current = localStorage.getItem('sessionToken');
			if (current && (!token || token === current) || (userId && current)) {
				localStorage.removeItem('sessionToken');
			}
		} catch (err) {
			console.error('clearSession error', err);
		}
	},

	async cleanupExpiredSessions() {
		try {
			const now = new Date();
			const expired = await db.session.where('expires_at').below(now).toArray();
			if (expired.length === 0) return;

			await db.session.bulkDelete(expired.map(s => s.id));
			const currentToken = localStorage.getItem('sessionToken');
			if (currentToken && expired.some(s => s.token === currentToken)) {
				localStorage.removeItem('sessionToken');
			}
		} catch (err) {
			console.error('cleanupExpiredSessions error', err);
		}
	},

	// ────────────────────────────────────────────────────────────────────────────────────
	// PAGE PERSISTENCE
	// ────────────────────────────────────────────────────────────────────────────────────
	async persistPage(userId, page) {
		if (!userId) return;
		await db.users.update(userId, withUpdatedAt({ lastPage: page }));
	},

	async loadPage(userId) {
		if (!userId) return null;
		const user = await db.users.get(userId);
		return user?.lastPage || null;
	},

	// ────────────────────────────────────────────────────────────────────────────────────
	// CATEGORIES & TRANSACTIONS
	// ────────────────────────────────────────────────────────────────────────────────────
	async createCategory(userId, data) {
		// Enforce: user-created categories are never predefined
		const predefined = false;

		// Validate type
		const type = (data.type === 'income' || data.type === 'expense')
			? data.type
			: 'expense';

		// Validate color
		const color = typeof data.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.color)
			? data.color
			: '#999999';

		const record = withTimestamps({
			user_id: userId,
			server_id: null,
			name: data.name?.trim() || 'Untitled',
			type,
			color,
			predefined, // always false here
			sync_status: SYNC_STATUS.LOCAL,
			deleted_at: null,
			version: 1, ...data,
		});

		return await db.categories.add(record);
	},

	async updateCategory(id, data) {
		const existing = await db.categories.get(id);
		if (!existing) throw new Error('Category not found');

		// Prevent editing predefined fields
		if (existing.predefined) {
			data.predefined = existing.predefined;
			data.type = existing.type;
			data.color = existing.color;
		}

		// Normal update
		const record = withUpdatedAt({
			...existing, ...data,
		});

		await db.categories.put(record);
		return id;
	},

	async createTransaction(userId, data) {
		const date = data.date ? new Date(data.date) : new Date();
		if (isNaN(date)) throw new Error('Invalid date');

		const record = withTimestamps({
			user_id: userId,
			server_id: null,
			category_id: data.category_id || null,
			date,
			amount: Number(data.amount) || 0,
			description: data.description?.trim() || '',
			sync_status: SYNC_STATUS.LOCAL,
			deleted_at: null,
			version: 1, ...data,
		});
		return await db.transactions.add(record);
	},

	async getCategories(userId) {
		return await db.categories.filter(c => !c.deleted_at &&
			(c.predefined === true || c.user_id === userId)).
		toArray();  // TODO: bug?
	},

	// Optimized with compound index
	async getTransactions(userId, startDate = null, endDate = null) {
		try {
			let collection = db.transactions.where('[user_id+date]');

			if (startDate || endDate) {
				const s = startDate ? new Date(startDate.setHours(0, 0, 0, 0)) : new Date(0);
				const e = endDate ? new Date(endDate.setHours(23, 59, 59, 999)) : new Date(
					8640000000000000);

				collection = collection.between([userId, s], [userId, e], true, true);
			} else {
				collection = collection.startsWith([userId]);
			}

			const results = await collection.filter(t => !t.deleted_at).
			reverse() // newest first thanks to index
			.toArray();

			return results;
		} catch (err) {
			console.error('getTransactions error', err);
			return [];
		}
	},

	// ────────────────────────────────────────────────────────────────────────────────────
	// Secure logout and cleanup
	// ────────────────────────────────────────────────────────────────────────────────────
	async clearUserData(userId) {
		try {
			await db.categories.where('user_id').equals(userId).delete();
			await db.transactions.where('user_id').equals(userId).delete();
			await db.users.update(userId, { lastPage: null });
		} catch (err) {
			console.error('clearUserData error', err);
		}
	},

	// Full wipe (for "Logout everywhere" or public device)
	async wipeEverything() {
		await db.delete();
		localStorage.clear();
		location.reload();
	},
};

// ───────────────────────────────────────────────────────────────────────────────────────
// Background jobs
// ───────────────────────────────────────────────────────────────────────────────────────
let cleanupInterval = null;

export const startBackgroundJobs = () => {
	if (cleanupInterval) return;

	DatabaseService.cleanupExpiredSessions(); // immediate run

	cleanupInterval = setInterval(() => {
		DatabaseService.cleanupExpiredSessions();
		// Future: SyncService.attemptBackgroundSync();
	}, 15 * 60 * 1000); // every 15 min

	// Also on tab visibility
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) {
			DatabaseService.cleanupExpiredSessions();
		}
	});
};

export const stopBackgroundJobs = () => {
	if (cleanupInterval) clearInterval(cleanupInterval);
	cleanupInterval = null;
};

export default DatabaseService;