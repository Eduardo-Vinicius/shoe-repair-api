# 📡 API Reference - Sistema de Setores

## Endpoints Novos

### 🏢 Setores

#### `GET /setores`
Lista todos os setores disponíveis no sistema.

**Autenticação**: Requerida

**Resposta**:
```json
{
  "success": true,
  "data": [
    {
      "id": "atendimento-inicial",
      "nome": "Atendimento",
      "ordem": 1,
      "obrigatorio": true,
      "cor": "#2196F3",
      "icone": "person",
      "descricao": "Recepção e cadastro do pedido",
      "ativo": true
    }
  ]
}
```

---

#### `GET /setores/estatisticas`
Retorna estatísticas de pedidos em cada setor.

**Autenticação**: Requerida

**Resposta**:
```json
{
  "success": true,
  "data": {
    "atendimento-inicial": {
      "nome": "Atendimento",
      "cor": "#2196F3",
      "quantidade": 3,
      "pedidos": [
        {
          "id": "abc123",
          "codigo": "200126-001",
          "cliente": "João Silva",
          "tempoNoSetor": 2
        }
      ]
    }
  }
}
```

---

### 📦 Pedidos - Setores

#### `POST /pedidos/:id/mover-setor`
Move um pedido para um setor específico.

**Autenticação**: Requerida

**Parâmetros URL**:
- `id` - ID do pedido

**Body**:
```json
{
  "setorId": "lavagem"
}
```

**Resposta Sucesso**:
```json
{
  "success": true,
  "message": "Pedido movido para o setor com sucesso",
  "data": {
    "id": "abc123",
    "codigo": "200126-001",
    "setorAtual": "lavagem",
    "setoresHistorico": [
      {
        "setorId": "atendimento-inicial",
        "setorNome": "Atendimento",
        "entradaEm": "2026-01-20T08:00:00.000Z",
        "saidaEm": "2026-01-20T10:00:00.000Z",
        "usuarioEntrada": "maria@empresa.com",
        "usuarioEntradaNome": "Maria",
        "usuarioSaida": "pedro@empresa.com",
        "usuarioSaidaNome": "Pedro"
      },
      {
        "setorId": "lavagem",
        "setorNome": "Lavagem",
        "entradaEm": "2026-01-20T10:00:00.000Z",
        "saidaEm": null,
        "usuarioEntrada": "pedro@empresa.com",
        "usuarioEntradaNome": "Pedro",
        "observacoes": ""
      }
    ]
  }
}
```

**Erros Possíveis**:
```json
// 400 - Setor não está no fluxo
{
  "success": false,
  "error": "Setor Pintura não está no fluxo deste pedido"
}

// 404 - Pedido não encontrado
{
  "success": false,
  "error": "Pedido não encontrado"
}

// 400 - Setor inválido
{
  "success": false,
  "error": "Setor xyz não encontrado"
}
```

---

#### `GET /pedidos/:id/proximo-setor`
Retorna o próximo setor no fluxo do pedido.

**Autenticação**: Requerida

**Parâmetros URL**:
- `id` - ID do pedido

**Resposta**:
```json
{
  "success": true,
  "data": {
    "id": "acabamento",
    "nome": "Acabamento",
    "ordem": 5,
    "cor": "#4CAF50",
    "icone": "auto_fix_high"
  }
}
```

**Se já está no último setor**:
```json
{
  "success": true,
  "data": null
}
```

---

## Mudanças em Endpoints Existentes

### `POST /pedidos`
Criar pedido agora inclui sistema de setores automaticamente.

**Body** (mesmos campos de antes):
```json
{
  "clienteId": "cliente123",
  "clientName": "João Silva",
  "modeloTenis": "Nike Air Max",
  "servicos": [
    { "id": "1", "nome": "Limpeza profunda", "preco": 50 }
  ],
  "fotos": ["url1", "url2"],  // Até 8 agora!
  "precoTotal": 50
}
```

**Resposta** (novos campos):
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "codigo": "200126-001",
    
    // NOVO: Criador do pedido
    "createdBy": {
      "userId": "user123",
      "userName": "Maria Atendente",
      "userEmail": "maria@empresa.com",
      "userRole": "atendimento"
    },
    
    // NOVO: Sistema de setores
    "setoresFluxo": [
      "atendimento-inicial",
      "lavagem",
      "acabamento",
      "atendimento-final"
    ],
    "setorAtual": "atendimento-inicial",
    "setoresHistorico": [
      {
        "setorId": "atendimento-inicial",
        "setorNome": "Atendimento",
        "entradaEm": "2026-01-20T10:00:00.000Z",
        "saidaEm": null,
        "usuarioEntrada": "maria@empresa.com",
        "usuarioEntradaNome": "Maria Atendente",
        "observacoes": "Pedido criado"
      }
    ],
    
    // Campos existentes
    "clienteId": "cliente123",
    "modeloTenis": "Nike Air Max",
    "status": "Atendimento - Em Andamento",
    "departamento": "Atendimento"
  }
}
```

**Validações Novas**:
```json
// Máximo 8 fotos
{
  "success": false,
  "error": "Máximo de 8 fotos permitidas"
}
```

---

### `GET /pedidos/:id`
Retorna pedido com novos campos de setores e createdBy.

**Resposta** (campos adicionados):
```json
{
  "id": "abc123",
  "codigo": "200126-001",
  
  "createdBy": {
    "userId": "user123",
    "userName": "Maria Atendente",
    "userEmail": "maria@empresa.com",
    "userRole": "atendimento"
  },
  
  "setoresFluxo": ["atendimento-inicial", "lavagem", ...],
  "setorAtual": "lavagem",
  "setoresHistorico": [
    {
      "setorId": "lavagem",
      "setorNome": "Lavagem",
      "entradaEm": "2026-01-20T10:00:00.000Z",
      "saidaEm": null,
      "usuarioEntrada": "pedro@empresa.com",
      "usuarioEntradaNome": "Pedro",
      "usuarioSaida": null,
      "usuarioSaidaNome": null,
      "observacoes": ""
    }
  ],
  
  // ... demais campos existentes
}
```

---

## Fluxo Automático de Setores

### Determinação Baseada em Serviços

```javascript
Serviço contém "limpeza" ou "lavagem"
  → Adiciona setor: Lavagem

