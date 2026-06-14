'use strict';

// Teste de fumaça: exercita todo o CRUD + relacionamentos contra a API rodando.
const BASE = process.env.BASE || 'http://localhost:3000';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

function assert(cond, msg, ctx) {
  if (!cond) {
    console.error(`❌ FALHOU: ${msg}`);
    if (ctx !== undefined) console.error('   contexto:', JSON.stringify(ctx));
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log(`✅ ${msg}`);
}

(async () => {
  // CREATE cliente
  let r = await req('POST', '/api/clientes', {
    nome: 'Maria Silva', email: 'maria@email.com', telefone: '3299999-0000', cpf: '111.222.333-44',
  });
  assert(r.status === 201 && r.json.uid, 'cria cliente', r.json);
  const cliente = r.json.uid;

  // CREATE veiculo com proprietario
  r = await req('POST', '/api/veiculos', {
    placa: 'ABC1D23', marca: 'Fiat', modelo: 'Argo', ano: 2022, cor: 'prata', proprietario: cliente,
  });
  assert(r.status === 201 && r.json.uid, 'cria veiculo com proprietario', r.json);
  assert(r.json.proprietario && r.json.proprietario.uid === cliente, 'veiculo aninha proprietario', r.json);
  const veiculo = r.json.uid;

  // CREATE agente
  r = await req('POST', '/api/agentes', { nome: 'João Vistoriador', email: 'joao@vistoria.com', cpf: '555.666.777-88' });
  assert(r.status === 201 && r.json.uid, 'cria agente', r.json);
  const agente = r.json.uid;

  // CREATE vistoria ligando agente + veiculo
  r = await req('POST', '/api/vistorias', {
    data_agendada: '2026-07-01T14:00:00Z', status: 'agendada', observacoes: 'Vistoria inicial',
    agente, veiculo,
  });
  assert(r.status === 201 && r.json.uid, 'cria vistoria com agente+veiculo', r.json);
  assert(r.json.agente && r.json.agente.uid === agente, 'vistoria aninha agente', r.json);
  assert(r.json.veiculo && r.json.veiculo.uid === veiculo, 'vistoria aninha veiculo', r.json);
  const vistoria = r.json.uid;

  // Validação de edge inexistente
  r = await req('POST', '/api/veiculos', { placa: 'XXX0000', proprietario: '0xdeadbeef' });
  assert(r.status === 400, 'rejeita proprietario inexistente (400)', r.json);

  // Validação de campo obrigatório
  r = await req('POST', '/api/clientes', { email: 'sem@nome.com' });
  assert(r.status === 400, 'rejeita cliente sem nome (400)', r.json);

  // LIST
  r = await req('GET', '/api/vistorias');
  assert(r.status === 200 && Array.isArray(r.json) && r.json.length >= 1, 'lista vistorias', r.json);

  // GET one
  r = await req('GET', `/api/vistorias/${vistoria}`);
  assert(r.status === 200 && r.json.uid === vistoria, 'busca vistoria por uid', r.json);

  // GET tipo errado -> 404 (busca veiculo no endpoint de vistorias)
  r = await req('GET', `/api/vistorias/${veiculo}`);
  assert(r.status === 404, 'tipo errado retorna 404', r.json);

  // UPDATE escalar
  r = await req('PUT', `/api/vistorias/${vistoria}`, { status: 'concluida' });
  assert(r.status === 200 && r.json.status === 'concluida', 'atualiza status da vistoria', r.json);

  // UPDATE edge (troca veiculo) -> cria outro veiculo e troca
  r = await req('POST', '/api/veiculos', { placa: 'NEW2024', marca: 'VW', proprietario: cliente });
  const veiculo2 = r.json.uid;
  r = await req('PUT', `/api/vistorias/${vistoria}`, { veiculo: veiculo2 });
  assert(r.status === 200 && r.json.veiculo && r.json.veiculo.uid === veiculo2, 'troca edge veiculo da vistoria', r.json);

  // Relacionamentos
  r = await req('GET', `/api/clientes/${cliente}/veiculos`);
  assert(r.status === 200 && Array.isArray(r.json) && r.json.length >= 2, 'reverse: veiculos do cliente', r.json);

  r = await req('GET', `/api/agentes/${agente}/vistorias`);
  assert(r.status === 200 && Array.isArray(r.json) && r.json.length >= 1, 'reverse: vistorias do agente', r.json);

  // DELETE
  r = await req('DELETE', `/api/vistorias/${vistoria}`);
  assert(r.status === 200 && r.json.ok, 'remove vistoria', r.json);
  r = await req('GET', `/api/vistorias/${vistoria}`);
  assert(r.status === 404, 'vistoria removida retorna 404', r.json);

  // Limpa o restante
  for (const [tipo, uid] of [['veiculos', veiculo], ['veiculos', veiculo2], ['agentes', agente], ['clientes', cliente]]) {
    await req('DELETE', `/api/${tipo}/${uid}`);
  }
  console.log('\n🎉 Smoke test concluído.');
})().catch((e) => {
  console.error('\nErro no smoke test:', e.message);
  process.exit(1);
});
