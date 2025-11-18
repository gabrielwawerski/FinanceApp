// src/db/db.js
import Dexie from 'dexie';
import { SYNC_STATUS, INDEX_NAMES } from './constants.js';


export const db = new Dexie('finance_manager');

db.version(4).stores({
  // Users – local profile + secure password
  users: `
		++id,
		username,
		email,
		firstName,
		lastName,
		passwordHash,
		passwordSalt,
		lastPage,
		created_at,
		updated_at
	`.replace(/\s+/g, ''),

  // Sessions – with expiration
  session: '++id, user_id, token, expires_at, created_at',

  // Categories – sync ready
  categories: `
		++id,
		user_id,
		server_id,
		name,
		sync_status,
		deleted_at,
		version,
		created_at,
		updated_at
	`.replace(/\s+/g, ''),

  // Transactions – optimized with compound index
  transactions: `
		++id,
		user_id,
		server_id,
		category_id,
		date,
		amount,
		description,
		sync_status,
		deleted_at,
		version,
		created_at,
		updated_at,
		${INDEX_NAMES.TRANSACTIONS_BY_USER_DATE}
	`.replace(/\s+/g, '')
});

export default db;