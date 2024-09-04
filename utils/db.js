const { MongoClient, ObjectId } = require('mongodb');

class DBClient {
  constructor() {
    this.client = null;
    this.db = null;
    this.connect();
  }

  async connect() {
    try {
      this.client = new MongoClient(process.env.DB_HOST || 'mongodb://localhost:27017', {
        useUnifiedTopology: true,
      });
      await this.client.connect();
      this.db = this.client.db('files_manager');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }

  async findUserById(id) {
    return this.db.collection('users').findOne({ _id: new ObjectId(id) });
  }

  async findFileById(id) {
    return this.db.collection('files').findOne({ _id: new ObjectId(id) });
  }

  async insertFile(fileData) {
    return this.db.collection('files').insertOne(fileData);
  }
}

module.exports = new DBClient();