Serviço contém "costura" ou "rasgado"
  → Adiciona setor: Costura

Serviço contém "cola" ou "solado" ou "reparo"
  → Adiciona setor: Sapataria

Serviço contém "pintura" ou "customização"
  → Adiciona setor: Pintura

Sempre adiciona:
  → Atendimento (início)
  → Acabamento (se houver serviços)
  → Atendimento Final (fim)
```

### Exemplo de Fluxos

**Apenas Limpeza**:
```
Atendimento → Lavagem → Acabamento → Atendimento Final
```

**Limpeza + Costura**:
```
Atendimento → Lavagem → Costura → Acabamento → Atendimento Final
```

**Reparo + Pintura**:
```
Atendimento → Sapataria → Pintura → Acabamento → Atendimento Final
```

---

## Comportamentos Automáticos

### 1. Ao Criar Pedido
- ✅ Determina setores automaticamente
- ✅ Coloca no setor inicial (Atendimento)
- ✅ Registra createdBy
- ✅ Cria primeiro item do setoresHistorico
- ✅ Envia email de confirmação ao cliente

### 2. Ao Mover para Setor
- ✅ Fecha setor anterior (registra saidaEm)
- ✅ Calcula tempo no setor anterior
- ✅ Registra quem moveu (usuarioSaida)
- ✅ Abre novo setor (novo item no histórico)
- ✅ Atualiza status legível
- ✅ Atualiza departamento

### 3. Ao Chegar em Atendimento Final
- ✅ Marca dataEntregaReal
- ✅ Status = "Atendimento Final - Finalizado"
- ✅ **Envia email automático de finalização ao cliente**

---

## Headers Necessários

Todos os endpoints requerem autenticação JWT:

```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Erro de validação / Bad Request |
| 401 | Não autenticado |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

---

## Exemplos de Uso (cURL)

### Listar Setores
```bash
curl -X GET https://api.seudominio.com/setores \
  -H "Authorization: Bearer <token>"
```

### Mover Pedido
```bash
curl -X POST https://api.seudominio.com/pedidos/abc123/mover-setor \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"setorId": "lavagem"}'
```

### Ver Estatísticas
```bash
curl -X GET https://api.seudominio.com/setores/estatisticas \
  -H "Authorization: Bearer <token>"
```

### Criar Pedido com 8 Fotos
```bash
curl -X POST https://api.seudominio.com/pedidos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "cliente123",
    "clientName": "João",
    "modeloTenis": "Nike",
    "servicos": [{"id": "1", "nome": "Limpeza", "preco": 50}],
    "fotos": ["url1", "url2", "url3", "url4", "url5", "url6", "url7", "url8"],
    "precoTotal": 50
  }'
```

---

## Integração com Frontend

### React Example

```javascript
import axios from 'axios';

// Listar setores
const setores = await axios.get('/setores', {
  headers: { Authorization: `Bearer ${token}` }
});

// Criar pedido
const pedido = await axios.post('/pedidos', {
  clienteId: 'abc',
  clientName: 'João',
  modeloTenis: 'Nike',
  servicos: [{ id: '1', nome: 'Limpeza', preco: 50 }],
  fotos: fotosArray  // Até 8
});

// Mover para próximo setor
await axios.post(`/pedidos/${pedidoId}/mover-setor`, {
  setorId: 'lavagem'
});

// Ver estatísticas
const stats = await axios.get('/setores/estatisticas');
```

---

## Campos Obrigatórios vs Opcionais

### POST /pedidos
**Obrigatórios**:
- `clienteId`
- `clientName`
- `modeloTenis`
- `servicos` (array não vazio)

**Opcionais**:
- `fotos` (max 8)
- `precoTotal`
- `valorSinal`
- `dataPrevistaEntrega`
- `observacoes`
- `garantia`
- `acessorios`

### POST /pedidos/:id/mover-setor
**Obrigatórios**:
- `setorId`

---

**Documentação completa do sistema de setores implementado na Fase 1.** ✅
