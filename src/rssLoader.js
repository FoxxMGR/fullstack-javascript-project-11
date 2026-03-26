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

    const contents = typeof data === 'string' ? data : data?.contents
    if (!contents) {
      throw new Error('errors.invalidRss')
    }

    return parseRSS(contents)
  }
  catch (error) {
    if (error instanceof Error && error.message === 'errors.invalidRss') {
      throw error
    }

    throw new Error('errors.network', { cause: error })
  }
}
