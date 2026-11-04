import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadDocuments() {
      setIsLoading(true);
      setLoadError('');

      try {
        const result = await listDocuments();
        if (isCurrent) {
          setDocuments(result);
        }
      } catch (error) {
        if (isCurrent) {
          setLoadError(error.message || 'Não foi possível carregar os documentos.');
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadDocuments();
    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  function refreshDocuments() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  return (
    <div className="app-frame">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, página inicial">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DOC / MANAGER</span>
        </a>
        <span className="topbar-note">ARQUIVOS LOCAIS</span>
      </header>

      <main className="app-shell">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">DOCUMENT MANAGEMENT SYSTEM</p>
          <h1 id="page-title">Biblioteca de documentos</h1>
          <p className="intro-copy">
            Envie arquivos, acompanhe seus documentos e baixe o que precisar.
          </p>
        </section>

        <UploadComponent onUploaded={refreshDocuments} />

        <DocumentList
          documents={documents}
          isLoading={isLoading}
          error={loadError}
          onRetry={refreshDocuments}
          onRefresh={refreshDocuments}
        />

        <footer className="app-footer">
          <span>Armazenamento no servidor local</span>
          <span>API via /api</span>
        </footer>
      </main>
    </div>
  );
}
