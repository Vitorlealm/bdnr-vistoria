# bdnr-vistoria

API REST de **gerenciamento de vistorias veiculares** construída com **Node.js + Express** e persistência em **Dgraph** (endpoint HTTP, porta `8090`).

Faz o CRUD completo de quatro entidades — **agentes de vistoria, clientes, veículos e vistorias** — além de consultas de relacionamento que aproveitam os índices reversos (`@reverse`) do grafo.

## Arquitetura

As entidades compartilham predicados no schema e são distinguidas pelo predicado **`tipo`** (`agente | cliente | veiculo | vistoria`), filtrado com `eq(tipo, ...)`. O CRUD é gerado por uma fábrica genérica a partir de uma configuração declarativa.

```
src/
├── server.js                 # app Express, middlewares, /health, tratamento de erros
├── config/dgraph.js          # cliente dgraph-js-http (DGRAPH_URL)
├── schema.js                 # schema DQL + applySchema()
├── entities.js               # config declarativa das 4 entidades
├── crud/crudFactory.js       # gera create/list/getOne/update/remove
├── routes/
│   ├── index.js              # agrega tudo sob /api
│   ├── crudRouter.js         # router REST padrão por entidade
│   └── relacionamentos.routes.js
└── utils/                    # db (helpers Dgraph), ApiError, asyncHandler
scripts/setup-schema.js       # aplica o schema (npm run setup)
```

## Pré-requisitos

- Node.js 18+ (testado com v23)
- **Dgraph Alpha** acessível em `http://localhost:8080` (o endpoint HTTP).

> ⚠️ **Atenção ao ambiente:** verifiquei que a porta `8080` estava ocupada por um **Apache**, e o **Ratel** (UI do Dgraph) responde na `8000`. Antes de rodar, garanta que o **Dgraph Alpha** esteja realmente escutando em `8080` (pare o Apache ou suba o Alpha em outra porta e ajuste `DGRAPH_URL` no `.env`). Cheque com:
> ```bash
> curl http://localhost:8080/health   # deve responder do Dgraph, não 404 do Apache
> ```

## Instalação

```bash
npm install
cp .env.example .env   # ajuste DGRAPH_URL/PORT se necessário
```

`.env`:
```
DGRAPH_URL=http://localhost:8080
PORT=3000
```

## Como rodar

```bash
npm run setup   # aplica o schema no Dgraph (uma vez)
npm run dev     # sobe a API com reload (nodemon) em http://localhost:3000
# ou
npm start       # produção
```

## Endpoints

Padrão REST para cada entidade `agentes | clientes | veiculos | vistorias`:

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/{entidade}` | Cria. Retorna o nó criado com `uid`. |
| `GET` | `/api/{entidade}` | Lista. Suporta `?first=` e `?offset=`. |
| `GET` | `/api/{entidade}/:uid` | Busca por `uid`. |
| `PUT` | `/api/{entidade}/:uid` | Atualiza os campos enviados. |
| `DELETE` | `/api/{entidade}/:uid` | Remove. |

Relacionamentos (grafo):

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/clientes/:uid/veiculos` | Veículos de um cliente |
| `GET` | `/api/agentes/:uid/vistorias` | Vistorias de um agente |
| `GET` | `/api/veiculos/:uid/vistorias` | Vistorias de um veículo |

Utilitários: `GET /` (info), `GET /health` (conectividade com o Dgraph), `GET /api` (índice).

### Campos por entidade

- **agentes / clientes**: `nome` (obrigatório), `email`, `telefone`, `cpf`
- **veiculos**: `placa` (obrigatório), `marca`, `modelo`, `ano` (int), `cor`, `proprietario` (uid de um cliente)
- **vistorias**: `data_agendada` (obrigatório, datetime RFC3339), `status`, `observacoes`, `agente` (uid), `veiculo` (uid)

## Exemplos (curl)

```bash
# 1) Cliente
curl -s -X POST http://localhost:3000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{"nome":"Maria Silva","email":"maria@email.com","telefone":"3299999-0000","cpf":"111.222.333-44"}'

# 2) Veículo (use o uid do cliente acima em proprietario)
curl -s -X POST http://localhost:3000/api/veiculos \
  -H "Content-Type: application/json" \
  -d '{"placa":"ABC1D23","marca":"Fiat","modelo":"Argo","ano":2022,"cor":"prata","proprietario":"0x...CLIENTE"}'

# 3) Agente
curl -s -X POST http://localhost:3000/api/agentes \
  -H "Content-Type: application/json" \
  -d '{"nome":"João Vistoriador","email":"joao@vistoria.com","cpf":"555.666.777-88"}'

# 4) Vistoria (liga agente + veículo)
curl -s -X POST http://localhost:3000/api/vistorias \
  -H "Content-Type: application/json" \
  -d '{"data_agendada":"2026-07-01T14:00:00Z","status":"agendada","observacoes":"Vistoria inicial","agente":"0x...AGENTE","veiculo":"0x...VEICULO"}'

# Listar / buscar / atualizar / remover
curl -s http://localhost:3000/api/vistorias
curl -s http://localhost:3000/api/vistorias/0x...VISTORIA
curl -s -X PUT http://localhost:3000/api/vistorias/0x...VISTORIA \
  -H "Content-Type: application/json" -d '{"status":"concluida"}'
curl -s -X DELETE http://localhost:3000/api/vistorias/0x...VISTORIA

# Relacionamentos
curl -s http://localhost:3000/api/clientes/0x...CLIENTE/veiculos
curl -s http://localhost:3000/api/agentes/0x...AGENTE/vistorias
```

## Notas técnicas

- **Datas**: `data_agendada` deve ser RFC3339 (ex.: `2026-07-01T14:00:00Z`), pois o predicado é `datetime`.
- **Edges**: ao criar/atualizar veículos e vistorias, os `uid` referenciados são validados (precisam existir e ter o `tipo` correto).
- **Delete**: remove o nó inteiro via N-Quad `<uid> * * .`.
- Inspecione os dados no **Ratel** (`http://localhost:8000`) com: `{ q(func: has(tipo)) { uid tipo nome placa } }`.
