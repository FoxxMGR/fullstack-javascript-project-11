import { setLocale } from 'yup';

export const setupYupLocales = (t) => {
  setLocale({
    mixed: {
      required: () => t('errors.required'),
    },
    string: {
      url: () => t('errors.url'),
    },
  });
};