import * as yup from 'yup'
import { proxy } from 'valtio/vanilla'
import i18next from 'i18next'
import view from './view.js'
import resources from './locales/index.js'
import { setupYupLocales } from './locales/yupLocales.js'
import uniqueId from 'lodash/uniqueId.js'
import loadRSS from './rssLoader.js'

export default async () => {
  // Инициализация i18next
  const i18nInstance = i18next.createInstance()
  await i18nInstance.init({
    lng: 'ru',
    resources,
    interpolation: {
      escapeValue: false,
    },
  })

  // Настройка yup с переводами
  setupYupLocales(i18nInstance.t)

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
    ui: {
    // Храним ID прочитанных постов
      readPosts: [], // используем Set для уникальности
      modal: {
        isOpen: false,
        post: null, // текущий пост для модального окна
      },
    },
  })

  const schema = yup.object().shape({
    url: yup
      .string()
      .required()
      .url()
      .test('unique', 'errors.duplicate', (value) => {
        if (!value) return true
        return !state.feeds.some(feed => feed.url === value)
      }),
  })

  const validate = (fields) => {
    try {
      schema.validateSync(fields, { abortEarly: false })
      return {}
    }
    catch (err) {
      const yupError = /** @type {import('yup').ValidationError} */ (err)
      return yupError.inner.reduce((acc, e) => {
        if (e.path) {
          acc[e.path] = e.message
        }
        return acc
      }, /** @type {Record<string, string>} */ ({}))
    }
  }

  // Функция для проверки новых постов в одном фиде
  const checkFeedUpdates = async (feed) => {
    try {
      const { posts: newPosts } = await loadRSS(feed.url)

      // Получаем существующие посты для этого фида
      const existingPosts = state.posts.filter(post => post.feedId === feed.id)
      const existingLinks = new Set(existingPosts.map(post => post.link))

      // Находим новые посты (которых ещё нет)
      const freshPosts = newPosts.filter(post => !existingLinks.has(post.link))

      if (freshPosts.length > 0) {
        // Добавляем новые посты с генерацией ID
        const postsToAdd = freshPosts.map(post => ({
          id: uniqueId(),
          feedId: feed.id,
          ...post,
        }))

        state.posts.unshift(...postsToAdd)
      }
    }
    catch (error) {
      console.error(`Ошибка обновления фида ${feed.url}:`, error)
      // Не показываем ошибку пользователю при автообновлении
    }
  }

  let isUpdating = false

  // Функция для обновления всех фидов (только одна!)
  const updateAllFeeds = async () => {
    if (isUpdating) return

    isUpdating = true
    try {
      const feeds = [...state.feeds]
      await Promise.allSettled(feeds.map(feed => checkFeedUpdates(feed)))
    }
    finally {
      isUpdating = false
      setTimeout(updateAllFeeds, 5000)
    }
  }

  const watchedState = view(state, {
    handleSubmit: (e) => {
      e.preventDefault()
      const form = /** @type {HTMLFormElement} */ (e.target)
      const formData = new FormData(form)
      const url = String(formData.get('url') || '')

      state.form.fields.url = url
      const errors = validate(state.form.fields)
      state.form.errors = { url: errors.url || null }
      state.form.valid = Object.keys(errors).length === 0

      if (state.form.valid) {
        state.form.processState = 'sending'

        loadRSS(url)
          .then(({ feed, posts }) => {
            const feedId = uniqueId()

            // Добавляем фид
            state.feeds.push({
              id: feedId,
              url: state.form.fields.url,
              ...feed,
            })

            // Добавляем посты с ссылкой на фид
            const newPosts = posts.map(post => ({
              id: uniqueId(),
              feedId,
              ...post,
            }))

            state.posts.push(...newPosts)

            state.form.processState = 'success'
            state.form.fields.url = ''
          })
          .catch((error) => {
            state.form.processState = 'error'
            state.form.errors.url = error.message || 'errors.network'
          })
      }
      else {
        state.form.processState = 'error'
      }
    },
    handleLanguageChange: (lng) => {
      state.lng = lng
      i18nInstance.changeLanguage(lng)
    },
  }, i18nInstance)

  watchedState.start()

  // Запускаем автообновление
  setTimeout(updateAllFeeds, 5000)
}
