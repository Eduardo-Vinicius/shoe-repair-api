# Alterações no Backend - Shoe Repair API

Fizemos melhorias no sistema de pedidos. Seguem as mudanças que precisam ser implementadas no frontend:

## 1. CAMPOS NOVOS NO PEDIDO

Ao buscar um pedido (GET `/pedidos` ou `/pedidos/:id`), agora você recebe:

```json
{
  "id": "uuid",
  "codigo": "220126-001",
  "clientName": "João Silva",
  "status": "Atendimento - Recebido",
  
  // NOVO: Informações de quem criou
  "createdBy": {
    "userId": "user-123",
    "userName": "Maria Santos",
    "userEmail": "maria@empresa.com",
    "userRole": "admin"
  },
  
  // NOVO: Sistema de setores (pode estar vazio)
  "setorAtual": "lavagem",
  "setoresFluxo": ["atendimento", "lavagem", "acabamento"],
  "setoresHistorico": [
    {
      "setorId": "atendimento",
      "setorNome": "Atendimento",
      "entradaEm": "2026-01-22T10:00:00Z",
      "saidaEm": "2026-01-22T11:30:00Z",
      "usuarioEntradaNome": "Maria Santos",
      "observacoes": "Pedido criado"
    }
  ],
  
  // LIMITE AUMENTADO: agora aceita até 8 fotos
  "fotos": ["url1", "url2", "...até 8"]
}
```

## 2. IMPLEMENTAÇÕES NECESSÁRIAS

### A) Exibir "Criado por"
- Na listagem de pedidos, adicione coluna: **"Criado por"**
- Exibir: `pedido.createdBy.userName`
- Tooltip com email completo se quiser

### B) Atualizar upload de fotos
- Máximo de **8 fotos** (antes era 5)
- Validar no frontend antes de enviar
- Backend rejeita se enviar mais de 8

### C) Histórico de setores (opcional por enquanto)
- Se `setoresHistorico` não estiver vazio, mostrar timeline
- Exibir: setor → data entrada → data saída → quem moveu
- Pode deixar para segunda fase

### D) Setor atual (opcional)
- Se `setorAtual` existir, exibir badge ao lado do status
- Muitos pedidos não terão esse campo preenchido ainda

## 3. NADA MUDA NO CREATE

O POST `/pedidos` continua igual, mas agora o backend preenche automaticamente:
- `createdBy` com dados do usuário logado (do token JWT)
- `status` inicial como **"Atendimento - Recebido"**

Você não precisa enviar esses campos.

## 4. EXEMPLO DE EXIBIÇÃO

```jsx
// Componente de card do pedido
<OrderCard>
  <OrderCode>{pedido.codigo}</OrderCode>
  <Client>{pedido.clientName}</Client>
  <Status>{pedido.status}</Status>
  
  {/* NOVO */}
  <CreatedBy>
    Criado por: {pedido.createdBy.userName}
  </CreatedBy>
  
  {/* NOVO - se existir */}
  {pedido.setorAtual && (
    <CurrentSector>Setor: {pedido.setorAtual}</CurrentSector>
  )}
</OrderCard>

// Upload de fotos
<PhotoUpload 
  maxPhotos={8} // Era 5, agora é 8
  photos={photos}
  onUpload={handleUpload}
/>
```

## 5. PRIORIDADE

### ✅ Obrigatório agora:
- Exibir `createdBy.userName` na listagem/detalhes
- Aceitar até **8 fotos** no upload (validação)

### ⏳ Pode implementar depois:
- Visualização de `setoresHistorico` (timeline bonita)
- Exibição de `setorAtual` (badge/tag)

---

## 11. SISTEMA DE PRIORIDADES

### 📌 Novo campo: Prioridade

Cada pedido agora tem um nível de prioridade para organização no board.

**Valores aceitos:**
- `1` ou `"I"` - Prioridade Alta (vermelho)
- `2` ou `"II"` - Prioridade Média (amarelo) - **PADRÃO**
- `3` ou `"III"` - Prioridade Baixa (verde)

### ✅ No cadastro de pedido (POST /pedidos)

Adicione campo `prioridade` (opcional):

```json
{
  "clienteId": "123",
  "clientName": "João Silva",
  "modeloTenis": "Nike Air",
  "servicos": [...],
  "prioridade": 1
}
```

Se não enviar, assume prioridade **2 (Média)** por padrão.

### 📊 Ordenação automática no board

**GET /pedidos retorna ordenado por:**
1. **Prioridade** (alta → média → baixa)
2. **Data de criação** (mais recente primeiro)

### 🎨 Sugestão de UI

**No formulário de cadastro:**
```jsx
<Select label="Prioridade" name="prioridade">
  <option value={1}>Alta (I)</option>
  <option value={2} selected>Média (II)</option>
  <option value={3}>Baixa (III)</option>
</Select>
```

