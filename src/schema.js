'use strict';

const { client } = require('./config/dgraph');

/**
 * Schema DQL do banco (conforme fornecido). As entidades são distinguidas
 * em tempo de aplicação pelo predicado `tipo` (agente | cliente | veiculo | vistoria).
 */
const SCHEMA = `
nome: string @index(term) .
email: string @index(exact) .
telefone: string .
cpf: string @index(exact) .
tipo: string @index(exact) .
placa: string @index(exact) .
marca: string @index(term) .
modelo: string @index(term) .
ano: int .
cor: string .
proprietario: uid @reverse .
data_agendada: datetime @index(hour) .
status: string @index(exact) .
observacoes: string .
agente: uid @reverse .
veiculo: uid @reverse .
`;

/**
 * Aplica o schema no Dgraph via /alter.
 */
async function applySchema() {
  await client.alter({ schema: SCHEMA });
}

module.exports = { SCHEMA, applySchema };
