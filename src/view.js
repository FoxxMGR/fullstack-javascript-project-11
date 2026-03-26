import { subscribe, snapshot } from 'valtio/vanilla'

// Вспомогательная функция для экранирования HTML
const escapeHtml = (str) => {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * @param {Object} state
 * @param {Object} handlers
 * @param {Function} handlers.handleSubmit
 * @param {Function} handlers.handleLanguageChange
 * @param {Object} i18nInstance
 */
export default (state, handlers, i18nInstance) => {
  const container = document.querySelector('.container')
  if (!container) return { start: () => {} }

  // Создаём контейнеры один раз при инициализации
  const ensureContainers = () => {
    if (!document.getElementById('feeds-container')) {
      const feedsDiv = document.createElement('div')
      feedsDiv.id = 'feeds-container'
      feedsDiv.className = 'feeds mt-4'
      container.appendChild(feedsDiv)
    }

    if (!document.getElementById('posts-container')) {
      const postsDiv = document.createElement('div')
      postsDiv.id = 'posts-container'
      postsDiv.className = 'posts mt-4'
      container.appendChild(postsDiv)
    }
  }

  const renderLanguageSwitcher = () => {
    const existingSwitcher = document.querySelector('.language-switcher')
    if (existingSwitcher) existingSwitcher.remove()

    const switcher = document.createElement('div')
    switcher.className = 'language-switcher btn-group mb-3'
    switcher.setAttribute('role', 'group')

    ;['ru', 'en'].forEach((lng) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `btn btn-sm ${state.lng === lng ? 'btn-primary' : 'btn-outline-primary'}`
      btn.textContent = i18nInstance.t(`languages.${lng}`)
      btn.addEventListener('click', () => handlers.handleLanguageChange(lng))
      switcher.appendChild(btn)
    })

    container.prepend(switcher)
  }

  const renderForm = () => {
    const snap = snapshot(state)
    const { processState, errors, valid } = snap.form

    let form = document.querySelector('form')
    if (!form) {
      form = document.createElement('form')
      form.className = 'mb-3'
      container.appendChild(form)
    }

    // === СОЗДАЁМ ИЛИ НАХОДИМ ЭЛЕМЕНТЫ ===
    let label = form.querySelector('label')
    if (!label) {
      label = document.createElement('label')
      label.setAttribute('for', 'rss-url')
      label.className = 'form-label'
      form.appendChild(label)
    }
    label.textContent = i18nInstance.t('labels.rssUrl')

    let input = form.querySelector('input[name="url"]')
    if (!input) {
      input = document.createElement('input')
      input.type = 'url'
      input.id = 'rss-url'
      input.name = 'url'
      input.placeholder = 'https://example.com/rss'
      input.autocomplete = 'off'
      input.setAttribute('aria-label', 'url')
      form.appendChild(input)
    }
    input.value = snap.form.fields.url
    input.className = `form-control ${!valid && processState === 'error' ? 'is-invalid' : ''}`

    let invalidFeedback = form.querySelector('.invalid-feedback')
    if (!invalidFeedback) {
      invalidFeedback = document.createElement('div')
      invalidFeedback.className = 'invalid-feedback'
      form.appendChild(invalidFeedback)
    }

    // Показываем ошибку ТОЛЬКО в invalid-feedback для Bootstrap валидации
    if (errors.url && !valid && processState === 'error') {
      invalidFeedback.textContent = i18nInstance.t(errors.url)
      invalidFeedback.style.display = 'block'
    }
    else {
      invalidFeedback.textContent = ''
      invalidFeedback.style.display = 'none'
    }

    let feedback = form.querySelector('.feedback')
    if (!feedback) {
      feedback = document.createElement('div')
      feedback.className = 'feedback small mt-2'
      form.appendChild(feedback)
    }

    // ФОРМИРУЕМ СООБЩЕНИЕ - ТОЛЬКО для статуса (успех/ошибка сети)
    // НЕ показываем ошибки валидации здесь, чтобы не дублировать
    let message = ''
    if (processState === 'success') {
      message = i18nInstance.t('feedback.success')
      feedback.className = 'feedback small mt-2 text-success'
      feedback.textContent = message
    }
    else if (processState === 'error') {
      // Показываем сообщение об ошибке сети только если нет ошибки валидации
      if (!errors.url) {
        message = i18nInstance.t('feedback.error')
        feedback.className = 'feedback small mt-2 text-danger'
        feedback.textContent = message
      }
      else {
        // Если есть ошибка валидации, очищаем feedback (ошибка уже показана в invalid-feedback)
        feedback.className = 'feedback small mt-2'
        feedback.textContent = ''
      }
    }
    else {
      // Очищаем feedback в остальных случаях
      feedback.className = 'feedback small mt-2'
      feedback.textContent = ''
    }

    let button = form.querySelector('button[type="submit"]')
    if (!button) {
      button = document.createElement('button')
      button.type = 'submit'
      button.className = 'btn btn-primary'
      form.appendChild(button)
    }
    button.disabled = processState === 'sending'
    button.textContent = i18nInstance.t('buttons.add')

    // Убираем старый обработчик перед добавлением нового
    form.removeEventListener('submit', handlers.handleSubmit)
    form.addEventListener('submit', handlers.handleSubmit)
  }

  const renderFeeds = () => {
    const snap = snapshot(state)
    const feedsContainer = document.getElementById('feeds-container')
    if (!feedsContainer) return

    if (snap.feeds.length === 0) {
      feedsContainer.innerHTML = ''
      return
    }

    feedsContainer.innerHTML = `
      <h2>${i18nInstance.t('titles.feeds')}</h2>
      <div class="list-group mb-4">
        ${snap.feeds.map(feed => `
          <div class="list-group-item">
            <h3 class="mb-1">${escapeHtml(feed.title)}</h3>
            <p class="mb-1">${escapeHtml(feed.description)}</p>
            <small>${escapeHtml(feed.link)}</small>
          </div>
        `).join('')}
      </div>
    `
  }

  const renderPosts = () => {
    const snap = snapshot(state)
    const postsContainer = document.getElementById('posts-container')
    if (!postsContainer) return

    if (snap.posts.length === 0) {
      postsContainer.innerHTML = ''
      return
    }

    const readSet = new Set(snap.ui?.readPosts || [])

    postsContainer.innerHTML = `
      <h2>${i18nInstance.t('titles.posts')}</h2>
      <ul class="list-group">
        ${snap.posts.map((post) => {
          const isRead = readSet.has(post.id)
          return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <a href="${post.link}" 
                 class="text-decoration-none ${isRead ? 'fw-normal' : 'fw-bold'}"
                 target="_blank" 
                 rel="noopener noreferrer"
                 data-post-id="${post.id}">
                ${escapeHtml(post.title)}
              </a>
              <button 
                class="btn btn-sm btn-outline-secondary preview-btn" 
                data-post-id="${post.id}"
                data-post-title="${escapeHtml(post.title)}"
                data-post-description="${escapeHtml(post.description)}"
                data-post-link="${post.link}">
                ${i18nInstance.t('buttons.preview')}
              </button>
            </li>
          `
        }).join('')}
      </ul>
    `

    // Добавляем обработчики для кнопок предпросмотра
    document.querySelectorAll('.preview-btn').forEach((btn) => {
      // Убираем старые обработчики, чтобы не дублировать
      const newBtn = btn.cloneNode(true)
      btn.parentNode.replaceChild(newBtn, btn)

      newBtn.addEventListener('click', () => {
        const postId = newBtn.dataset.postId
        const post = snap.posts.find(p => p.id === postId)

        if (post) {
          // Отмечаем пост как прочитанный
          if (!readSet.has(postId)) {
            if (!state.ui.readPosts.includes(postId)) {
              state.ui.readPosts.push(postId)
            }
          }

          // Открываем модальное окно
          state.ui.modal.post = post
          state.ui.modal.isOpen = true
        }
      })
    })

    // Добавляем обработчики для ссылок (чтобы отмечать прочитанным при клике)
    document.querySelectorAll('.list-group-item a').forEach((link) => {
      // Убираем старые обработчики, чтобы не дублировать
      const newLink = link.cloneNode(true)
      link.parentNode.replaceChild(newLink, link)

      newLink.addEventListener('click', () => {
        const postId = newLink.dataset.postId
        if (postId && !readSet.has(postId)) {
          if (!state.ui.readPosts.includes(postId)) {
            state.ui.readPosts.push(postId)
          }
        }
      })
    })
  }

  const renderModal = () => {
    const snap = snapshot(state)
    let modalContainer = document.getElementById('modal-container')

    if (!modalContainer) {
      modalContainer = document.createElement('div')
      modalContainer.id = 'modal-container'
      document.body.appendChild(modalContainer)
    }

    if (!snap.ui?.modal?.isOpen || !snap.ui?.modal?.post) {
      modalContainer.innerHTML = ''
      return
    }

    const post = snap.ui.modal.post

    modalContainer.innerHTML = `
      <div class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${escapeHtml(post.title)}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p>${escapeHtml(post.description)}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                ${i18nInstance.t('buttons.close')}
              </button>
              <a href="${post.link}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
                ${i18nInstance.t('buttons.readFull')}
              </a>
            </div>
          </div>
        </div>
      </div>
    `

    const closeModal = () => {
      state.ui.modal.isOpen = false
      state.ui.modal.post = null
    }

    const closeButtons = modalContainer.querySelectorAll('[data-bs-dismiss="modal"]')
    const modalElement = modalContainer.querySelector('.modal')

    closeButtons.forEach(btn => btn.addEventListener('click', closeModal))
    modalElement?.addEventListener('click', (e) => {
      if (e.target === modalElement) closeModal()
    })
  }

  const render = () => {
    ensureContainers()
    renderLanguageSwitcher()
    renderForm()
    renderFeeds()
    renderPosts()
    renderModal()
  }

  subscribe(state, render)

  return {
    start: () => {
      render()
    },
  }
}
