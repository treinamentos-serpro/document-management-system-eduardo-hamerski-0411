const API_PREFIX = '/api';
let sessionRequest;

async function throwResponseError(response) {
  let message = 'Não foi possível concluir a solicitação.';

  try {
    const body = await response.json();
    message = body.error?.message || message;
  } catch {
    // Respostas sem JSON usam a mensagem padrão.
  }

  throw new Error(message);
}

function ensureSession() {
  if (!sessionRequest) {
    sessionRequest = fetch(`${API_PREFIX}/health`, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          return throwResponseError(response);
        }
        return undefined;
      })
      .catch((error) => {
        sessionRequest = undefined;
        throw error;
      });
  }

  return sessionRequest;
}

async function apiRequest(path, options) {
  await ensureSession();
  const response = await fetch(`${API_PREFIX}${path}`, {
    credentials: 'same-origin',
    ...options,
  });
  if (!response.ok) {
    await throwResponseError(response);
  }

  return response;
}

export async function listDocuments() {
  const response = await apiRequest('/documents');
  return response.json();
}

export async function getUploadConfig() {
  const response = await apiRequest('/upload/config');
  return response.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiRequest('/upload', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

export async function downloadDocument(id) {
  const response = await apiRequest(`/documents/${encodeURIComponent(id)}/download`);
  return response.blob();
}