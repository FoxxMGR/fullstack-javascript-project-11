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
      feedsDiv.className = 'mt-4'
      container.appendChild(feedsDiv)
    }

    if (!document.getElementById('posts-container')) {
      const postsDiv = document.createElement('div')
      postsDiv.id = 'posts-container'
      postsDiv.className = 'mt-4'
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

    form.innerHTML = `
      <div class="mb-3">
        <label for="rss-url" class="form-label">${i18nInstance.t('labels.rssUrl')}</label>
        <input 
          type="url" 
          class="form-control ${!valid && processState === 'error' ? 'is-invalid' : ''}" 
          id="rss-url"
          name="url" 
          placeholder="https://example.com/rss"
          value="${snap.form.fields.url}"
        >
        <div class="invalid-feedback">${errors.url ? i18nInstance.t(errors.url) : ''}</div>
        <div class="feedback small mt-2 ${processState === 'success' ? 'text-success' : processState === 'error' ? 'text-danger' : ''}">
          ${processState === 'success' ? i18nInstance.t('feedback.success') : ''}
          ${processState === 'error' && !errors.url ? i18nInstance.t('feedback.error') : ''}
        </div>
      </div>
      <button type="submit" class="btn btn-primary" ${processState === 'sending' ? 'disabled' : ''}>
        ${i18nInstance.t('buttons.add')}
      </button>
    `

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

    postsContainer.innerHTML = `
      <h2>${i18nInstance.t('titles.posts')}</h2>
      <div class="list-group">
        ${snap.posts.map(post => `
          <a href="${post.link}" 
             class="list-group-item list-group-item-action" 
             target="_blank" 
             rel="noopener noreferrer">
            ${post.title}
          </a>
        `).join('')}
      </div>
    `
  }

  const render = () => {
    ensureContainers() // создаём контейнеры один раз
    renderLanguageSwitcher()
    renderForm()
    renderFeeds()
    renderPosts()
  }

  subscribe(state, render)

  return {
    start: () => {
      render()
    },
  }
}
