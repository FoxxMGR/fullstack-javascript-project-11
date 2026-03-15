import { subscribe, snapshot } from 'valtio/vanilla'

export default (state, handlers) => {
  const elements = {
    form: document.querySelector('form'),
    input: document.querySelector('input[name="url"]'),
    submitButton: document.querySelector('button[type="submit"]'),
    feedback: document.querySelector('.feedback'),
  }

  const render = () => {
    const snap = snapshot(state)
    const { processState, errors, valid } = snap.form

    // Обработка состояния процесса
    switch (processState) {
      case 'sending':
        elements.submitButton.disabled = true
        break
      case 'success':
        elements.submitButton.disabled = false
        elements.form.reset()
        elements.input.focus()
        elements.input.classList.remove('is-invalid')
        elements.feedback.textContent = 'RSS успешно загружен'
        elements.feedback.classList.remove('text-danger')
        elements.feedback.classList.add('text-success')
        break
      case 'error':
        elements.submitButton.disabled = false
        if (!valid) {
          elements.input.classList.add('is-invalid')
          elements.feedback.textContent = errors.url
          elements.feedback.classList.remove('text-success')
          elements.feedback.classList.add('text-danger')
        }
        break
      default:
        elements.submitButton.disabled = false
        elements.input.classList.remove('is-invalid')
        elements.feedback.textContent = ''
        elements.feedback.classList.remove('text-danger', 'text-success')
    }
  }

  // Подписка на изменения состояния
  subscribe(state.form, render)

  // Подписка на форму
  elements.form.addEventListener('submit', handlers.handleSubmit)

  return {
    start: () => {
      render()
    },
  }
}
