const documents = new Map();

function create(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id) || null;
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

function remove(id) {
  return documents.delete(id);
}

module.exports = { create, findById, findByOwner, remove };