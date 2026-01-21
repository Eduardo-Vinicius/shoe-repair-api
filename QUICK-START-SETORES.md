# 🚀 Quick Start - Sistema de Setores

## ⚡ Testando em 5 Minutos

### 1️⃣ Listar Setores Disponíveis

```bash
GET /setores

# Resposta:
[
  { "id": "atendimento-inicial", "nome": "Atendimento", "ordem": 1 },
  { "id": "sapataria", "nome": "Sapataria", "ordem": 2 },
  { "id": "costura", "nome": "Costura", "ordem": 3 },
  { "id": "lavagem", "nome": "Lavagem", "ordem": 4 },
  { "id": "acabamento", "nome": "Acabamento", "ordem": 5 },
  { "id": "pintura", "nome": "Pintura", "ordem": 6 },
  { "id": "atendimento-final", "nome": "Atendimento Final", "ordem": 7 }
]
```

### 2️⃣ Criar Pedido (Automático)

```bash
POST /pedidos
{
  "clienteId": "cliente123",
  "clientName": "João Silva",
  "modeloTenis": "Nike Air Max",
  "servicos": [
    { "id": "1", "nome": "Limpeza profunda", "preco": 50 },
    { "id": "2", "nome": "Costura lateral", "preco": 30 }
  ],
  "fotos": ["url1.jpg", "url2.jpg", "url3.jpg"],
  "precoTotal": 80,
  "valorSinal": 40,
  "dataPrevistaEntrega": "2026-01-30"
}

# O sistema AUTOMATICAMENTE:
# ✅ Determina setores: [Atendimento, Lavagem, Costura, Acabamento, Atendimento Final]
# ✅ Coloca no setor inicial: Atendimento
# ✅ Registra quem criou: createdBy
# ✅ Envia email de confirmação ao cliente
```

### 3️⃣ Mover Pedido Entre Setores

```bash
# Ver próximo setor
GET /pedidos/{pedidoId}/proximo-setor

# Mover para próximo setor
POST /pedidos/{pedidoId}/mover-setor
{
  "setorId": "lavagem"
}

# O sistema:
# ✅ Fecha setor anterior (registra tempo)
# ✅ Abre novo setor
# ✅ Atualiza status
# ✅ Se for Atendimento Final → Envia email automático de finalização
```

### 4️⃣ Ver Dashboard de Setores

```bash
GET /setores/estatisticas

# Resposta:
{
  "lavagem": {
    "nome": "Lavagem",
    "quantidade": 3,
    "pedidos": [
      { "codigo": "200126-001", "cliente": "João", "tempoNoSetor": 2 }
    ]
  },
  "costura": {
    "quantidade": 5,
    "pedidos": [...]
  }
}
```

---

## 📝 Exemplo Completo de Fluxo

```bash
# 1. CRIAR PEDIDO
POST /pedidos
{
  "clienteId": "abc",
  "clientName": "Maria",
  "modeloTenis": "Adidas",
  "servicos": [
    { "id": "1", "nome": "Limpeza", "preco": 50 }
  ]
}

# Resposta:
{
  "id": "pedido123",
  "codigo": "200126-001",
  "setorAtual": "atendimento-inicial",
  "setoresFluxo": ["atendimento-inicial", "lavagem", "acabamento", "atendimento-final"],
  "createdBy": {
    "userName": "João Atendente",
    "userEmail": "joao@empresa.com"
  }
}

# 2. MOVER PARA LAVAGEM
POST /pedidos/pedido123/mover-setor
{ "setorId": "lavagem" }

# 3. MOVER PARA ACABAMENTO
POST /pedidos/pedido123/mover-setor
{ "setorId": "acabamento" }

# 4. FINALIZAR (envia email automático)
POST /pedidos/pedido123/mover-setor
{ "setorId": "atendimento-final" }

# ✅ Cliente recebe email: "Seu pedido está pronto!"
```

---

## 🎨 Cores dos Setores (Para Frontend)

```javascript
const CORES = {
  'atendimento-inicial': '#2196F3',  // Azul
  'sapataria': '#FF9800',            // Laranja
  'costura': '#9C27B0',              // Roxo
  'lavagem': '#00BCD4',              // Ciano
  'acabamento': '#4CAF50',           // Verde
  'pintura': '#F44336',              // Vermelho
  'atendimento-final': '#4CAF50'     // Verde
};
```

---

## 🔧 Mudanças vs Versão Anterior

### Antes:
- ❌ Status livre (string qualquer)
- ❌ Sem controle de fluxo
- ❌ Não sabia quem criou
- ❌ Máximo 5 fotos

### Agora:
- ✅ Setores bem definidos
- ✅ Fluxo automático baseado em serviços
- ✅ Rastreamento completo (createdBy, histórico de setores)
- ✅ Até 8 fotos
- ✅ Tempo em cada setor calculado
- ✅ Email automático ao finalizar

---

## ⚠️ Importante

1. **Email obrigatório**: Cliente deve ter email cadastrado
2. **Setores automáticos**: Baseados nos serviços do pedido
3. **Atendimento Final**: Sempre dispara email de finalização
4. **Qualquer usuário pode mover**: Não há restrições de role (por enquanto)

---

## 📊 Campos Novos no Pedido

```javascript
// Ao buscar um pedido (GET /pedidos/:id)
{
  // NOVO: Quem criou
  "createdBy": {
    "userName": "João",
    "userEmail": "joao@empresa.com",
    "userRole": "atendimento"
  },
  
  // NOVO: Fluxo de setores
  "setoresFluxo": ["atendimento-inicial", "lavagem", ...],
  "setorAtual": "lavagem",
  
  // NOVO: Histórico de setores
  "setoresHistorico": [
    {
      "setorNome": "Atendimento",
      "entradaEm": "2026-01-20T08:00:00Z",
      "saidaEm": "2026-01-20T10:00:00Z",
      "usuarioEntradaNome": "João",
      "usuarioSaidaNome": "Pedro"
    },
    {
      "setorNome": "Lavagem",
      "entradaEm": "2026-01-20T10:00:00Z",
      "saidaEm": null  // Ainda está aqui
    }
  ]
}
```

---

## ✅ Tudo Pronto!

**Status**: Sistema de setores funcionando ✅  
**Notificações**: Apenas email (sem WhatsApp) ✅  
**Rastreamento**: completo (quem criou, quem moveu) ✅  
**Fotos**: Até 8 permitidas ✅  

Pode começar a usar! 🚀
