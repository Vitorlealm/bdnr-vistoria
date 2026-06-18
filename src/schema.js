'use strict';

const { client } = require('./config/dgraph');

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

async function applySchema() {
  await client.alter({ schema: SCHEMA });
}

module.exports = { SCHEMA, applySchema };
