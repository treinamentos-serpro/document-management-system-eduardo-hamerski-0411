const crypto = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

async function createDocument(file, owner) {
  const document = {
    id: crypto.randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: file.mimetype,
    storageName: file.filename,
  };

  try {
    documentRepository.create(document);
  } catch (error) {
    await localFileRepository.remove(file.filename);
    throw error;
  }

  return toPublicDocument(document);
}

function listDocuments(owner) {
  return documentRepository
    .findByOwner(owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(toPublicDocument);
}

async function getDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    return null;
  }

  if (!await localFileRepository.exists(document.storageName)) {
    return null;
  }

  return {
    filePath: localFileRepository.getPath(document.storageName),
    originalName: document.originalName,
    mimeType: document.mimeType,
  };
}

async function discardUpload(storageName) {
  await localFileRepository.remove(storageName);
}

module.exports = { createDocument, discardUpload, getDownload, listDocuments };