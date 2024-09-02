import crypto from 'crypto';

/**
 * Hashes a string using SHA-1 algorithm.
 * @param {string} value - The value to be hashed.
 * @returns {string} - The hashed value.
 */

function hashSHA1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

export default hashSHA1;
