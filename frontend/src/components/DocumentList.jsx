import DownloadButton from './DownloadButton.jsx';

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function DocumentList({
  documents,
  isLoading,
  error,
  onRetry,
  onRefresh,
}) {
  return (
    <section className="documents-section" aria-labelledby="documents-title">
      <div className="section-heading documents-heading">
        <div>
          <p className="eyebrow">02 / ARQUIVO</p>
          <h2 id="documents-title">Seus documentos</h2>
        </div>
        <div className="list-tools">
          <span className="document-count">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </span>
          <button
            className="button button-secondary"
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            Atualizar lista
          </button>
        </div>
      </div>

      {isLoading && <p className="list-state" role="status">Carregando documentos...</p>}

      {!isLoading && error && (
        <div className="list-state list-error" role="alert">
          <p>{error}</p>
          <button className="button button-secondary" type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && documents.length === 0 && (
        <div className="empty-state">
          <span className="empty-index" aria-hidden="true">00</span>
          <div>
            <h3>Nenhum documento ainda</h3>
            <p>Os arquivos enviados aparecerão aqui.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && documents.length > 0 && (
        <div className="table-scroll">
          <table className="document-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Tamanho</th>
                <th scope="col">Enviado em</th>
                <th scope="col"><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="document-name" title={document.originalName}>
                    {document.originalName}
                  </td>
                  <td className="document-detail">{formatBytes(document.size)}</td>
                  <td className="document-detail">{formatDate(document.uploadedAt)}</td>
                  <td className="document-action">
                    <DownloadButton
                      documentId={document.id}
                      fileName={document.originalName}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}