import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {
      name, type, parentId = '0', isPublic = false, data,
    } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const { db } = dbClient;

    if (parentId !== '0') {
      const parentFile = await db.collection('files').findOne({ _id: new db.ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId: new db.ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === '0' ? '0' : new db.ObjectId(parentId),
    };

    if (type === 'folder') {
      const result = await db.collection('files').insertOne(newFile);
      newFile.id = result.insertedId;
      return res.status(201).json(newFile);
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = uuidv4();
    const localPath = path.join(folderPath, fileName);

    try {
      await mkdir(folderPath, { recursive: true });
      await writeFile(localPath, Buffer.from(data, 'base64'));

      newFile.localPath = localPath;
      const result = await db.collection('files').insertOne(newFile);
      newFile.id = result.insertedId;
      return res.status(201).json(newFile);
    } catch (error) {
      console.error('Error saving file:', error);
      return res.status(500).json({ error: 'Cannot save the file' });
    }
  }
}

export default FilesController;
