const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    
    this.getAsync = promisify(this.client.get).bind(this);
    this.setAsync = promisify(this.client.set).bind(this);
    this.delAsync = promisify(this.client.del).bind(this);

    this.client.on('error', (err) => {
      console.error('Redis client not connected to the server:', err.message);
    });

    this.client.on('connect', () => {
      console.log('Redis client connected to the server');
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    try {
      const value = await this.getAsync(key);
      return value;
    } catch (err) {
      console.error('Error getting key from Redis:', err.message);
      return null;
    }
  }

  async set(key, value, duration = 86400) {
    try {
      await this.setAsync(key, value, 'EX', duration);
    } catch (err) {
      console.error('Error setting key in Redis:', err.message);
    }
  }

  async del(key) {
    try {
      await this.delAsync(key);
    } catch (err) {
      console.error('Error deleting key from Redis:', err.message);
    }
  }
}

module.exports = new RedisClient();