**No card do pedido:**
```jsx
const getPrioridadeColor = (prioridade) => {
  if (prioridade === 1) return 'bg-red-500';
  if (prioridade === 2) return 'bg-yellow-500';
  return 'bg-green-500';
};

<Badge className={getPrioridadeColor(pedido.prioridade)}>
  {prioridade === 1 ? 'I' : prioridade === 2 ? 'II' : 'III'}
</Badge>
```

---

## 6. EXEMPLO COMPLETO DE RESPOSTA DA API

```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "codigo": "220126-001",
      "clientName": "João Silva",
      "clientCpf": "123.456.789-00",
      "modeloTenis": "Nike Air Max",
      "status": "Atendimento - Recebido",
      "servicos": [
        {
          "id": "serv-1",
          "nome": "Limpeza Completa",
          "preco": 150
        }
      ],
      "precoTotal": 150,
      "valorSinal": 50,
      "valorRestante": 100,
      "fotos": [
        "https://s3.amazonaws.com/foto1.jpg",
        "https://s3.amazonaws.com/foto2.jpg"
      ],
      "dataCriacao": "2026-01-22T10:00:00Z",
      "dataPrevistaEntrega": "2026-01-30",
      "createdBy": {
        "userId": "user-456",
        "userName": "Maria Santos",
        "userEmail": "maria@empresa.com",
        "userRole": "admin"
      },
      "setorAtual": null,
      "setoresFluxo": [],
      "setoresHistorico": []
    }
  ]
}
```

## 7. VALIDAÇÕES NO FRONTEND

```javascript
// Validar fotos antes de enviar
if (fotos.length > 8) {
  showError('Máximo de 8 fotos permitidas');
  return;
}

// Exibir criado por (sempre existirá)
const criador = pedido.createdBy?.userName || 'Sistema';

// Verificar se tem setores (opcional)
const temSetores = pedido.setoresHistorico && pedido.setoresHistorico.length > 0;
```

## 8. CAMPOS QUE SEMPRE VIRÃO PREENCHIDOS

Esses campos **sempre** estarão presentes na resposta:
- `createdBy.userId`
- `createdBy.userName`
- `createdBy.userEmail`
- `createdBy.userRole`
- `setoresFluxo` (array, pode estar vazio `[]`)
- `setorAtual` (string, pode ser `null`)
- `setoresHistorico` (array, pode estar vazio `[]`)

## 9. RETROCOMPATIBILIDADE

Pedidos antigos (criados antes dessa atualização) podem não ter `createdBy`. Trate assim:

```javascript
const criador = pedido.createdBy?.userName || 'Usuário Legado';
```

---

**Qualquer dúvida, me avisa!**

---

## 10. SISTEMA DE DRAG & DROP - MOVIMENTAÇÃO ENTRE COLUNAS

### ✅ SISTEMA CORRETO: Dialog para informar funcionário

Como o sistema **não tem cadastro individual de funcionários** (apenas login por departamento), você **DEVE perguntar** quem está movendo o pedido.

### ✅ FAÇA ASSIM:

