// utils/db.js
import { MongoClient } from 'mongodb';

const {
  DB_HOST = 'localhost',
  DB_PORT = 27017,
  DB_DATABASE = 'files_manager',
} = process.env;

class DBClient {
  constructor() {
    const url = `mongodb://${DB_HOST}:${DB_PORT}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect()
      .then(() => console.log('Connected successfully to MongoDB'))
      .catch((err) => console.error(`MongoDB connection error: ${err.message}`));
    this.db = this.client.db(DB_DATABASE);
  }

  isAlive() {
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    const usersCollection = this.db.collection('users');
    return usersCollection.countDocuments();
  }

  async nbFiles() {
    const filesCollection = this.db.collection('files');
    return filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
