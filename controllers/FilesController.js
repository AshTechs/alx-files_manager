const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const db = require('../db.js');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const postUpload = async (req, res) => {
  const {
    name, type, parentId = 0, isPublic = false, data,
  } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }

  if (!type || !['folder', 'file', 'image'].includes(type)) {
    return res.status(400).json({ error: 'Missing type' });
  }

  if (type !== 'folder' && !data) {
    return res.status(400).json({ error: 'Missing data' });
  }

  if (parentId !== 0) {
    const parentFile = await db.getFileById(parentId);
    if (!parentFile) {
      return res.status(400).json({ error: 'Parent not found' });
    }
    if (parentFile.type !== 'folder') {
      return res.status(400).json({ error: 'Parent is not a folder' });
    }
  }

  const newFile = {
    userId,
    name,
    type,
    isPublic,
    parentId,
  };

  if (type === 'folder') {
    const createdFile = await db.createFile(newFile);
    return res.status(201).json(createdFile);
  }

  const filePath = path.join(FOLDER_PATH, uuidv4());
  fs.mkdirSync(FOLDER_PATH, { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

  newFile.localPath = filePath;
  const createdFile = await db.createFile(newFile);
  return res.status(201).json(createdFile);
};

module.exports = {
  postUpload,
};
