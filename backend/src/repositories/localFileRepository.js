const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDirectory } = require('../config/storage');

function getPath(storageName) {
  const filePath = path.resolve(storageDirectory, storageName);
  if (!filePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error('Nome interno de arquivo inválido.');
  }

  return filePath;
}

async function remove(storageName) {
  try {
    await fs.unlink(getPath(storageName));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function exists(storageName) {
  try {
    const file = await fs.stat(getPath(storageName));
    return file.isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

module.exports = { exists, getPath, remove };