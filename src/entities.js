'use strict';

/**
 * Configuração declarativa das entidades. A chave é o nome usado na rota
 * (/api/<chave>) e `tipo` é o valor gravado no predicado discriminador `tipo`.
 *
 * campos: predicados escalares. Opções: { req: obrigatório, int: inteiro }
 * edges:  predicados uid (relacionamentos). { tipoAlvo: tipo exigido do nó referenciado }
 */
const entities = {
  agentes: {
    tipo: 'agente',
    campos: {
      nome: { req: true },
      email: {},
      telefone: {},
      cpf: {},
    },
    edges: {},
  },

  clientes: {
    tipo: 'cliente',
    campos: {
      nome: { req: true },
      email: {},
      telefone: {},
      cpf: {},
    },
    edges: {},
  },

  veiculos: {
    tipo: 'veiculo',
    campos: {
      placa: { req: true },
      marca: {},
      modelo: {},
      ano: { int: true },
      cor: {},
    },
    edges: {
      proprietario: { tipoAlvo: 'cliente' },
    },
  },

  vistorias: {
    tipo: 'vistoria',
    campos: {
      data_agendada: { req: true },
      status: {},
      observacoes: {},
    },
    edges: {
      agente: { tipoAlvo: 'agente' },
      veiculo: { tipoAlvo: 'veiculo' },
    },
  },
};

// Mapa auxiliar: tipo -> config (usado para projetar edges).
const byTipo = Object.fromEntries(
  Object.values(entities).map((cfg) => [cfg.tipo, cfg])
);

module.exports = { entities, byTipo };
