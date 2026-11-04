const API_PREFIX = '/api';

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

export async function listDocuments() {
  const response = await fetch(`${API_PREFIX}/documents`);
  if (!response.ok) {
    await throwResponseError(response);
  }

  return response.json();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    await throwResponseError(response);
  }

  return response.json();
}

export async function downloadDocument(id) {
  const response = await fetch(`${API_PREFIX}/documents/${encodeURIComponent(id)}/download`);
  if (!response.ok) {
    await throwResponseError(response);
  }

  return response.blob();
}