# ✅ Explicação: Código vs ID do Pedido

## 🎯 A Estrutura

Cada pedido tem **dois identificadores**:

### 1. **`id`** (Interno - UUID)
```javascript
"id": "550e8400-e29b-41d4-a716-446655440000"
```
- Gerado automaticamente pelo backend com `uuidv4()`
- Usado como **chave primária** no DynamoDB
- Necessário para queries e updates
- **NÃO deve ser mostrado para o cliente**

### 2. **`codigo`** (Público - Legível) ✨
```javascript
"codigo": "160126-001"
```
- Formato: `DDMMYY-XXX` (dia-mês-ano + sequencial)
- Gerado automaticamente na função `gerarCodigoPedido()`
- Fácil de memorizar e digitar
- **ISSO é o que o cliente deve ver**

---

## 🔄 Fluxo de Criação

```
Frontend envia dados do pedido
    ↓
Controller `createPedido()` recebe
    ↓
Service `createPedido()` executa:
    1. Gera `id` = uuid()
    2. Gera `codigo` = gerarCodigoPedido() → "160126-001"
    3. Salva no DynamoDB com ambos
    ↓
Resposta JSON contém ambos:
{
  "id": "550e8400-...",
  "codigo": "160126-001",
  "clientName": "João",
  ...
}
```

---

## 📱 Onde Usar Cada Um

| Situação | Usar |
|----------|------|
| Cliente pergunta "qual meu pedido?" | **`codigo`** → "160126-001" |
| API query backend | **`id`** → "550e8400-..." |
| Boleto/Nota Fiscal | **`codigo`** → "160126-001" |
| Buscar pedido no sistema | **`id`** → "550e8400-..." |
| Mensagem WhatsApp | **`codigo`** → "160126-001" |
| URL de rastreamento | **`codigo`** → "160126-001" |

---

## ❌ Se Está Vendo UUID no Frontend

**Problema:** O frontend está exibindo o `id` (UUID) ao invés do `codigo` (legível).

**Solução rápida:**
1. Abra seu componente React/Vue que exibe o pedido
2. Procure por `{pedido.id}` ou similar
3. Troque para `{pedido.codigo}`

**Exemplo:**
```jsx
// ❌ ERRADO - Mostra UUID
<div>Pedido: {pedido.id}</div>

// ✅ CORRETO - Mostra código legível
<div>Pedido: {pedido.codigo}</div>
```

---

## 🧪 Teste Rápido

### Criar Pedido via API
```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clienteId": "cli-123",
    "clientName": "João",
    "modeloTenis": "Nike",
    "servicos": [{"id": "1", "nome": "Limpeza", "preco": 50}],
    "dataPrevistaEntrega": "2026-01-23"
  }' | jq .
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",    ← UUID (interno)
    "codigo": "160126-001",                          ← CÓDIGO NOVO! ✨
    "clientName": "João",
    ...
  }
}
```

---

## 🔍 Verificar no seu Front

1. Crie um pedido de teste
2. Copie a resposta
3. Procure pelo campo `codigo`
4. Confirme que tem o formato `DDMMYY-XXX`

Se não aparece `codigo` na resposta, há um problema no backend. Se aparece mas o front está mostrando `id`, é problema do componente React/Vue.

---

## 📝 Resumo

```
UUID (id)          → Backend usa para buscar/atualizar
Código (codigo)    → Frontend mostra para o cliente

NUNCA mostrar para o cliente: 550e8400-e29b-41d4-a716-446655440000
SEMPRE mostrar para o cliente: 160126-001
```

---

## ✅ Checklist

- [ ] Backend gerando `codigo` corretamente (verificar console do backend)
- [ ] API retornando ambos `id` e `codigo` na resposta
- [ ] Frontend exibindo `codigo` (não `id`)
- [ ] Cliente recebendo número legível via WhatsApp/Email
- [ ] Pedidos antigos também mostram o novo `codigo` (se reexecutar service)
