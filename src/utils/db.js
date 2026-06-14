'use strict';

const { client } = require('../config/dgraph');

/**
 * Executa uma query DQL com variáveis e retorna o objeto `data`.
 * @param {string} q     - query DQL (use `query nome($v: string) { ... }` p/ vars)
 * @param {object} vars  - mapa de variáveis (ex.: { $uid: '0x1', $tipo: 'agente' })
 */
async function query(q, vars = {}) {
  const res = await client.newTxn().queryWithVars(q, vars);
  return res.data;
}

/**
 * Executa uma mutação setJson commitNow e retorna o `data` (inclui `uids`).
 * @param {object} setJson - objeto a inserir/atualizar
 */
async function mutate(setJson) {
  const txn = client.newTxn();
  try {
    const res = await txn.mutate({ setJson, commitNow: true });
    return res.data;
  } finally {
    await txn.discard();
  }
}

/**
 * Remove um edge específico de um nó (delete-then-set em updates de uid simples).
 * @param {string} uid    - nó de origem
 * @param {string} pred   - predicado/edge a remover
 */
async function deleteEdge(uid, pred) {
  const txn = client.newTxn();
  try {
    await txn.mutate({ deleteNquads: `<${uid}> <${pred}> * .`, commitNow: true });
  } finally {
    await txn.discard();
  }
}

/**
 * Remove o nó apagando explicitamente cada predicado informado.
 *
 * Obs.: o curinga `<uid> * * .` depende do sistema de tipos (dgraph.type) para
 * enumerar os predicados. Como discriminamos as entidades pelo predicado `tipo`
 * (sem dgraph.type), apagamos cada predicado de forma explícita (`<uid> <p> * .`).
 *
 * @param {string} uid
 * @param {string[]} predicados - todos os predicados do nó (inclui `tipo` e edges)
 */
async function deleteNode(uid, predicados) {
  const nquads = predicados.map((p) => `<${uid}> <${p}> * .`).join('\n');
  const txn = client.newTxn();
  try {
    await txn.mutate({ deleteNquads: nquads, commitNow: true });
  } finally {
    await txn.discard();
  }
}

/**
 * Verifica se existe um nó com o uid e o `tipo` informados.
 * @returns {Promise<boolean>}
 */
async function nodeExistsWithTipo(uid, tipo) {
  const q = `query existe($u: string, $t: string) {
    q(func: uid($u)) @filter(eq(tipo, $t)) { uid }
  }`;
  const data = await query(q, { $u: uid, $t: tipo });
  return Array.isArray(data.q) && data.q.length > 0;
}

module.exports = { query, mutate, deleteEdge, deleteNode, nodeExistsWithTipo };
