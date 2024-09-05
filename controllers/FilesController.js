import { ObjectId } from 'mongodb';
import { env } from 'process';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mime from 'mime-types';
import fs from 'fs';
import Queue from 'bull';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fileQueue = new Queue('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

class FilesController {
  static async postUpload(req, res) {
    const user = await FilesController.retrieveUserBasedOnToken(req);
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const acceptedTypes = ['folder', 'file', 'image'];
    const {
      name,
      type,
      parentId = '0',
      isPublic = false,
      data,
    } = req.body;

    if (!name) {
      res.status(400).send({ error: 'Missing name' });
      return;
    }

    if (!type || !acceptedTypes.includes(type)) {
      res.status(400).send({ error: 'Missing type' });
      return;
    }

    if (!data && type !== 'folder') {
      res.status(400).send({ error: 'Missing data' });
      return;
    }

    let parent = null;
    if (parentId !== '0') {
      const files = dbClient.db.collection('files');
      parent = await files.findOne({ _id: ObjectId(parentId) });
      if (!parent) {
        res.status(400).send({ error: 'Parent not found' });
        return;
      }
      if (parent.type !== 'folder') {
        res.status(400).send({ error: 'Parent is not a folder' });
        return;
      }
    }

    const newFile = {
      name,
      type,
      parentId: parentId === '0' ? 0 : ObjectId(parentId),
      isPublic,
      userId: user._id.toString(),
    };

    if (type === 'folder') {
      const files = dbClient.db.collection('files');
      const result = await files.insertOne(newFile);
      newFile.id = result.insertedId;
      delete newFile._id;
      res.setHeader('Content-Type', 'application/json');
      res.status(201).send(newFile);
    } else {
      const storeFolderPath = env.FOLDER_PATH || '/tmp/files_manager';
      const fileName = uuidv4();
      const filePath = path.join(storeFolderPath, fileName);

      newFile.localPath = filePath;
      const decodedData = Buffer.from(data, 'base64');

      const pathExists = await FilesController.pathExists(storeFolderPath);
      if (!pathExists) {
        await fs.promises.mkdir(storeFolderPath, { recursive: true });
      }
      FilesController.writeToFile(res, filePath, decodedData, newFile);
    }
  }

  static async writeToFile(res, filePath, data, newFile) {
    await fs.promises.writeFile(filePath, data);

    const files = dbClient.db.collection('files');
    const result = await files.insertOne(newFile);
    const writeResp = {
      ...newFile,
      id: result.insertedId,
    };
    delete writeResp._id;
    delete writeResp.localPath;

    if (writeResp.type === 'image') {
      fileQueue.add({ userId: writeResp.userId, fileId: writeResp.id });
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(201).send(writeResp);
  }

  static async retrieveUserBasedOnToken(req) {
    const authToken = req.header('X-Token') || null;
    if (!authToken) return null;
    const token = `auth_${authToken}`;
    const user = await redisClient.get(token);
    if (!user) return null;
    const users = dbClient.db.collection('users');
    const userDoc = await users.findOne({ _id: ObjectId(user) });
    if (!userDoc) return null;
    return userDoc;
  }

  static async getShow(req, res) {
    const { id } = req.params;
    const user = await FilesController.retrieveUserBasedOnToken(req);

    const files = dbClient.db.collection('files');
    const file = await files.findOne( _id ObjectId(id), userId: user?_id || null );

    if (!file || (!file.isPublic && !user)) {
      res.status(404).send({ error: 'Not found' });
    } else {
      file.id = file._id;
      delete file._id;
      delete file.localPath;
      res.status(200).send(file);
    }
  }

  static async getIndex(req, res) {
    const user = await FilesController.retrieveUserBasedOnToken(req);

    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const { parentId = 0, page = 0 } = req.query;
    const files = dbClient.db.collection('files');

    const pageSize = 20;
    const skip = page * pageSize;

    const query = {
      userId: user._id.toString(),
      parentId,
    };

    const result = await files.aggregate([
      { $match: query },
      { $skip: skip },
      { $limit: pageSize },
    ]).toArray();

    const finalResult = result.map((file) => {
      const newFile = { ...file, id: file._id };
      delete newFile._id;
      delete newFile.localPath;
      return newFile;
    });

    res.status(200).send(finalResult);
  }

  static putPublish(req, res) {
    FilesController.pubSubHelper(req, res, true);
  }

  static putUnpublish(req, res) {
    FilesController.pubSubHelper(req, res, false);
  }

  static async pubSubHelper(req, res, updateValue) {
    const { id } = req.params;
    const user = await FilesController.retrieveUserBasedOnToken(req);
    if (!user) {
      res.status(401).send({ error: 'Unauthorized' });
      return;
    }
    const files = dbClient.db.collection('files');
    const file = await files.findOne({ userId: user._id, _id: ObjectId(id) });
    if (!file) {
      res.status(404).send({ error: 'Not found' });
    } else {
      const update = { $set: { isPublic: updateValue } };
      await files.updateOne({ _id: ObjectId(id) }, update);
      const updatedFile = await files.findOne({ _id: ObjectId(id) });
      updatedFile.id = updatedFile._id;
      delete updatedFile._id;
      delete updatedFile.localPath;
      res.status(200).send(updatedFile);
    }
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query;

    if (!id) {
      res.status(404).send({ error: 'Not found' });
      return;
    }

    const user = await FilesController.retrieveUserBasedOnToken(req);
    const files = dbClient.db.collection('files');
    const file = await files.findOne({ _id: ObjectId(id) });

    if (!file || (!file.isPublic && !user) || (file.isPublic === false && user && file.userId !== user._id.toString())) {
      res.status(404).send({ error: 'Not found' });
      return;
    }

    if (file.type === 'folder') {
      res.status(400).send({ error: 'A folder doesn\'t have content' });
      return;
    }

    const lookUpPath = size && file.type === 'image'
      ? `${file.localPath}_${size}`
      : file.localPath;

    if (!(await FilesController.pathExists(lookUpPath))) {
      res.status(404).send({ error: 'Not found' });
    } else {
      res.set('Content-Type', mime.lookup(file.name));
      res.status(200).sendFile(lookUpPath);
    }
  }

  static pathExists(path) {
    return new Promise((resolve) => {
      fs.access(path, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    });
  }
}

export default FilesController;
