'use strict';

const dgraph = require('dgraph-js-http');

const DGRAPH_URL = process.env.DGRAPH_URL || 'http://localhost:8080';

// Stub aponta para o endpoint HTTP do Dgraph Alpha (porta 8080 por padrão).
const stub = new dgraph.DgraphClientStub(DGRAPH_URL);
const client = new dgraph.DgraphClient(stub);

module.exports = { dgraph, stub, client, DGRAPH_URL };
