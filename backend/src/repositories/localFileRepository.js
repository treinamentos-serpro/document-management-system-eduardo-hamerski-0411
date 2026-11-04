const fs = require('node:fs/promises');
const path = require('node:path');
const { storageDirectory } = require('../config/storage');

function getPath(storageName) {
  if (typeof storageName !== 'string' || path.basename(storageName) !== storageName) {
    throw new Error('Nome interno de arquivo inválido.');
  }

  const filePath = path.resolve(storageDirectory, storageName);
  const relativePath = path.relative(storageDirectory, filePath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)) {
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

async function getStorageUsage() {
  let entries;
  try {
    entries = await fs.readdir(storageDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0;
    }

    throw error;
  }

  const fileSizes = await Promise.all(entries
    .filter((entry) => entry.isFile())
    .map(async (entry) => {
      try {
        const file = await fs.lstat(path.join(storageDirectory, entry.name));
        return file.isFile() && !file.isSymbolicLink() ? file.size : 0;
      } catch (error) {
        if (error.code === 'ENOENT') {
          return 0;
        }

        throw error;
      }
    }));

  return fileSizes.reduce((total, size) => total + size, 0);
}

module.exports = { exists, getPath, getStorageUsage, remove };