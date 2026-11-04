const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const { maxFileSizeBytes, storageDirectory } = require('../config/storage');

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(req, file, callback) {
    callback(null, crypto.randomUUID());
  },
});

module.exports = multer({
  storage,
  limits: {
    fileSize: maxFileSizeBytes,
    files: 1,
    fields: 0,
    parts: 2,
    fieldNameSize: 100,
  },
}).single('file');