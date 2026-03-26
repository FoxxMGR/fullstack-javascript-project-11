import { subscribe, snapshot } from 'valtio/vanilla'

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
    switcher.setAttribute('role', 'group');

    ['ru', 'en'].forEach((lng) => {
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
    invalidFeedback.textContent = errors.url ? i18nInstance.t(errors.url) : ''

    let feedback = form.querySelector('.feedback')
    if (!feedback) {
      feedback = document.createElement('div')
      feedback.className = 'feedback small mt-2'
      form.appendChild(feedback)
    }

    // ФОРМИРУЕМ СООБЩЕНИЕ
    let message = ''
    if (processState === 'success') {
      message = i18nInstance.t('feedback.success')
    }
    else if (processState === 'error') {
      if (errors.url) {
        message = i18nInstance.t(errors.url)
      }
      else {
        message = i18nInstance.t('feedback.error')
      }
    }

    feedback.className = `feedback small mt-2 ${processState === 'success' ? 'text-success' : processState === 'error' ? 'text-danger' : ''}`
    feedback.textContent = message

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
            <h5 class="mb-1">${feed.title}</h5>
            <p class="mb-1">${feed.description}</p>
            <small>${feed.link}</small>
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
      <div class="list-group">
        ${snap.posts.map((post) => {
          const isRead = readSet.has(post.id)
          return `
            <div class="list-group-item d-flex justify-content-between align-items-center">
              <a href="${post.link}" 
                 class="text-decoration-none ${isRead ? 'fw-normal' : 'fw-bold'}"
                 target="_blank" 
                 rel="noopener noreferrer"
                 data-post-id="${post.id}">
                ${post.title}
              </a>
              <button 
                class="btn btn-sm btn-outline-secondary preview-btn" 
                data-post-id="${post.id}"
                data-post-title="${post.title}"
                data-post-description="${post.description}"
                data-post-link="${post.link}">
                ${i18nInstance.t('buttons.preview')}
              </button>
            </div>
          `
        }).join('')}
      </div>
    `

    // Добавляем обработчики для кнопок предпросмотра
    document.querySelectorAll('.preview-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const postId = btn.dataset.postId
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
      link.addEventListener('click', () => {
        const postId = link.dataset.postId
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
    const modalContainer = document.getElementById('modal-container')

    if (!modalContainer) {
      const containerDiv = document.createElement('div')
      containerDiv.id = 'modal-container'
      document.body.appendChild(containerDiv)
    }

    const containerDiv = document.getElementById('modal-container')

    if (!snap.ui?.modal?.isOpen || !snap.ui?.modal?.post) {
      if (containerDiv) containerDiv.innerHTML = ''
      return
    }

    const post = snap.ui.modal.post

    containerDiv.innerHTML = `
      <div class="modal fade show" style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${i18nInstance.t('modal.goal')}</h5>
              <button type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p>${post.description}</p>
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

    const closeBtn = containerDiv.querySelector('.btn-close')
    const closeSecondaryBtn = containerDiv.querySelector('.btn-secondary')

    const closeModal = () => {
      state.ui.modal.isOpen = false
      state.ui.modal.post = null
    }

    closeBtn?.addEventListener('click', closeModal)
    closeSecondaryBtn?.addEventListener('click', closeModal)

    containerDiv.querySelector('.modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        closeModal()
      }
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
