import { useEffect, useRef, useState } from 'react';
import { getUploadConfig, uploadDocument } from '../services/documentApi.js';

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [maxFileSizeBytes, setMaxFileSizeBytes] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    getUploadConfig()
      .then(({ maxFileSizeBytes: configuredLimit }) => {
        if (isCurrent && Number.isSafeInteger(configuredLimit) && configuredLimit > 0) {
          setMaxFileSizeBytes(configuredLimit);
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, []);

  function selectFile(event) {
    setFile(event.target.files?.[0] || null);
    setError('');
    setSuccess('');
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    if (maxFileSizeBytes && file.size > maxFileSizeBytes) {
      setError(`O arquivo deve ter no máximo ${formatFileSize(maxFileSizeBytes)}.`);
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      await uploadDocument(file);
      setSuccess(`${file.name} enviado com sucesso.`);
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      await onUploaded?.();
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível enviar o arquivo.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / ADICIONAR</p>
          <h2 id="upload-title">Enviar documento</h2>
        </div>
        <p className="section-hint">
          {maxFileSizeBytes
            ? `Tamanho máximo: ${formatFileSize(maxFileSizeBytes)}`
            : 'O limite de tamanho é validado pelo servidor'}
        </p>
      </div>

      <form className="upload-form" onSubmit={submitUpload}>
        <label className="file-picker" htmlFor="document-file">
          <span className="file-picker-label">ARQUIVO</span>
          <span className={file ? 'file-name selected' : 'file-name'}>
            {file?.name || 'Escolha um documento'}
          </span>
          <span className="file-picker-action">Procurar</span>
        </label>
        <input
          ref={inputRef}
          className="visually-hidden"
          id="document-file"
          name="file"
          type="file"
          onChange={selectFile}
        />
        <button className="button button-primary upload-submit" type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar arquivo'}
        </button>
      </form>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {success && <p className="form-message success-message" role="status">{success}</p>}
    </section>
  );
}