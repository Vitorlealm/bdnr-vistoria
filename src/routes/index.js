'use strict';

const express = require('express');
const { entities } = require('../entities');
const crudRouter = require('./crudRouter');
const relacionamentos = require('./relacionamentos.routes');

const router = express.Router();

// Rotas de relacionamento (grafo / edges reversos) — registradas primeiro.
router.use('/', relacionamentos);

// CRUD padrão de cada entidade: /api/agentes, /api/clientes, /api/veiculos, /api/vistorias
for (const [chave, cfg] of Object.entries(entities)) {
  router.use(`/${chave}`, crudRouter(cfg));
}

// Índice da API
router.get('/', (req, res) => {
  res.json({
    api: 'bdnr-vistoria',
    entidades: Object.keys(entities),
    relacionamentos: [
      'GET /api/clientes/:uid/veiculos',
      'GET /api/agentes/:uid/vistorias',
      'GET /api/veiculos/:uid/vistorias',
    ],
  });
});

module.exports = router;
