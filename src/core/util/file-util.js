import { DEFAULT_LOCALE } from "@core/config.js";


export async function loadTranslations(locale = 'pl') {
  try {
	const res = await fetch(`/public/lang/${locale.replace(/"/g,'')}.json`);

	if (!res.ok) {
      // TODO: send default language (also declared in code)
      throw new Error(`HTTP ${res.status}`)
    }

	return await res.json();
  } catch (err) {
	console.warn(`Failed to load default translations (${locale}). Loading default: ${DEFAULT_LOCALE}`, err);
	return await loadTranslations(DEFAULT_LOCALE)
  }
}