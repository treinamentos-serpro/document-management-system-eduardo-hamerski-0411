const path = require('node:path');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);
const configuredMaxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES);
const maxFileSizeBytes = Number.isSafeInteger(configuredMaxFileSize)
  && configuredMaxFileSize > 0
  ? configuredMaxFileSize
  : 10 * 1024 * 1024;
const configuredMaxStorageSize = Number(process.env.MAX_STORAGE_BYTES);
const maxStorageBytes = Number.isSafeInteger(configuredMaxStorageSize)
  && configuredMaxStorageSize > 0
  ? configuredMaxStorageSize
  : 1024 * 1024 * 1024;

module.exports = { maxFileSizeBytes, maxStorageBytes, storageDirectory };