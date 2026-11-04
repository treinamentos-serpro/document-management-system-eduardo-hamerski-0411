// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const multer = require('multer');
const documentRoutes = require('./routes/documentRoutes');
const sessionIdentity = require('./middleware/sessionIdentity');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(sessionIdentity);

// Endpoint de verificação de saúde. As demais rotas (/upload, /documents,
// /documents/:id/download) serão implementadas durante o Passo 2.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = statusCode === 413
      ? 'O arquivo excede o tamanho máximo permitido.'
      : 'O envio do arquivo é inválido.';

    return res.status(statusCode).json({
      error: { code: error.code, message },
    });
  }

  if (error.code === 'STORAGE_QUOTA_EXCEEDED') {
    return res.status(507).json({
      error: {
        code: error.code,
        message: 'O armazenamento local está cheio. Tente novamente mais tarde.',
      },
    });
  }

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Não foi possível processar a solicitação.',
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
