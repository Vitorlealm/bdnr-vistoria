'use strict';

const express = require('express');
const { query } = require('../utils/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const PROJ_VEICULO = 'uid tipo placa marca modelo ano cor';
const PROJ_VISTORIA = 'uid tipo data_agendada status observacoes';

/**
 * Consulta genérica via edge reverso (~edge).
 * @param {string} uid        - nó de origem
 * @param {string} tipoOrigem - tipo esperado da origem (404 se não bater)
 * @param {string} edge       - nome do edge direto (será usado como ~edge)
 * @param {string} proj       - projeção dos nós alvo
 */
async function buscarPorReverso(uid, tipoOrigem, edge, proj) {
  const q = `query rel($u: string, $t: string) {
    origem(func: uid($u)) @filter(eq(tipo, $t)) {
      uid
      itens: ~${edge} { ${proj} }
    }
  }`;
  const data = await query(q, { $u: uid, $t: tipoOrigem });
  const origem = data.origem && data.origem[0];
  if (!origem) throw ApiError.notFound(`${tipoOrigem} não encontrado: ${uid}`);
  return origem.itens || [];
}

// Veículos de um cliente (via ~proprietario)
router.get(
  '/clientes/:uid/veiculos',
  asyncHandler(async (req, res) => {
    const itens = await buscarPorReverso(req.params.uid, 'cliente', 'proprietario', PROJ_VEICULO);
    res.json(itens);
  })
);

// Vistorias de um agente (via ~agente)
router.get(
  '/agentes/:uid/vistorias',
  asyncHandler(async (req, res) => {
    const itens = await buscarPorReverso(req.params.uid, 'agente', 'agente', PROJ_VISTORIA);
    res.json(itens);
  })
);

// Vistorias de um veículo (via ~veiculo)
router.get(
  '/veiculos/:uid/vistorias',
  asyncHandler(async (req, res) => {
    const itens = await buscarPorReverso(req.params.uid, 'veiculo', 'veiculo', PROJ_VISTORIA);
    res.json(itens);
  })
);

module.exports = router;
