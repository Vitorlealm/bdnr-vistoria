'use strict';

const { byTipo } = require('../entities');
const { query, mutate, deleteEdge, deleteNode, nodeExistsWithTipo } = require('../utils/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Monta a projeção DQL de uma entidade: uid, tipo, escalares e, para cada
 * edge, o uid/tipo/escalares do nó alvo.
 */
function buildProjection(cfg) {
  const scalars = Object.keys(cfg.campos);
  const edges = Object.entries(cfg.edges).map(([name, e]) => {
    const alvo = byTipo[e.tipoAlvo];
    const alvoScalars = alvo ? Object.keys(alvo.campos) : [];
    return `${name} { uid tipo ${alvoScalars.join(' ')} }`;
  });
  return ['uid', 'tipo', ...scalars, ...edges].join('\n      ');
}

/**
 * Lê e valida o valor de um campo escalar a partir do body.
 * Retorna { skip: true } quando o campo não foi enviado.
 */
function readScalar(field, opts, body) {
  let val = body[field];
  if (val === undefined || val === null || val === '') {
    if (opts.req) throw ApiError.badRequest(`Campo obrigatório ausente: ${field}`);
    return { skip: true };
  }
  if (opts.int) {
    const n = parseInt(val, 10);
    if (Number.isNaN(n)) throw ApiError.badRequest(`Campo "${field}" deve ser um inteiro`);
    val = n;
  }
  return { value: val };
}

/** Extrai o uid de uma referência de edge (aceita "0x1" ou { uid: "0x1" }). */
function refUid(ref) {
  return typeof ref === 'object' && ref !== null ? ref.uid : ref;
}

/**
 * Gera os 5 handlers de CRUD para uma entidade, a partir de sua config.
 * @param {object} cfg - entrada de `entities`
 */
function crudFactory(cfg) {
  const projection = buildProjection(cfg);

  async function fetchOne(uid) {
    const q = `query um($u: string, $t: string) {
      q(func: uid($u)) @filter(eq(tipo, $t)) {
      ${projection}
      }
    }`;
    const data = await query(q, { $u: uid, $t: cfg.tipo });
    return (data.q && data.q[0]) || null;
  }

  const create = asyncHandler(async (req, res) => {
    const body = req.body || {};
    const setJson = { uid: '_:novo', tipo: cfg.tipo };

    for (const [field, opts] of Object.entries(cfg.campos)) {
      const r = readScalar(field, opts, body);
      if (!r.skip) setJson[field] = r.value;
    }

    for (const [field, e] of Object.entries(cfg.edges)) {
      const ref = body[field];
      if (ref === undefined || ref === null || ref === '') {
        if (e.req) throw ApiError.badRequest(`Relacionamento obrigatório ausente: ${field}`);
        continue;
      }
      const uid = refUid(ref);
      const ok = await nodeExistsWithTipo(uid, e.tipoAlvo);
      if (!ok) {
        throw ApiError.badRequest(`Nenhum ${e.tipoAlvo} encontrado para ${field}=${uid}`);
      }
      setJson[field] = { uid };
    }

    const data = await mutate(setJson);
    const uid = data.uids.novo;
    const node = await fetchOne(uid);
    res.status(201).json(node);
  });

  const list = asyncHandler(async (req, res) => {
    const paginacao = [];
    const first = parseInt(req.query.first, 10);
    const offset = parseInt(req.query.offset, 10);
    if (!Number.isNaN(first)) paginacao.push(`first: ${first}`);
    if (!Number.isNaN(offset)) paginacao.push(`offset: ${offset}`);
    const pag = paginacao.length ? `, ${paginacao.join(', ')}` : '';

    const q = `query lista($t: string) {
      q(func: eq(tipo, $t)${pag}) {
      ${projection}
      }
    }`;
    const data = await query(q, { $t: cfg.tipo });
    res.json(data.q || []);
  });

  const getOne = asyncHandler(async (req, res) => {
    const node = await fetchOne(req.params.uid);
    if (!node) throw ApiError.notFound(`${cfg.tipo} não encontrado: ${req.params.uid}`);
    res.json(node);
  });

  const update = asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const exists = await nodeExistsWithTipo(uid, cfg.tipo);
    if (!exists) throw ApiError.notFound(`${cfg.tipo} não encontrado: ${uid}`);

    const body = req.body || {};
    const setJson = { uid };
    let mudou = false;

    for (const [field, opts] of Object.entries(cfg.campos)) {
      if (!(field in body)) continue;
      const r = readScalar(field, { ...opts, req: false }, body);
      if (!r.skip) {
        setJson[field] = r.value;
        mudou = true;
      }
    }

    for (const [field, e] of Object.entries(cfg.edges)) {
      if (!(field in body)) continue;
      const novoUid = refUid(body[field]);
      const ok = await nodeExistsWithTipo(novoUid, e.tipoAlvo);
      if (!ok) {
        throw ApiError.badRequest(`Nenhum ${e.tipoAlvo} encontrado para ${field}=${novoUid}`);
      }
      // uid simples: remove o edge antigo antes de setar o novo.
      await deleteEdge(uid, field);
      setJson[field] = { uid: novoUid };
      mudou = true;
    }

    if (!mudou) throw ApiError.badRequest('Nenhum campo válido para atualizar');

    await mutate(setJson);
    const node = await fetchOne(uid);
    res.json(node);
  });

  // Todos os predicados que o nó pode ter (para o delete explícito).
  const predicados = ['tipo', ...Object.keys(cfg.campos), ...Object.keys(cfg.edges)];

  const remove = asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const exists = await nodeExistsWithTipo(uid, cfg.tipo);
    if (!exists) throw ApiError.notFound(`${cfg.tipo} não encontrado: ${uid}`);
    await deleteNode(uid, predicados);
    res.json({ ok: true, uid });
  });

  return { create, list, getOne, update, remove, fetchOne };
}

module.exports = crudFactory;
