const documentService = require('../services/documentService');

function getOwner(req) {
  return String(req.user.id);
}

async function upload(req, res) {
  if (!req.file || req.file.size === 0) {
    if (req.file) {
      await documentService.discardUpload(req.file.filename);
    }

    return res.status(400).json({
      error: { code: 'INVALID_FILE', message: 'Envie um arquivo não vazio no campo file.' },
    });
  }

  const document = await documentService.createDocument(req.file, getOwner(req));
  return res.status(201).json(document);
}

function list(req, res) {
  return res.json(documentService.listDocuments(getOwner(req)));
}

function uploadConfig(req, res) {
  return res.json(documentService.getUploadConfig());
}

async function download(req, res) {
  const file = await documentService.getDownload(req.params.id, getOwner(req));
  if (!file) {
    return res.status(404).json({
      error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
    });
  }

  res.type('application/octet-stream');
  res.set('X-Content-Type-Options', 'nosniff');
  return res.download(file.filePath, file.originalName, (error) => {
    if (!error) {
      return;
    }

    if (res.headersSent) {
      return res.destroy(error);
    }

    const notFound = error.code === 'ENOENT';
    return res.status(notFound ? 404 : 500).json({
      error: {
        code: notFound ? 'DOCUMENT_NOT_FOUND' : 'DOWNLOAD_FAILED',
        message: notFound ? 'Documento não encontrado.' : 'Não foi possível baixar o documento.',
      },
    });
  });
}

module.exports = { download, list, upload, uploadConfig };