**Com Dialog obrigatório (correto)**
```javascript
async function onDropCard(pedidoId, novoSetorId) {
  // 1. Abrir dialog para capturar informações
  const { funcionarioNome, observacao } = await showDialog();
  
  if (!funcionarioNome) {
    toast.error('Nome do funcionário é obrigatório');
    return;
  }
  
  // 2. Enviar para o backend
  try {
    const response = await fetch(`/pedidos/${pedidoId}/mover-setor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        setorId: novoSetorId,           // ✅ OBRIGATÓRIO
        funcionarioNome: funcionarioNome, // ✅ OBRIGATÓRIO
        observacao: observacao || ''      // ⚪ OPCIONAL
      })
    });
    
    const data = await response.json();
    toast.success('Pedido movido com sucesso!');
  } catch (error) {
    toast.error('Erro ao mover pedido');
  }
}
```

### 📋 Estrutura da Requisição

**Endpoint:** `POST /pedidos/:id/mover-setor`

**Headers obrigatórios:**
```javascript
{
  "Authorization": "Bearer SEU_TOKEN_JWT",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "setorId": "lavagem",                    // ✅ OBRIGATÓRIO
  "funcionarioNome": "João Silva",         // ✅ OBRIGATÓRIO - Nome de quem está movendo
  "observacao": "Cliente aguardando"       // ⚪ OPCIONAL - Observação sobre a movimentação
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Pedido movido para o setor com sucesso",
  "data": {
    "setorAtual": "lavagem",
    "setoresHistorico": [
      {
        "setorNome": "Atendimento",
        "entradaEm": "2026-01-22T10:00:00Z",
        "saidaEm": "2026-01-22T11:30:00Z",
        "funcionarioEntrada": "Maria Santos",    // ✅ Nome informado no dialog
        "funcionarioSaida": "João Silva",        // ✅ Nome de quem moveu
        "observacoes": "Pedido recebido"
      },
      {
        "setorNome": "Lavagem",
        "entradaEm": "2026-01-22T11:30:00Z",
        "saidaEm": null,
        "funcionarioEntrada": "João Silva",      // ✅ Nome atual
        "funcionarioSaida": null,
        "observacoes": "Cliente aguardando"
      }
    ]
  }
}
```

### 🎯 Instruções para o Frontend

**O que você DEVE fazer:**
1. ✅ Ao arrastar card, **abrir dialog** com campos:
   - **Funcionário** (input text) - OBRIGATÓRIO
   - **Observação** (textarea) - OPCIONAL
2. ✅ Validar que `funcionarioNome` não está vazio
3. ✅ Chamar `POST /pedidos/:id/mover-setor` com ambos os campos
4. ✅ Incluir token JWT no header Authorization

**Validações obrigatórias:**
```javascript
if (!funcionarioNome || funcionarioNome.trim() === '') {
  toast.error('Nome do funcionário é obrigatório');
  return false;
}
```

### 🏆 Rastreamento de Produtividade

O backend rastreia automaticamente:
- **Qual funcionário** moveu cada pedido (campo `funcionarioEntrada` e `funcionarioSaida`)
- Quantos pedidos cada funcionário processou
- Tempo de cada funcionário em cada setor
- Histórico completo de movimentações

**Campos salvos no histórico:**
- `funcionarioEntrada` - Nome do funcionário que moveu para este setor
- `funcionarioSaida` - Nome do funcionário que moveu para o próximo setor
- `entradaEm` - Data/hora de entrada
- `saidaEm` - Data/hora de saída
- `observacoes` - Observação informada

Para ver estatísticas gerais:
```
GET /setores/estatisticas
```

**Exemplo de análise de produtividade:**
```javascript
// Contar quantos pedidos cada funcionário moveu
const produtividade = {};
pedido.setoresHistorico.forEach(historico => {
  const func = historico.funcionarioEntrada;
  if (func) {
    produtividade[func] = (produtividade[func] || 0) + 1;
  }
});

console.log(produtividade);
// { "João Silva": 15, "Maria Santos": 23, ... }
```

### 📝 IDs de Setores Disponíveis

Use esses valores para `setorId`:
- `"atendimento-inicial"` - Atendimento Inicial
- `"sapataria"` - Sapataria
- `"costura"` - Costura
- `"lavagem"` - Lavagem
- `"pintura"` - Pintura
- `"acabamento"` - Acabamento
- `"atendimento-final"` - Atendimento Final

### 🔧 Exemplo Completo com React

```typescript
// page.tsx - Dialog Component
function MoverPedidoDialog({ pedido, novoSetor, onConfirm, onCancel }) {
  const [funcionarioNome, setFuncionarioNome] = useState('');
  const [observacao, setObservacao] = useState('');
  
  const handleConfirm = () => {
    if (!funcionarioNome.trim()) {
      toast.error('Nome do funcionário é obrigatório');
      return;
    }
    onConfirm(funcionarioNome, observacao);
  };
  
  return (
    <Dialog open={true} onClose={onCancel}>
      <DialogTitle>
        Mover pedido para {novoSetor}
      </DialogTitle>
      <DialogContent>
        <Input
          label="Funcionário *"
          placeholder="Nome do funcionário"
          value={funcionarioNome}
          onChange={(e) => setFuncionarioNome(e.target.value)}
          required
        />
        <Textarea
          label="Observação (opcional)"
          placeholder="Ex: Cliente aguardando..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="primary">
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// page.tsx - Drag & Drop Handler
async function handleCardDrop(pedidoId: string, novoSetorId: string) {
  // 1. Abrir dialog
  const result = await openDialog(pedidoId, novoSetorId);
  
  if (!result) return; // Cancelou
  
  const { funcionarioNome, observacao } = result;
  
  // 2. Chamar API
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(
      `${API_URL}/pedidos/${pedidoId}/mover-setor`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          setorId: novoSetorId,
          funcionarioNome: funcionarioNome,
          observacao: observacao || ''
        })
      }
    );
    
    if (!response.ok) {
      throw new Error('Erro ao mover pedido');
    }
    
    const data = await response.json();
    
    toast.success(`Pedido movido por ${funcionarioNome}!`);
    
    // Atualizar UI
    updateOrderInState(data.data);
    
  } catch (error) {
    toast.error('Erro ao mover pedido');
    console.error(error);
    // Reverter drag visualmente
  }
}
```

### ⚠️ Validações no Backend

O backend valida automaticamente:
- ✅ Token JWT válido (senão retorna 401)
- ✅ Setor existe
- ✅ Usuário tem permissão
- ✅ Pedido existe

Se algo falhar, você recebe:
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```
