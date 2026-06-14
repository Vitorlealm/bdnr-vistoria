'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const apiRoutes = require('./routes');
const { client, DGRAPH_URL } = require('./config/dgraph');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Raiz
app.get('/', (req, res) => {
  res.json({
    nome: 'API de Gerenciamento de Vistorias Veiculares',
    versao: '1.0.0',
    dgraph: DGRAPH_URL,
    docs: '/api',
    health: '/health',
  });
});

// Healthcheck: verifica a conectividade com o Dgraph.
app.get('/health', async (req, res) => {
  try {
    await client.newTxn().query('{ q(func: has(tipo), first: 0) { uid } }');
    res.json({ status: 'ok', dgraph: { url: DGRAPH_URL, conectado: true } });
  } catch (err) {
    res.status(502).json({
      status: 'degraded',
      dgraph: { url: DGRAPH_URL, conectado: false, erro: err.message },
    });
  }
});

// Rotas da API
app.use('/api', apiRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware central de erros
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // JSON malformado no body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }

  // Erro de domínio com status definido
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Falha de conexão com o Dgraph
  const msg = String(err.message || '');
  if (/ECONNREFUSED|fetch failed|request to .* failed|ENOTFOUND|ECONNRESET/i.test(msg)) {
    return res.status(502).json({
      error: `Não foi possível conectar ao Dgraph em ${DGRAPH_URL}. Verifique se o Alpha está no ar.`,
      detalhe: msg,
    });
  }

  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno', detalhe: msg });
});

app.listen(PORT, () => {
  console.log(`🚗 API de vistorias rodando em http://localhost:${PORT}`);
  console.log(`   Dgraph: ${DGRAPH_URL}`);
  console.log(`   Rotas:  http://localhost:${PORT}/api`);
});

module.exports = app;
