# Especificação - Document Management System

## 1. Objetivo

Oferecer a usuários identificados uma aplicação web para enviar documentos, consultar os próprios envios e baixar os arquivos armazenados localmente.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos pertencentes ao usuário da requisição.
- Download de um documento pelo identificador, respeitando a propriedade.
- Gravação dos arquivos no filesystem local com `multer` e `diskStorage`.
- Armazenamento dos metadados em memória nesta fase.
- Interface web em React para envio, listagem e download.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Banco de dados ou persistência dos metadados após reinicialização.
- Versionamento, edição, compartilhamento ou exclusão de documentos.
- Autenticação completa, cadastro e recuperação de usuários.
- Restrições por tipo de arquivo; nesta fase, qualquer tipo é aceito dentro do limite de tamanho.

### Premissas e identidade do usuário

As operações usam um identificador estável de usuário obtido de um contexto confiável do servidor, como `req.user.id`. O cliente não pode escolher o proprietário enviando um campo `owner`. O mecanismo de autenticação não está definido nesta especificação e deverá ser provido ou acordado antes do uso em produção.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo usando `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema valida que o arquivo foi enviado, não está vazio e respeita o limite de tamanho configurado. |
| RF-03 | O sistema grava o arquivo em armazenamento local usando `multer` com `diskStorage` e um nome interno gerado pelo servidor. |
| RF-04 | Após o envio bem-sucedido, o sistema cria metadados com identificador único, nome original, tamanho, data de envio e proprietário. |
| RF-05 | O sistema remove o arquivo gravado caso a criação dos metadados falhe, evitando arquivo órfão por falha na mesma operação. |
| RF-06 | O usuário pode listar somente os documentos associados à sua identidade. Uma lista sem resultados retorna vazia. |
| RF-07 | O usuário pode baixar um documento próprio pelo identificador. |
| RF-08 | O sistema responde com `404` quando o documento não existe ou não pertence ao usuário da requisição. |
| RF-09 | Os nomes originais são preservados nos metadados e usados com segurança no nome de download; eles não determinam o caminho interno do arquivo. |
| RF-10 | O usuário recebe mensagens de erro consistentes para requisições inválidas, arquivos grandes demais e falhas internas. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são armazenados exclusivamente no filesystem local, por `multer` com `diskStorage`, por padrão em `storage`. |
| RNF-02 | Os metadados ficam em memória e podem ser mantidos em um `Map` indexado por identificador. |
| RNF-03 | Configurações operacionais são obtidas por variáveis de ambiente; não são armazenadas no código como valores específicos do ambiente. |
| RNF-04 | O nome interno do arquivo é opaco e gerado pelo servidor; o nome enviado pelo usuário não é usado para compor caminhos. |
| RNF-05 | O acesso ao documento é limitado ao proprietário resolvido no contexto confiável da requisição. |
| RNF-06 | O limite inicial de upload é 10 MiB, configurável por ambiente. |
| RNF-07 | A API não expõe caminhos locais, nomes internos ou detalhes de exceções. |
| RNF-08 | As datas são serializadas em ISO 8601, em UTC. |
| RNF-09 | A aplicação informa falhas de leitura e gravação do filesystem sem derrubar o processo. |
| RNF-10 | O layout e as ações principais da interface devem funcionar em telas desktop e mobile. |

### Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `storage` | Diretório local de arquivos; o caminho deve ser resolvido de forma consistente independentemente do diretório de execução. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo de upload em bytes. |

Os arquivos permanecem no disco após reinicialização, mas os metadados em memória não. Portanto, documentos enviados antes de uma reinicialização deixam de aparecer na listagem e não podem ser localizados pela API nesta fase.

## 5. Modelo de dados

### Metadados públicos do documento

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único gerado pelo servidor. |
| `originalName` | string | Nome original fornecido no upload, tratado como dado não confiável. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em ISO 8601 UTC. |
| `owner` | string | Identificador do usuário proprietário. |
| `mimeType` | string | Tipo MIME informado/detectado para o arquivo, quando disponível. |

### Dados internos de armazenamento

O repositório pode manter `storageName`, nome interno gerado pelo servidor, para localizar o arquivo. Esse campo não é retornado pela API. Caminhos absolutos não fazem parte do modelo público nem devem ser enviados ao cliente.

## 6. Contratos de API

### Convenções

- As rotas do backend são `/upload`, `/documents` e `/documents/:id/download`.
- No desenvolvimento, o frontend usa o prefixo `/api`; o proxy do Vite remove esse prefixo antes de encaminhar ao backend.
- Respostas de erro usam o formato `{ "error": { "code": "...", "message": "..." } }`.
- O proprietário é derivado do contexto confiável do servidor, nunca do corpo ou de parâmetros fornecidos pelo cliente.

### `POST /upload`

Envia um arquivo.

**Entrada:** `multipart/form-data` com o campo obrigatório `file`. Deve conter exatamente um arquivo.

**Sucesso:** `201 Created`, corpo com os metadados públicos do documento:

```json
{
  "id": "identificador",
  "originalName": "relatorio.pdf",
  "size": 524288,
  "uploadedAt": "2026-11-04T12:00:00.000Z",
  "owner": "usuario-123",
  "mimeType": "application/pdf"
}
```

**Erros esperados:**

- `400 Bad Request`: arquivo ausente, vazio ou requisição multipart inválida.
- `413 Payload Too Large`: arquivo excede `MAX_FILE_SIZE_BYTES`.
- `500 Internal Server Error`: falha ao gravar arquivo ou registrar metadados.

### `GET /documents`

Lista os documentos do usuário autenticado.

**Sucesso:** `200 OK`, array de metadados; retorna `[]` quando não houver documentos. A ordenação é da data mais recente para a mais antiga.

**Erro esperado:** `500 Internal Server Error` em falha inesperada de leitura dos metadados.

### `GET /documents/:id/download`

Baixa o conteúdo binário de um documento do usuário.

**Sucesso:** `200 OK`, corpo binário com `Content-Type` apropriado quando conhecido e `Content-Disposition: attachment` usando o nome original com tratamento seguro.

**Erros esperados:**

- `404 Not Found`: documento inexistente, de outro usuário ou arquivo não localizado.
- `500 Internal Server Error`: falha inesperada de leitura do arquivo.

## 7. Decisões arquiteturais

- Backend em CommonJS com Express e fluxo `routes -> controllers -> services -> repositories`.
- Rotas declaram endpoints e conectam middleware de upload com controllers.
- Controllers tratam entrada e saída HTTP, validação básica e conversão de erros em respostas.
- Services aplicam regras de negócio, escopo por proprietário e coordenação entre metadados e arquivo.
- Repositories isolam os metadados em memória e o acesso ao filesystem local.
- `multer` com `diskStorage` grava o arquivo em diretório local configurável; o nome interno é gerado pelo servidor.
- Frontend em React com separação entre páginas, componentes e serviço de API; chamadas usam `fetch` pelo prefixo `/api`.
- Metadados não são reconstruídos a partir dos arquivos no startup; isso evita assumir que nomes e arquivos no disco são uma fonte confiável de propriedade.
- A autenticação concreta permanece uma dependência a definir. Sem identidade confiável, o isolamento entre usuários não pode ser considerado garantido.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Nesta solicitação, a implementação dos arquivos de backend e frontend não faz parte do plano executado.

1. **Fechar contratos e decisões pendentes**
   - Alinhar a origem do identificador confiável do usuário e o tratamento de erros.
   - Artefatos: especificação `docs/specs/dms-spec.md`.
   - Aceite: contratos, limites, dados e premissas revisados; dependência de identidade documentada.

2. **Implementar armazenamento e regras de negócio do backend**
   - Criar repositórios para metadados em memória e arquivos locais; definir serviços de upload, listagem e download.
   - Arquivos previstos: módulos em `repositories` e `services`.
   - Aceite: arquivos são gravados localmente com nome interno seguro; metadados são associados ao proprietário; falha ao registrar metadados remove o arquivo recém-gravado.

3. **Expor e testar a API**
   - Adicionar middleware Multer, rotas e controllers; validar limites e respostas HTTP.
   - Arquivos previstos: módulos em `routes`, `controllers`, integração em `app.js` e testes em `test`.
   - Aceite: endpoints cumprem os contratos; usuários não acessam documentos alheios; erros e limites têm testes.

4. **Implementar a experiência web**
   - Criar serviço de API, tela de envio/listagem e ações de download, incluindo estados de carregamento e erro.
   - Arquivos previstos: módulos em `services`, `pages` e `components`, com integração em `App.jsx`.
   - Aceite: envio, listagem e download funcionam pelo proxy `/api`; interface responde a falhas sem perder estado de forma inesperada.

5. **Verificar integração e operação**
   - Executar testes do backend, build do frontend e validação manual do fluxo completo; confirmar diretório e variáveis de configuração.
   - Arquivos previstos: testes existentes e documentação operacional, se necessária.
   - Aceite: fluxo de upload-listagem-download funciona; comportamento após reinício e limite de upload estão documentados.

## 9. Riscos e pontos a decidir

- A identidade do usuário ainda não tem mecanismo definido; não se deve expor a API multiusuário sem contexto confiável.
- Metadados voláteis tornam documentos inacessíveis pela API após reinício, embora os arquivos continuem no disco.
- Arquivos abandonados por encerramento abrupto entre gravação e registro podem permanecer em `storage`; uma política de limpeza fica fora do MVP.
- O limite inicial de 10 MiB e a aceitação de qualquer tipo de arquivo devem ser confirmados conforme o uso esperado.