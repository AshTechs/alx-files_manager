const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static async getStatus(req, res) {
    const redisStatus = redisClient.isAlive();
    const dbStatus = dbClient.client.isConnected();

    res.status(200).json({ redis: redisStatus, db: dbStatus });
  }

  static async getStats(req, res) {
    try {
      const usersCount = await dbClient.db.collection('users').countDocuments();
      const filesCount = await dbClient.db.collection('files').countDocuments();

      res.status(200).json({ users: usersCount, files: filesCount });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Unable to fetch stats' });
    }
  }
}

module.exports = AppController;
