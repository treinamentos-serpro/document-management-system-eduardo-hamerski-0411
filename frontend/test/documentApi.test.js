import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  downloadDocument,
  getUploadConfig,
  listDocuments,
  uploadDocument,
} from '../src/services/documentApi.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('usa o prefixo /api e envia credenciais same-origin', async () => {
  const requests = [];
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requests.push(url);
    if (url === '/api/health') {
      return Response.json({ status: 'ok' });
    }
    if (url === '/api/upload/config') {
      requestOptions = options;
      return Response.json({ maxFileSizeBytes: 4096 });
    }
    requestUrl = url;
    requestOptions = options;
    return Response.json([]);
  };

  const [documents, uploadConfig] = await Promise.all([listDocuments(), getUploadConfig()]);
  assert.deepEqual(documents, []);
  assert.deepEqual(uploadConfig, { maxFileSizeBytes: 4096 });
  assert.ok(requests.includes('/api/documents'));
  assert.equal(requests.filter((url) => url === '/api/health').length, 1);
  assert.equal(requestOptions.credentials, 'same-origin');
});

test('busca o limite de upload informado pelo backend', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/upload/config');
    return Response.json({ maxFileSizeBytes: 4096 });
  };

  assert.deepEqual(await getUploadConfig(), { maxFileSizeBytes: 4096 });
});

test('envia arquivo multipart no campo file', async () => {
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/upload');
    requestOptions = options;
    return Response.json({ id: 'document-1' }, { status: 201 });
  };

  const file = new Blob(['conteudo']);
  assert.deepEqual(await uploadDocument(file), { id: 'document-1' });
  assert.equal(requestOptions.body.get('file').size, file.size);
  assert.equal(requestOptions.credentials, 'same-origin');
});

test('propaga mensagem de erro da API', async () => {
  globalThis.fetch = async () => Response.json(
    { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' } },
    { status: 404 },
  );

  await assert.rejects(
    downloadDocument('missing/id'),
    { message: 'Documento não encontrado.' },
  );
});