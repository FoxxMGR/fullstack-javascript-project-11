import * as yup from 'yup'
import { proxy } from 'valtio/vanilla'
import view from './view.js'

export default () => {
  // Создаём состояние (Model)
  const state = proxy({
    form: {
      processState: 'filling', // 'filling', 'sending', 'success', 'error'
      fields: {
        url: '',
      },
      errors: {
        url: null,
      },
      valid: false,
    },
    feeds: [], // список добавленных фидов
    posts: [], // список постов
  })

  // Схема валидации
  const schema = yup.object().shape({
    url: yup
      .string()
      .required('Не должно быть пустым')
      .url('Ссылка должна быть валидным URL')
      .test('unique', 'RSS уже существует', (value) => {
        if (!value) return true
        return !state.feeds.some(feed => feed.url === value)
      }),
  })

  // Функция валидации
  const validate = (fields) => {
    try {
      schema.validateSync(fields, { abortEarly: false })
      return {}
    }
    catch (err) {
      return err.inner.reduce((acc, e) => {
        acc[e.path] = e.message
        return acc
      }, {})
    }
  }

  // Инициализация View
  const watchedState = view(state, {
    handleSubmit: (e) => {
      e.preventDefault()

      const formData = new FormData(e.target)
      const url = formData.get('url')

      state.form.fields.url = url
      const errors = validate(state.form.fields)
      state.form.errors = errors
      state.form.valid = Object.keys(errors).length === 0

      if (state.form.valid) {
        state.form.processState = 'sending'

        // Имитация добавления RSS (позже заменим на реальный запрос)
        new Promise((resolve) => {
          setTimeout(() => {
            state.feeds.push({
              url,
              title: 'Новый фид',
              description: 'Описание фида',
            })
            state.form.processState = 'success'
            resolve()
          }, 1000)
        }).catch(() => {
          state.form.processState = 'error'
          state.form.errors.url = 'Ошибка сети'
        })
      }
      else {
        state.form.processState = 'error'
      }
    },
  })

  // Запуск приложения
  watchedState.start()
}
