// src/db/constants.js
export const SYNC_STATUS = {
	LOCAL: 'local',          // created offline, never synced
	PENDING: 'pending',      // queued for upload
	SYNCED: 'synced',        // successfully synced with server
	CONFLICT: 'conflict',    // server version differs
	DELETED: 'deleted',       // soft-deleted locally
};

export const SESSION_EXPIRY = {
	SHORT: 24 * 60 * 60 * 1000,        // 1 day (default)
	LONG: 30 * 24 * 60 * 60 * 1000,     // 30 days (remember me)
};

export const INDEX_NAMES = {
	TRANSACTIONS_BY_USER_DATE: '[user_id+date]',
};