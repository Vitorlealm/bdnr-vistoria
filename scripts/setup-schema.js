'use strict';

require('dotenv').config();

const { applySchema, SCHEMA } = require('../src/schema');
const { DGRAPH_URL } = require('../src/config/dgraph');

(async () => {
  console.log(`Aplicando schema no Dgraph em ${DGRAPH_URL} ...`);
  try {
    await applySchema();
    console.log('✅ Schema aplicado com sucesso.');
    console.log(SCHEMA.trim());
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha ao aplicar o schema.');
    console.error(`   Verifique se o Dgraph Alpha está acessível em ${DGRAPH_URL}.`);
    console.error(`   Detalhe: ${err.message}`);
    process.exit(1);
  }
})();
