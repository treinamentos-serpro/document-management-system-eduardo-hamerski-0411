const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const originalStorageDirectory = process.env.STORAGE_DIR;
const originalMaxFileSize = process.env.MAX_FILE_SIZE_BYTES;
const originalMaxStorageSize = process.env.MAX_STORAGE_BYTES;
const originalSessionSecret = process.env.SESSION_SECRET;
const testStorageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = testStorageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '64';
process.env.MAX_STORAGE_BYTES = '32';
process.env.SESSION_SECRET = 'test-session-secret-with-at-least-32-bytes';

const app = require('../src/app');
const { getPath } = require('../src/repositories/localFileRepository');

function getSessionCookie(response) {
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'a resposta deve emitir uma sessão');
  return setCookie.split(';')[0];
}

test('sessões isolam documentos e uploads respeitam os limites configurados', async () => {
  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const form = new FormData();
    form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'teste.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'x-user-id': 'alice' },
      body: form,
    });
    assert.equal(uploadResponse.status, 201);
    const ownerCookie = getSessionCookie(uploadResponse);
    assert.match(uploadResponse.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);

    const document = await uploadResponse.json();
    assert.equal(document.originalName, 'teste.txt');
    assert.notEqual(document.owner, 'alice');
    assert.equal(document.size, Buffer.byteLength('conteudo de teste'));
    assert.equal('storageName' in document, false);

    const aliceDocuments = await fetch(`${baseUrl}/documents`, {
      headers: { Cookie: ownerCookie, 'x-user-id': 'somebody-else' },
    });
    assert.deepEqual(await aliceDocuments.json(), [document]);

    const bobDocuments = await fetch(`${baseUrl}/documents`, {
      headers: { 'x-user-id': 'alice' },
    });
    assert.deepEqual(await bobDocuments.json(), []);
    const bobCookie = getSessionCookie(bobDocuments);

    const ownerSignature = ownerCookie.split('=')[1].split('.')[1];
    const tamperedDocuments = await fetch(`${baseUrl}/documents`, {
      headers: { Cookie: `dms_session=attacker.${ownerSignature}` },
    });
    assert.deepEqual(await tamperedDocuments.json(), []);

    const deniedDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: { Cookie: bobCookie },
    });
    assert.equal(deniedDownload.status, 404);

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: { Cookie: ownerCookie },
    });
    assert.equal(downloadResponse.status, 200);
    assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
    assert.equal(downloadResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await downloadResponse.text(), 'conteudo de teste');

    const missingFileResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
    });
    assert.equal(missingFileResponse.status, 400);

    const uploadConfigResponse = await fetch(`${baseUrl}/upload/config`);
    assert.deepEqual(await uploadConfigResponse.json(), { maxFileSizeBytes: 64 });

    const overQuotaForm = new FormData();
    overQuotaForm.append('file', new Blob(['x'.repeat(20)]), 'cota.txt');
    const overQuotaResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: overQuotaForm,
    });
    assert.equal(overQuotaResponse.status, 507);

    const largeForm = new FormData();
    largeForm.append('file', new Blob(['x'.repeat(65)]), 'grande.txt');
    const largeResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: largeForm,
    });
    assert.equal(largeResponse.status, 413);

    const extraFieldForm = new FormData();
    extraFieldForm.append('file', new Blob(['arquivo']), 'arquivo.txt');
    extraFieldForm.append('extra', 'campo não permitido');
    const extraFieldResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: extraFieldForm,
    });
    assert.equal(extraFieldResponse.status, 400);

    const emptyForm = new FormData();
    emptyForm.append('file', new Blob([]), 'vazio.txt');
    const emptyResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: emptyForm,
    });
    assert.equal(emptyResponse.status, 400);

    assert.throws(() => getPath('../fora-do-storage'), /Nome interno de arquivo inválido/);
    assert.equal(fs.readdirSync(testStorageDirectory).length, 1);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(testStorageDirectory, { recursive: true, force: true });

    if (originalStorageDirectory === undefined) {
      delete process.env.STORAGE_DIR;
    } else {
      process.env.STORAGE_DIR = originalStorageDirectory;
    }

    if (originalMaxFileSize === undefined) {
      delete process.env.MAX_FILE_SIZE_BYTES;
    } else {
      process.env.MAX_FILE_SIZE_BYTES = originalMaxFileSize;
    }

    if (originalMaxStorageSize === undefined) {
      delete process.env.MAX_STORAGE_BYTES;
    } else {
      process.env.MAX_STORAGE_BYTES = originalMaxStorageSize;
    }

    if (originalSessionSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSessionSecret;
    }
  }
});
