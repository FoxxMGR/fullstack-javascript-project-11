
import * as yup from 'yup';
import { proxy, subscribe } from 'valtio/vanilla';
import i18next from 'i18next';
import view from './view.js';
import resources from './locales/index.js';
import { setupYupLocales } from './locales/yupLocales.js';

export default async () => {
  // Инициализация i18next
  const i18nInstance = i18next.createInstance();
  await i18nInstance.init({
    lng: 'ru',
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

  // Настройка yup с переводами
  setupYupLocales(i18nInstance.t);

  /** @type {AppState} */
  const state = proxy({
    lng: 'ru',
    form: {
      processState: 'filling',
      fields: {
        url: '',
      },
      errors: {
        url: null,
      },
      valid: false,
    },
    feeds: [],
    posts: [],
  });

  const schema = yup.object().shape({
    url: yup
      .string()
      .required()
      .url()
      .test('unique', 'errors.duplicate', (value) => {
        if (!value) return true;
        return !state.feeds.some(feed => feed.url === value);
      }),
  });

  const validate = (fields) => {
    try {
      schema.validateSync(fields, { abortEarly: false });
      return {};
    } catch (err) {
      const yupError = /** @type {import('yup').ValidationError} */ (err);
      return yupError.inner.reduce((acc, e) => {
        if (e.path) {
          acc[e.path] = e.message;
        }
        return acc;
      }, /** @type {Record<string, string>} */ ({}));
    }
  };

  const watchedState = view(state, {
    handleSubmit: (e) => {
      e.preventDefault();
      const form = /** @type {HTMLFormElement} */ (e.target);
      const formData = new FormData(form);
      const url = String(formData.get('url') || '');

      state.form.fields.url = url;
      const errors = validate(state.form.fields);
      state.form.errors = { url: errors.url || null };
      state.form.valid = Object.keys(errors).length === 0;

      if (state.form.valid) {
        state.form.processState = 'sending';

        new Promise((resolve) => {
          setTimeout(() => {
            state.feeds.push({
              url,
              title: 'Новый фид',
              description: 'Описание фида',
            });
            state.form.processState = 'success';
            resolve(null);
          }, 1000);
        }).catch(() => {
          state.form.processState = 'error';
          state.form.errors.url = 'errors.network';
        });
      } else {
        state.form.processState = 'error';
      }
    },
    handleLanguageChange: (lng) => {
      state.lng = lng;
      i18nInstance.changeLanguage(lng);
    },
  }, i18nInstance);

  watchedState.start();
};