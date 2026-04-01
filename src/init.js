import * as yup from 'yup'
import { proxy, snapshot } from 'valtio/vanilla'
import { proxySet } from 'valtio/vanilla/utils'
import i18next from 'i18next'
import view from './view.js'
import resources from './locales/index.js'
import { setupYupLocales } from './locales/yupLocales.js'
import uniqueId from 'lodash/uniqueId.js'
import loadRSS from './rssLoader.js'
import * as bootstrap from 'bootstrap'

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
  setupYupLocales()

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
      readPosts: proxySet(),
      modal: {
        isOpen: false,
        post: null,
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

      const existingPosts = state.posts.filter(post => post.feedId === feed.id)
      const existingLinks = new Set(existingPosts.map(post => post.link))

      const freshPosts = newPosts.filter(post => !existingLinks.has(post.link))

      if (freshPosts.length > 0) {
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
    }
  }

  let isUpdating = false

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

  // Контроллер для отправки формы
  const handleSubmit = (e) => {
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

          state.feeds.push({
            id: feedId,
            url: state.form.fields.url,
            ...feed,
          })

          const newPosts = posts.map(post => ({
            id: uniqueId(),
            feedId,
            ...post,
          }))

          state.posts.push(...newPosts)

          state.form.processState = 'success'
          state.form.errors.url = null
          state.form.fields.url = ''
        })
        .catch((error) => {
          state.form.processState = 'error'
          const message = error instanceof Error ? error.message : 'errors.network'
          state.form.errors.url = message || 'errors.network'
        })
    }
    else {
      state.form.processState = 'error'
    }
  }

  // Контроллер для смены языка
  const handleLanguageChange = (lng) => {
    state.lng = lng
    i18nInstance.changeLanguage(lng)
  }

  // Контроллер для отметки поста прочитанным
  const handleMarkAsRead = (postId) => {
    if (!state.ui.readPosts.has(postId)) {
      state.ui.readPosts.add(postId)
    }
  }

  // Инициализация Bootstrap модального окна
  const modalElement = document.getElementById('modal')
  let modalInstance = null

  if (modalElement) {
    modalInstance = new bootstrap.Modal(modalElement)
  }

  // Контроллер для открытия модального окна
  const handleOpenModal = (post) => {
    if (!modalInstance || !modalElement) return

    // Отмечаем пост как прочитанный
    if (!state.ui.readPosts.has(post.id)) {
      state.ui.readPosts.add(post.id)
    }

    // Обновляем содержимое модального окна
    const modalTitle = modalElement.querySelector('.modal-title')
    const modalBody = modalElement.querySelector('.modal-body')
    const fullArticleLink = modalElement.querySelector('#fullArticleLink')
    const closeButton = modalElement.querySelector('.btn-secondary')

    if (modalTitle) {
      modalTitle.textContent = post.title
    }

    if (modalBody) {
      modalBody.innerHTML = ''

      // Добавляем текст цели (было в предыдущей версии)
      const goalPara = document.createElement('p')
      goalPara.textContent = i18nInstance.t('modal.goal')
      modalBody.appendChild(goalPara)

      // Добавляем описание поста
      const descriptionPara = document.createElement('p')
      descriptionPara.textContent = post.description
      modalBody.appendChild(descriptionPara)
    }

    if (fullArticleLink) {
      fullArticleLink.href = post.link
      fullArticleLink.textContent = i18nInstance.t('buttons.readFull')
    }

    // Используем closeButton для обновления текста
    if (closeButton) {
      closeButton.textContent = i18nInstance.t('buttons.close')
    }

    // Открываем модальное окно
    modalInstance.show()
  }

  // Инициализируем view
  const appView = view(state, i18nInstance)
  appView.start()

  // Навешиваем обработчики через делегирование событий
  document.body.addEventListener('submit', (e) => {
    const form = e.target.closest('form')
    if (form) {
      e.preventDefault()
      handleSubmit(e)
    }
  })

  document.body.addEventListener('click', (e) => {
    // Обработка кнопок языка
    const langBtn = e.target.closest('.language-switcher button')
    if (langBtn) {
      const lng = langBtn.textContent === 'Русский' ? 'ru' : 'en'
      handleLanguageChange(lng)
      return
    }

    // Обработка кнопок предпросмотра
    const previewBtn = e.target.closest('.preview-btn')
    if (previewBtn) {
      const postId = previewBtn.dataset.postId
      const snap = snapshot(state)
      const post = snap.posts.find(p => p.id === postId)
      if (post) {
        handleOpenModal(post)
      }
      return
    }

    // Обработка кликов по ссылкам (отметка прочитанного)
    const link = e.target.closest('.list-group-item a')
    if (link) {
      const postId = link.dataset.postId
      if (postId) {
        handleMarkAsRead(postId)
      }
    }
  })

  setTimeout(updateAllFeeds, 5000)
}
