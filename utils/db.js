import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.db = null;

    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
        console.log('Connected to MongoDB');
      })
      .catch((err) => {
        console.error(`Failed to connect to MongoDB: ${err.message}`);
      });
  }

  isAlive() {
    return this.db !== null;
  }

  async nbUsers() {
    if (this.db) {
      return this.db.collection('users').countDocuments();
    }
    throw new Error('Not connected to MongoDB');
  }

  async nbFiles() {
    if (this.db) {
      return this.db.collection('files').countDocuments();
    }
    throw new Error('Not connected to MongoDB');
  }
}

const dbClient = new DBClient();
export default dbClient;
