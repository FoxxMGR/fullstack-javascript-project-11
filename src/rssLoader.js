import axios from 'axios'
import parseRSS from './rssParser.js'

/**
 * @param {string} url
 * @returns {Promise<{ feed: Object, posts: Object[] }>}
 */
export default async (url) => {
  // Используем прокси All Origins (с отключенным кешем)
  const proxyUrl = `https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`

  try {
    const response = await axios.get(proxyUrl)
    const data = response.data

    // Проверяем, что данные получены и содержат контент
    if (!data || !data.contents) {
      throw new Error('errors.network')
    }

    try {
      return parseRSS(data.contents)
    }
    catch (parseError) {
      // Если парсинг не удался
      throw new Error('errors.invalidRss')
    }
  }
  catch (error) {
    // Если это наша кастомная ошибка - пробрасываем её
    if (error.message === 'errors.network' || error.message === 'errors.invalidRss') {
      throw error
    }
    // Иначе - ошибка сети
    throw new Error('errors.network')
  }
}
