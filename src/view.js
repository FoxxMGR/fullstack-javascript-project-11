

import { subscribe, snapshot } from 'valtio/vanilla';

/**
 * @param {Object} state
 * @param {Object} handlers
 * @param {Function} handlers.handleSubmit
 * @param {Function} handlers.handleLanguageChange
 * @param {Object} i18nInstance
 */
export default (state, handlers, i18nInstance) => {
  const container = document.querySelector('.container');
  if (!container) return { start: () => {} };

  const renderLanguageSwitcher = () => {
    const existingSwitcher = document.querySelector('.language-switcher');
    if (existingSwitcher) existingSwitcher.remove();

    const switcher = document.createElement('div');
    switcher.className = 'language-switcher btn-group mb-3';
    switcher.setAttribute('role', 'group');

    ['ru', 'en'].forEach((lng) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn btn-sm ${state.lng === lng ? 'btn-primary' : 'btn-outline-primary'}`;
      btn.textContent = i18nInstance.t(`languages.${lng}`);
      btn.addEventListener('click', () => handlers.handleLanguageChange(lng));
      switcher.appendChild(btn);
    });

    container.prepend(switcher);
  };

  const renderForm = () => {
    const snap = snapshot(state);
    const { processState, errors, valid } = snap.form;

    let form = document.querySelector('form');
    if (!form) {
      form = document.createElement('form');
      form.className = 'mb-3';
      container.appendChild(form);
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
    `;

    form.addEventListener('submit', handlers.handleSubmit);
  };

  const render = () => {
    renderLanguageSwitcher();
    renderForm();
  };

  subscribe(state, render);

  return {
    start: () => {
      render();
    },
  };
};