import { setLocale } from 'yup'

export const setupYupLocales = () => {
  setLocale({
    mixed: {
      required: () => 'errors.required',
    },
    string: {
      url: () => 'errors.url',
    },
  })
}
