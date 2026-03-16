// @ts-check

/**
 * @typedef {Object} RSSFeed
 * @property {string} title
 * @property {string} description
 * @property {string} link
 */

/**
 * @typedef {Object} RSSItem
 * @property {string} title
 * @property {string} link
 * @property {string} description
 * @property {string} pubDate
 */

/**
 * @param {string} rssData
 * @returns {{ feed: RSSFeed, posts: RSSItem[] }}
 */
export default (rssData) => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(rssData, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('errors.invalidRss')
  }

  const feed = {
    title: doc.querySelector('channel > title')?.textContent || 'Без названия',
    description: doc.querySelector('channel > description')?.textContent || '',
    link: doc.querySelector('channel > link')?.textContent || '',
  }

  const items = Array.from(doc.querySelectorAll('item')).map(item => ({
    title: item.querySelector('title')?.textContent || 'Без названия',
    link: item.querySelector('link')?.textContent || '#',
    description: item.querySelector('description')?.textContent || '',
    pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
  }))

  return { feed, posts: items }
}
