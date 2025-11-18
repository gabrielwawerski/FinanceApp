// @stores/translation.js
import { loadTranslations } from "@util/file-util.js";
import { safePersist } from "@util/util.js";
import { DEFAULT_LOCALE, LS_APP_LANG } from "@core/config.js";


export const TranslationStore = (locale = DEFAULT_LOCALE, initialMessages = {}) => {
  return (Alpine) => {
    Alpine.store('locale', {
      locale: safePersist(LS_APP_LANG, locale, DEFAULT_LOCALE),
      translations: {
        [locale]: initialMessages ?? {}
      },
      loaded: {[locale]: true},

      init() {
      },

      set(locale) {
        this._load(locale);
      },

      async _load(locale) {
        if (this.loaded[locale]) {
          this.locale = locale;
          return;
        }
        try {
          this.translations[locale] = await loadTranslations(locale);
          this.loaded[locale] = true;
          this.locale = locale;
        } catch (e) {
          console.error(`Failed to load translations for "${locale}"`, e);
          if (locale !== DEFAULT_LOCALE) await this._load(DEFAULT_LOCALE);
        }
      },

      tr(key) {
        return this.translations[this.locale]?.[key] ?? `[${key}]`;
      }
    });
  };
};
