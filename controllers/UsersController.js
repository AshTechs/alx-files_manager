import crypto from 'crypto';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const usersCollection = dbClient.db.collection('users');
      const existingUser = await usersCollection.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
      const result = await usersCollection.insertOne({ email, password: hashedPassword });

      const newUser = {
        id: result.insertedId.toString(),
        email,
      };
      return res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getMe(req, res) {
    const token = req.get('X-Token');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const redisKey = `auth_${token}`;
      const userId = await redisClient.get(redisKey);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const usersCollection = dbClient.db.collection('users');
      const user = await usersCollection.findOne({ _id: new dbClient.ObjectId(userId) });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { email, _id } = user;
      return res.status(200).json({ id: _id.toString(), email });
    } catch (error) {
      console.error('Error retrieving user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UsersController;
