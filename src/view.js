import { subscribe, snapshot } from 'valtio/vanilla'

/**
 * @param {Object} state
 * @param {Object} i18nInstance
 */
export default (state, i18nInstance) => {
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
      btn.setAttribute('data-lng', lng)
      btn.className = `btn btn-sm ${state.lng === lng ? 'btn-primary' : 'btn-outline-primary'}`
      btn.textContent = i18nInstance.t(`languages.${lng}`)
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
      form.className = 'rss-form mb-3'
      container.appendChild(form)
    }
    form.noValidate = true
    form.classList.add('rss-form')

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
      input.id = 'rss-url'
      input.name = 'url'
      input.placeholder = 'https://example.com/rss'
      input.autocomplete = 'off'
      input.setAttribute('aria-label', 'url')
      form.appendChild(input)
    }
    input.type = 'text'
    input.value = snap.form.fields.url
    input.className = `form-control ${!valid && processState === 'error' ? 'is-invalid' : ''}`

    let feedback = form.querySelector('.feedback')
    if (!feedback) {
      feedback = document.createElement('div')
      feedback.className = 'feedback small mt-2'
      form.appendChild(feedback)
    }

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
  }

  const renderFeeds = () => {
    const snap = snapshot(state)
    const feedsContainer = document.getElementById('feeds-container')
    if (!feedsContainer) return

    if (snap.feeds.length === 0) {
      feedsContainer.innerHTML = ''
      return
    }

    feedsContainer.innerHTML = ''

    const card = document.createElement('div')
    card.className = 'card border-0'

    const cardBody = document.createElement('div')
    cardBody.className = 'card-body'

    const title = document.createElement('h2')
    title.className = 'card-title h4'
    title.textContent = i18nInstance.t('titles.feeds')

    cardBody.appendChild(title)
    card.appendChild(cardBody)

    const list = document.createElement('ul')
    list.className = 'list-group border-0 rounded-0'

    snap.feeds.forEach((feed) => {
      const item = document.createElement('li')
      item.className = 'list-group-item border-0 border-end-0'

      const feedTitle = document.createElement('h3')
      feedTitle.className = 'h6 m-0'
      feedTitle.textContent = feed.title

      const description = document.createElement('p')
      description.className = 'm-0 small text-black-50'
      description.textContent = feed.description

      item.appendChild(feedTitle)
      item.appendChild(description)
      list.appendChild(item)
    })

    feedsContainer.appendChild(card)
    feedsContainer.appendChild(list)
  }

  const renderPosts = () => {
    const snap = snapshot(state)
    const postsContainer = document.getElementById('posts-container')
    if (!postsContainer) return

    if (snap.posts.length === 0) {
      postsContainer.innerHTML = ''
      return
    }

    const readSet = state.ui.readPosts

    postsContainer.innerHTML = ''

    const card = document.createElement('div')
    card.className = 'card border-0'

    const cardBody = document.createElement('div')
    cardBody.className = 'card-body'

    const title = document.createElement('h2')
    title.className = 'card-title h4'
    title.textContent = i18nInstance.t('titles.posts')

    cardBody.appendChild(title)
    card.appendChild(cardBody)

    const list = document.createElement('ul')
    list.className = 'list-group border-0 rounded-0'

    snap.posts.forEach((post) => {
      const isRead = readSet.has(post.id)
      const item = document.createElement('li')
      item.className = 'list-group-item d-flex justify-content-between align-items-start border-0 border-end-0'

      const link = document.createElement('a')
      link.href = post.link
      link.className = isRead ? 'fw-normal link-secondary' : 'fw-bold'
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.dataset.postId = post.id
      link.textContent = post.title

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'btn btn-outline-primary btn-sm preview-btn'
      button.dataset.postId = post.id
      button.textContent = i18nInstance.t('buttons.preview')

      item.appendChild(link)
      item.appendChild(button)
      list.appendChild(item)
    })

    postsContainer.appendChild(card)
    postsContainer.appendChild(list)
  }

  const render = () => {
    ensureContainers()
    renderLanguageSwitcher()
    renderForm()
    renderFeeds()
    renderPosts()
  }

  // Раздельные подписки
  subscribe(state.form, () => {
    renderForm()
  })

  subscribe(state.feeds, () => {
    renderFeeds()
  })

  subscribe(state.posts, () => {
    renderPosts()
  })

  subscribe(state.ui.readPosts, () => {
    renderPosts()
  })

  subscribe(state, (ops) => {
    const lngChanged = ops.some(op => op[1] && op[1].includes('lng'))
    if (lngChanged) {
      renderLanguageSwitcher()
      renderForm()
      renderFeeds()
      renderPosts()
    }
  })

  const start = () => {
    render()
  }

  return {
    start,
  }
}
