'use strict';

const express = require('express');
const crudFactory = require('../crud/crudFactory');

/**
 * Cria um Router Express com as 5 rotas REST padrão para uma entidade.
 *   POST   /        -> create
 *   GET    /        -> list   (?first=&offset=)
 *   GET    /:uid    -> getOne
 *   PUT    /:uid    -> update
 *   DELETE /:uid    -> remove
 */
function crudRouter(cfg) {
  const router = express.Router();
  const h = crudFactory(cfg);

  router.post('/', h.create);
  router.get('/', h.list);
  router.get('/:uid', h.getOne);
  router.put('/:uid', h.update);
  router.delete('/:uid', h.remove);

  return router;
}

module.exports = crudRouter;
