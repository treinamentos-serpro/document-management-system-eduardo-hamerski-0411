const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const originalStorageDirectory = process.env.STORAGE_DIR;
const testStorageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = testStorageDirectory;

const app = require('../src/app');

test('upload, listagem e download respeitam o proprietário', async () => {
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

    const document = await uploadResponse.json();
    assert.equal(document.originalName, 'teste.txt');
    assert.equal(document.owner, 'alice');
    assert.equal(document.size, Buffer.byteLength('conteudo de teste'));
    assert.equal('storageName' in document, false);

    const aliceDocuments = await fetch(`${baseUrl}/documents`, {
      headers: { 'x-user-id': 'alice' },
    });
    assert.deepEqual(await aliceDocuments.json(), [document]);

    const bobDocuments = await fetch(`${baseUrl}/documents`, {
      headers: { 'x-user-id': 'bob' },
    });
    assert.deepEqual(await bobDocuments.json(), []);

    const deniedDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: { 'x-user-id': 'bob' },
    });
    assert.equal(deniedDownload.status, 404);

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: { 'x-user-id': 'alice' },
    });
    assert.equal(downloadResponse.status, 200);
    assert.equal(await downloadResponse.text(), 'conteudo de teste');

    const missingFileResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: { 'x-user-id': 'alice' },
    });
    assert.equal(missingFileResponse.status, 400);
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
  }
});
