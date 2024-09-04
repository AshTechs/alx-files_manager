const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.get = promisify(this.client.get).bind(this);
    this.set = promisify(this.client.set).bind(this);
    this.del = promisify(this.client.del).bind(this);
  }

  isAlive() {
    return this.client.connected;
  }

  async getKey(key) {
    return this.get(key);
  }

  async setKey(key, value, duration = 86400) {
    await this.set(key, value, 'EX', duration);
  }

  async deleteKey(key) {
    return this.del(key);
  }
}

module.exports = new RedisClient();
