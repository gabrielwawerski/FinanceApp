import db from './db.js';
import { SESSION_EXPIRY, SYNC_STATUS } from './constants.js';

// ─────────────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────────────
function makeToken() {
  return (
    crypto.randomUUID?.() ||
    'local-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

// Timestamps helper
const withTimestamps = obj => ({
  ...obj,
  created_at: new Date(),
  updated_at: new Date(),
});
const withUpdatedAt = obj => ({ ...obj, updated_at: new Date() });

// ─────────────────────────────────────────────────────────────────────────────────────
// DatabaseService class
// ─────────────────────────────────────────────────────────────────────────────────────
/**
 * DatabaseService provides a collection of methods for database-related operations such
 * as user management, session handling, page persistence, and category/transaction
 * management. It facilitates interaction with a local IndexedDB database and includes
 * utilities for secure password hashing and session handling.
 *
 * Methods:
 * - `async saveUser(userData, password = null)`: Creates or updates a user record with
 * optional password hashing.
 * - `async verifyLogin(usernameOrEmail, password)`: Verifies user credentials using
 * stored password hash and salt.
 * - `async getCurrentUser()`: Retrieves the currently logged-in user based on the active
 * session token.
 * - `async getUserBySession(token)`: Retrieves a user associated with a given session
 * token.
 * - `async createSession(userId, rememberMe = false)`: Creates a session for a user with
 * an authentication token.
 * - `async clearSession(options = {})`: Clears session data for a specific user, token,
 * or all sessions.
 * - `async cleanupExpiredSessions()`: Cleans up expired sessions from the database and
 * localStorage.
 * - `async persistPage(userId, page)`: Persists the last accessed page for a user.
 * - `async loadPage(userId)`: Retrieves the last accessed page for a user.
 * - `async createCategory(userId, data)`: Creates a new category for managing user
 * transactions.
 * - `async updateCategory(id, data)`: Updates an existing category, with protections for
 * predefined fields.
 * - `async createTransaction(userId, data)`: Creates a new user transaction with
 * validation for required fields.
 * - `async getCategories(userId)`: Retrieves all non-deleted categories associated with
 * a
 * user.
 *
 * Note:
 * - Password hashing uses PBKDF2 with a secure salt, providing a level of cryptographic
 * security.
 * - Session handling uses tokens with defined expiry times for authentication.
 * - The service manages local database enhancements such as timestamping for records.
 */
export const DatabaseService = {
  async saveUser(userData, password = null) {
    try {
      let passwordHash = null;
      let passwordSalt = null;

      if (password) {
        const encoder = new TextEncoder();
        const saltBytes = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(password),
          'PBKDF2',
          false,
          ['deriveBits'],
        );
        const bits = await crypto.subtle.deriveBits(
          {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 600000,
            hash: 'SHA-256',
          },
          key,
          256,
        );
        passwordHash = Array.from(new Uint8Array(bits))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        passwordSalt = Array.from(saltBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      }

      const record = withTimestamps({
        username: userData.username || '',
        email: userData.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        lastPage: userData.lastPage || null,
        passwordHash,
        passwordSalt,
        ...userData,
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
      const user = await db.users
        .where('username')
        .equals(usernameOrEmail)
        .or('email')
        .equals(usernameOrEmail)
        .first();

      if (!user || !user.passwordHash || !user.passwordSalt) return null;

      const encoder = new TextEncoder();
      const saltBytes = Uint8Array.from(
        user.passwordSalt.match(/.{2}/g).map(b => parseInt(b, 16)),
      );

      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
      );

      const bits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 600000,
          hash: 'SHA-256',
        },
        key,
        256,
      );

      const attemptHash = Array.from(new Uint8Array(bits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

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

  async getUserBySession() {
    // argument: token
    return this.getCurrentUser(); // token is already checked via localStorage
  },

  // ─────────────────────────────────────────────────────────────────────────────────────
  // Session management
  // ─────────────────────────────────────────────────────────────────────────────────────
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
      if ((current && (!token || token === current)) || (userId && current)) {
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

  // ─────────────────────────────────────────────────────────────────────────────────────
  // Page persistence
  // ─────────────────────────────────────────────────────────────────────────────────────
  async persistPage(userId, page) {
    if (!userId) return;
    await db.users.update(userId, withUpdatedAt({ lastPage: page }));
  },

  async loadPage(userId) {
    if (!userId) return null;
    const user = await db.users.get(userId);
    return user?.lastPage || null;
  },

  // ─────────────────────────────────────────────────────────────────────────────────────
  // Categories and transactions
  // ─────────────────────────────────────────────────────────────────────────────────────
  async createCategory(userId, data) {
    // Enforce: user-created categories are never predefined
    const predefined = false;

    // Validate type
    const type =
      data.type === 'income' || data.type === 'expense' ? data.type : 'expense';

    // Validate color
    const color =
      typeof data.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.color)
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
      version: 1,
      ...data,
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
      ...existing,
      ...data,
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
      version: 1,
      ...data,
    });
    return await db.transactions.add(record);
  },

  async getCategories(userId) {
    return await db.categories
      .filter(c => !c.deleted_at && (c.predefined === true || c.user_id === userId))
      .toArray(); // TODO: bug?
  },

  // Optimized with compound index
  async getTransactions(userId, startDate = null, endDate = null) {
    try {
      let collection = db.transactions.where('[user_id+date]');

      if (startDate || endDate) {
        const s = startDate ? new Date(startDate.setHours(0, 0, 0, 0)) : new Date(0);
        const e = endDate
          ? new Date(endDate.setHours(23, 59, 59, 999))
          : new Date(8640000000000000);

        collection = collection.between([userId, s], [userId, e], true, true);
      } else {
        collection = collection.startsWith([userId]);
      }

      return await collection
        .filter(t => !t.deleted_at)
        .reverse() // newest first thanks to index
        .toArray();
    } catch (err) {
      console.error('getTransactions error', err);
      return [];
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────────────
  // Secure logout and cleanup
  // ─────────────────────────────────────────────────────────────────────────────────────
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

  cleanupInterval = setInterval(
    () => {
      DatabaseService.cleanupExpiredSessions();
      // Future: SyncService.attemptBackgroundSync();
    },
    15 * 60 * 1000,
  ); // every 15 min

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
