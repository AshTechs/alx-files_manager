import crypto from 'crypto';

export const hashSHA1 = (input) => crypto.createHash('sha1').update(input).digest('hex');
