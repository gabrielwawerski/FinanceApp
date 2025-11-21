import db from '@db/db.js';
import { SYNC_STATUS } from '@db/constants.js';


export async function initializeDatabase() {
	try {
		await db.open();
	} catch (error) {
		console.error('❌ Failed to open database', error);
		if (error.name === 'UpgradeError' || error.name === 'VersionError') {
			await db.delete();
			await db.open();
		}
	}
}

export async function seedPredefinedCategories() {
	// Predefined categories list
	const predefined = [
		{ name: 'Salary', type: 'income', color: '#4caf50', predefined: true },
		{ name: 'Groceries', type: 'expense', color: '#ff9800', predefined: true },
		{ name: 'Transport', type: 'expense', color: '#03a9f4', predefined: true },
		{ name: 'Utilities', type: 'expense', color: '#9c27b0', predefined: true },
	];

	for (const cat of predefined) {
		const exists = await db.categories.filter(c => c.name === cat.name && c.predefined).
		count();

		if (!exists) {
			await db.categories.add({
				...cat,
				user_id: null,
				server_id: null,
				sync_status: SYNC_STATUS.SYNCED,
				deleted_at: null,
				version: 1,
				created_at: new Date(),
				updated_at: new Date(),
			});
		}
	}
}
