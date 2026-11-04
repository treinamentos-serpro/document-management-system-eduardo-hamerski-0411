import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef(null);

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

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('O arquivo deve ter no máximo 10 MB.');
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
        <p className="section-hint">Tamanho máximo: 10 MB</p>
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