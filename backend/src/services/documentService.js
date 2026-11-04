const crypto = require('node:crypto');
const { createDocumentRepository } = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');
const { maxFileSizeBytes, maxStorageBytes } = require('../config/storage');

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function createDocumentService({
  documentRepository,
  fileRepository,
  storageLimitBytes = maxStorageBytes,
}) {
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
      const currentStorageUsage = await fileRepository.getStorageUsage();
      if (currentStorageUsage > storageLimitBytes) {
        const error = new Error('O armazenamento local atingiu o limite configurado.');
        error.code = 'STORAGE_QUOTA_EXCEEDED';
        throw error;
      }

      documentRepository.create(document);
    } catch (error) {
      await fileRepository.remove(file.filename);
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

    if (!await fileRepository.exists(document.storageName)) {
      return null;
    }

    return {
      filePath: fileRepository.getPath(document.storageName),
      originalName: document.originalName,
    };
  }

  async function discardUpload(storageName) {
    await fileRepository.remove(storageName);
  }

  function getUploadConfig() {
    return { maxFileSizeBytes };
  }

  return { createDocument, discardUpload, getDownload, getUploadConfig, listDocuments };
}

const documentService = createDocumentService({
  documentRepository: createDocumentRepository(),
  fileRepository: localFileRepository,
  storageLimitBytes: maxStorageBytes,
});

module.exports = { ...documentService, createDocumentService };