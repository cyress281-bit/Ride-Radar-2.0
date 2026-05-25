import { Filter } from 'bad-words';

const filter = new Filter();

/**
 * Check if text contains profanity.
 * @param {string} text
 * @returns {boolean}
 */
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  try {
    return filter.isProfane(text);
  } catch {
    return false;
  }
}

/**
 * Clean profanity from text (replaces with asterisks).
 * @param {string} text
 * @returns {string}
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return filter.clean(text);
  } catch {
    return text;
  }
}
