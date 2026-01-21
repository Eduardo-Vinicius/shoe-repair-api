# 🔍 Análise de Alterações Solicitadas

## 📊 Status Geral

| Item | Status | Complexidade | Prioridade |
|------|--------|--------------|------------|
| 1. Câmera no registro | ✅ Possível | Média | Alta |
| 2. Melhorar cadastro | ✅ Possível | Baixa | Alta |
| 3. Fluxo funcionário | ⚠️ Parcial | Média | Alta |
| 4. Email/WhatsApp | ⚠️ Atenção | Baixa | Alta |
| 5. Sistema de setores | ❌ Novo | Alta | **Crítica** |
| 6. Pós-venda automático | ✅ Possível | Média | Média |
| 7. Limpeza de dados | ✅ Possível | Baixa | Baixa |
| 8. Garantia sem valor | ✅ Possível | Baixa | Média |
| 9. Aba devolução | ✅ Possível | Média | Média |
| 10. Tela para TV | ✅ Possível | Média | Alta |

---

## 📝 Análise Detalhada por Item

### 1️⃣ Câmera no Registro do Pedido

**Status**: ✅ POSSÍVEL (Frontend)

**O que existe hoje**:
- Campo `fotos: [String]` aceita URLs
- Limite de 5 fotos (código backend)

**O que precisa**:
```javascript
// FRONTEND
- Adicionar input type="camera" ou capture="environment"
- Upload direto para S3 (sem armazenar no celular)
- Stream de câmera → Base64 → S3

// BACKEND (já pronto)
- Endpoint de upload já existe
- S3 configurado
```

**Implementação sugerida**:
```javascript
// Frontend: Captura direto da câmera
<input 
  type="file" 
  accept="image/*" 
  capture="environment" 
  onChange={uploadDiretoS3}
/>

// Ou usar biblioteca como react-camera-pro
// Upload em chunks para não sobrecarregar memória
```

**Esforço**: 2-3 horas (frontend)

---

### 2️⃣ Melhorar Cadastro de Pedido

**Status**: ✅ FÁCIL

#### A) Consulta por ID clara

**O que fazer**:
```javascript
// Backend (já existe)
GET /pedidos/:id
GET /pedidos  // Busca por código via query param

// Adicionar endpoint específico:
GET /pedidos/buscar?codigo=160126-001
```

#### B) Etiqueta com número menor

**O que fazer**:
- Hoje: `160126-001` (9 caracteres)
- Opção 1: Apenas sequencial `001` (3 caracteres)
- Opção 2: Híbrido `26-001` (6 caracteres) = Dia + Sequencial

**Sugestão**: Manter código completo no sistema, mas **imprimir apenas últimos 4 dígitos** na etiqueta:
```
ETIQUETA:
#0001
(Código completo: 160126-001)
```

**Esforço**: 30 minutos

---

### 3️⃣ Fluxo de Pedidos

#### A) Nome do funcionário que iniciou

**Status**: ⚠️ PARCIALMENTE EXISTE

**O que existe**:
```javascript
statusHistory: [{
  userName: "email@exemplo.com",  // ✅ JÁ EXISTE
  userId: "123",
  status: "...",
  date: "...",
  time: "..."
}]
```

**O que falta**:
```javascript
// Adicionar campo específico para criador
createdBy: {
  userId: String,
  userName: String,    // Nome completo
  userEmail: String,
  userRole: String
}
```

**Implementação**:
```javascript
// Backend: src/controllers/pedidoController.js
const novoPedido = await pedidoService.createPedido({
  ...dadosPedido,
  createdBy: {
    userId: req.user.sub,
    userName: req.user.name || req.user.email,  // Adicionar 'name' no JWT
    userEmail: req.user.email,
    userRole: req.user.role
  }
});
```

**Esforço**: 1 hora

#### B) Mover entre setores (qualquer login)

**Status**: ⚠️ VERIFICAR REGRAS DE NEGÓCIO

**O que existe**:
- Todas as roles podem alterar status (código atual)

**Questão**: Você quer:
1. **Opção A**: Qualquer um move para qualquer setor?
2. **Opção B**: Cada role só pode mover para setores específicos?

**Exemplo Opção B**:
```javascript
const permissoesPorRole = {
  atendimento: ['Sapataria', 'Costura', 'Lavagem'],
  sapataria: ['Acabamento', 'Pintura', 'Atendimento'],
  // ...
};
```

**Recomendação**: Opção B é mais segura e organizada.

**Esforço**: 2 horas (se implementar regras)

#### C) Aumentar fotos de 5 para 8

**Status**: ✅ TRIVIAL

**Onde alterar**:
```javascript
// Frontend: Validação
const MAX_FOTOS = 8;  // Era 5

// Backend: Não tem limite hard-coded, aceita array
// Apenas adicionar validação se quiser:
if (fotos.length > 8) {
  return res.status(400).json({ error: 'Máximo 8 fotos' });
}
```

**Esforço**: 5 minutos

---

### 4️⃣ Disparar WhatsApp → ⚠️ **ATENÇÃO: VOCÊ MIGROU PARA EMAIL!**

**Status**: ⚠️ CONFLITO COM MIGRAÇÃO RECENTE

**Você acabou de migrar de WhatsApp para SES (email)**. Opções:

#### Opção A: Manter Email (Recomendado)
- ✅ Custo 99% menor
- ✅ PDF já funciona
- ✅ Tudo implementado

```javascript
// Criar pedido → Email já envia
// Finalizado → Email já envia
```

#### Opção B: Voltar para WhatsApp
- ❌ Custo alto
- ⚠️ Reverter migração

#### Opção C: **HÍBRIDO (MELHOR)**
- Email: Todas as atualizações
- WhatsApp: Apenas pedido finalizado (usar API oficial)
- SMS: Pós-venda crítico

**Sugestão**: Manter email e adicionar WhatsApp apenas para:
1. Pedido criado (confirmação via WhatsApp Template)
2. Pedido finalizado (urgente via WhatsApp)

**PDF com fotos**: 
```javascript
// BACKEND: src/services/pdfService.js
// Adicionar fotos ao PDF já existe
// Só precisa garantir que está habilitado
```

**Esforço**: 
- Manter email: 0h
- Adicionar WhatsApp híbrido: 4-6h
- PDF com fotos: Já existe

---

### 5️⃣ **Sistema de Setores** ⭐ CRUCIAL

**Status**: ❌ PRECISA IMPLEMENTAR (MAIS IMPORTANTE)

**Problema atual**: 
- Status é string livre
- Não há controle de fluxo
- Não há validação de sequência

**Solução proposta**:

#### A) Modelo de Setores

```javascript
// src/models/setorModel.js (NOVO)
module.exports = {
  id: String,
  nome: String,
  ordem: Number,  // Sequência no fluxo
  obrigatorio: Boolean,
  cor: String,
  icone: String
};

// Setores fixos:
const SETORES_PADRAO = [
  { id: '1', nome: 'Atendimento', ordem: 1, obrigatorio: true },
  { id: '2', nome: 'Sapataria', ordem: 2, obrigatorio: false },
  { id: '3', nome: 'Costura', ordem: 3, obrigatorio: false },
  { id: '4', nome: 'Lavagem', ordem: 4, obrigatorio: false },
  { id: '5', nome: 'Acabamento', ordem: 5, obrigatorio: false },
  { id: '6', nome: 'Pintura', ordem: 6, obrigatorio: false },
  { id: '7', nome: 'Atendimento Final', ordem: 7, obrigatorio: true }
];
```

#### B) Atualizar Modelo de Pedido

```javascript
// src/models/pedidoModel.js (ADICIONAR)
module.exports = {
  // ... campos existentes ...
  
  // NOVO: Fluxo de setores
  setoresFluxo: [String],  // IDs dos setores que o pedido vai passar
  setorAtual: String,      // ID do setor atual
  setoresHistorico: [{     // Histórico de passagem pelos setores
    setorId: String,
    setorNome: String,
    entradaEm: String,     // ISO date
    saidaEm: String,       // ISO date (null se ainda está)
    usuarioEntrada: String,
    usuarioSaida: String,
    observacoes: String
  }],
  
  // Para compatibilidade
  status: String,  // Mantém para não quebrar
  departamento: String  // Mantém para não quebrar
};
```

#### C) Lógica de Fluxo

```javascript
// src/services/setorService.js (NOVO)
class SetorService {
  
  // Ao criar pedido, definir setores
  async definirSetoresPedido(servicos) {
    const setores = ['Atendimento'];  // Sempre começa aqui
    
    // Baseado nos serviços, adiciona setores necessários
    servicos.forEach(servico => {
      if (servico.nome.includes('Costura')) setores.push('Costura');
      if (servico.nome.includes('Limpeza')) setores.push('Lavagem');
      if (servico.nome.includes('Pintura')) setores.push('Pintura');
      // ...
    });
    
    setores.push('Acabamento');  // Sempre passa
    setores.push('Atendimento Final');  // Sempre termina aqui
    
    return [...new Set(setores)];  // Remove duplicados
  }
  
  // Mover pedido para próximo setor
  async moverParaSetor(pedidoId, novoSetorId, userId) {
    const pedido = await getPedido(pedidoId);
    const setorAnterior = pedido.setorAtual;
    
    // Validar se setor está no fluxo
    if (!pedido.setoresFluxo.includes(novoSetorId)) {
      throw new Error('Setor não está no fluxo deste pedido');
    }
    
    // Fechar setor anterior
    const historicoAtual = pedido.setoresHistorico.find(
      h => h.setorId === setorAnterior && !h.saidaEm
    );
    if (historicoAtual) {
      historicoAtual.saidaEm = new Date().toISOString();
      historicoAtual.usuarioSaida = userId;
    }
    
    // Abrir novo setor
    pedido.setoresHistorico.push({
      setorId: novoSetorId,
      setorNome: getSetorNome(novoSetorId),
      entradaEm: new Date().toISOString(),
      saidaEm: null,
      usuarioEntrada: userId,
      usuarioSaida: null,
      observacoes: ''
    });
    
    pedido.setorAtual = novoSetorId;
    
    // Se chegou no Atendimento Final, dispara email
    if (novoSetorId === '7') {  // Atendimento Final
      await enviarEmailFinalizado(pedido);
    }
    
    return updatePedido(pedidoId, pedido);
  }
  
  // Verificar se pode mover
  canMoverPara(pedido, novoSetor, userRole) {
    // Lógica de permissões por role
    return true;
  }
}
```

#### D) Frontend: Steps/Progress

```javascript
// Frontend: Componente de Steps
<PedidoSteps 
  setores={pedido.setoresFluxo}
  atual={pedido.setorAtual}
  historico={pedido.setoresHistorico}
/>

// Renderiza:
[✅ Atendimento] → [✅ Lavagem] → [🔄 Acabamento] → [⏳ Atendimento Final]
```

**Esforço**: 8-12 horas (backend + frontend)

---

### 6️⃣ Pós-Venda Automático (3 dias após entrega)

**Status**: ✅ POSSÍVEL

**Implementação**:

```javascript
// src/services/posVendaService.js (NOVO)
const AWS = require('aws-sdk');
const eventbridge = new AWS.EventBridge();

async function agendarPosVenda(pedidoId, dataEntrega) {
  // Calcular data de envio (3 dias depois)
  const dataEnvio = new Date(dataEntrega);
  dataEnvio.setDate(dataEnvio.getDate() + 3);
  
  // Agendar evento no EventBridge
  await eventbridge.putRule({
    Name: `pos-venda-${pedidoId}`,
    ScheduleExpression: `at(${dataEnvio.toISOString()})`,
    State: 'ENABLED'
  }).promise();
  
  // Ou usar cron que roda diariamente
  // e verifica pedidos com dataEntrega = hoje - 3 dias
}

async function enviarPosVenda(pedidoId) {
  const pedido = await getPedido(pedidoId);
  const cliente = await getCliente(pedido.clienteId);
  
  // Email de pós-venda (ou WhatsApp se implementar)
  await emailService.enviarEmailPosVenda(
    cliente.email,
    cliente.nome,
    pedido.codigo,
    `https://seusite.com/feedback/${pedidoId}`
  );
}

// Função cron diária (mais simples)
async function processarPosVendasDoDia() {
  const tresDiasAtras = new Date();
  tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
  
  const pedidos = await listarPedidos({
    dataEntregaReal: tresDiasAtras.toISOString().split('T')[0],
    posVendaEnviado: false
  });
  
  for (const pedido of pedidos) {
    await enviarPosVenda(pedido.id);
    await updatePedido(pedido.id, { posVendaEnviado: true });
  }
}
```

**Adicionar ao modelo**:
```javascript
// pedidoModel.js
posVenda: {
  enviado: Boolean,
  dataEnvio: String,
  feedbackRecebido: Boolean,
  nota: Number,  // 1-5
  comentario: String
}
```

**Esforço**: 4-6 horas

---

### 7️⃣ Limpeza de Base de Dados (1 ano)

**Status**: ✅ FÁCIL

```javascript
// src/services/limpezaService.js (NOVO)
async function limparPedidosAntigos() {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  
  // Buscar pedidos antigos
  const pedidosAntigos = await dynamoDB.scan({
    TableName: 'shoe-repair-pedidos',
    FilterExpression: 'dataCriacao < :dataLimite',
    ExpressionAttributeValues: {
      ':dataLimite': umAnoAtras.toISOString()
    }
  }).promise();
  
  // Arquivar ou deletar
  for (const pedido of pedidosAntigos.Items) {
    // Opção A: Mover para tabela de arquivo
    await arquivarPedido(pedido);
    
    // Opção B: Deletar (cuidado!)
    // await deletePedido(pedido.id);
  }
}

// Rodar via EventBridge (mensal)
// ou manualmente via endpoint admin
```

**Endpoint admin**:
```javascript
// POST /admin/limpar-dados-antigos
// Requer autenticação de admin
```

**Esforço**: 2-3 horas

---

### 8️⃣ Garantia - Remover Valor

**Status**: ✅ TRIVIAL

**Onde alterar**:
```javascript
// Frontend: Remover campo de preço da garantia
// Apenas manter: ativa (boolean), duracao, data

// Backend: src/models/pedidoModel.js
garantia: {
  ativa: Boolean,
  // preco: Number,  ← REMOVER
  duracao: String,  // Ex: "90 dias"
  data: String      // Data de início
}
```

**Esforço**: 5 minutos

---

### 9️⃣ Aba Devolução

**Status**: ✅ POSSÍVEL

**Conceito**: 
- Pedido finalizado com problema
- Cliente devolve
- Volta para setor específico (Lavagem, Costura, etc.)

**Implementação**:

```javascript
// src/models/pedidoModel.js (ADICIONAR)
devolucoes: [{
  dataDevolvida: String,
  motivo: String,
  usuarioRecebeu: String,
  setorRetorno: String,  // Para onde foi devolvido
  resolvido: Boolean,
  dataResolucao: String,
  observacoes: String
}]

// Endpoint
// POST /pedidos/:id/devolver
async devolver(req, res) {
  const { motivo, setorRetorno } = req.body;
  
  const pedido = await getPedido(req.params.id);
  
  // Adicionar devolução
  pedido.devolucoes = pedido.devolucoes || [];
  pedido.devolucoes.push({
    dataDevolvida: new Date().toISOString(),
    motivo,
    usuarioRecebeu: req.user.email,
    setorRetorno,
    resolvido: false,
    dataResolucao: null,
    observacoes: ''
  });
  
  // Mover pedido para setor específico
  await setorService.moverParaSetor(
    req.params.id, 
    setorRetorno, 
    req.user.sub
  );
  
  // Alterar status
  pedido.status = 'Devolvido - Em Correção';
  
  await updatePedido(req.params.id, pedido);
  
  res.json({ success: true });
}
```

**Frontend**: Nova aba "Devoluções" no dashboard

**Esforço**: 3-4 horas

---

### 🔟 Tela de Resumo para TV

**Status**: ✅ POSSÍVEL

**Implementação**:

```javascript
// src/controllers/dashboardController.js (ADICIONAR)
// GET /dashboard/tv?setor=Lavagem

async tvDashboard(req, res) {
  const { setor } = req.query;
  
  let query = {};
  if (setor) {
    query.setorAtual = setor;
  }
  
  const pedidos = await listarPedidos(query);
  
  // Agrupar por setor
  const resumo = {
    total: pedidos.length,
    porSetor: {},
    urgentes: pedidos.filter(p => isUrgente(p)),
    atrasados: pedidos.filter(p => isAtrasado(p))
  };
  
  SETORES_PADRAO.forEach(setor => {
    const pedidosSetor = pedidos.filter(p => p.setorAtual === setor.id);
    resumo.porSetor[setor.nome] = {
      quantidade: pedidosSetor.length,
      pedidos: pedidosSetor.map(p => ({
        codigo: p.codigo,
        cliente: p.clientName,
        tempoNoSetor: calcularTempo(p)
      }))
    };
  });
  
  res.json(resumo);
}

// Frontend: Tela fullscreen auto-refresh
// <TVDashboard setor={setor} autoRefresh={30000} />
```

**Features**:
- Auto-refresh a cada 30s
- Cards grandes e coloridos
- Filtro por setor
- Destaque para urgentes/atrasados
- Gráficos em tempo real

**Esforço**: 6-8 horas (backend + frontend)

---

## 🎯 Plano de Implementação Sugerido

### Fase 1: CRÍTICO (Fazer Primeiro) 🔥

1. **Sistema de Setores** (8-12h)
   - Modelo de setores
   - Fluxo automático
   - Histórico de passagem
   - Frontend: Steps/Progress

2. **Nome do Funcionário** (1h)
   - Campo `createdBy`
   - Mostrar em listagens

3. **Aumentar Fotos para 8** (5min)

### Fase 2: IMPORTANTE (Próxima Sprint) ⚡

4. **Tela TV** (6-8h)
   - Dashboard tempo real
   - Filtros por setor

5. **Câmera Direta** (2-3h frontend)
   - Upload direto S3
   - Sem armazenar localmente

6. **Melhorar Cadastro** (30min)
   - Busca por código
   - Etiqueta menor

### Fase 3: MELHORIAS (Médio Prazo) 📈

7. **Aba Devolução** (3-4h)
8. **Garantia sem valor** (5min)
9. **Pós-Venda Automático** (4-6h)

### Fase 4: MANUTENÇÃO (Baixa Prioridade) 🔧

10. **Limpeza de Dados** (2-3h)
11. **WhatsApp Híbrido** (4-6h) - Apenas se realmente necessário

---

## ⚠️ Questões para Definir

### 1. Email vs WhatsApp

**Você acabou de migrar para email**. Quer:
- [ ] A) Manter apenas email (economizar)
- [ ] B) Adicionar WhatsApp para eventos críticos (híbrido)
- [ ] C) Voltar totalmente para WhatsApp (não recomendado)

### 2. Permissões de Setores

- [ ] A) Qualquer um move para qualquer setor
- [ ] B) Cada role só pode mover para setores específicos
- [ ] C) Apenas admin move entre setores

### 3. Fluxo de Setores

**Opção 1**: Setores fixos automáticos (baseado em serviços)
**Opção 2**: Usuário escolhe setores ao criar pedido
**Opção 3**: Híbrido (sugestão automática + manual)

Qual prefere?

### 4. Pós-Venda

- [ ] Via email
- [ ] Via WhatsApp (se implementar híbrido)
- [ ] Via SMS
- [ ] Formulário web (link no email)

---

## 📋 Checklist de Campos que Faltam

### Modelo de Pedido - Adicionar:

```javascript
// ✅ Já existe
- updatedBy
- statusHistory
- fotos (aumentar limite para 8)

// ❌ Precisa adicionar
- createdBy: { userId, userName, userEmail, userRole }
- setoresFluxo: [String]
- setorAtual: String
- setoresHistorico: [...]
- devolucoes: [...]
- posVenda: { enviado, dataEnvio, feedbackRecebido, nota, comentario }

// 🔧 Modificar
- garantia.preco (REMOVER)
```

---

## 💡 Recomendações Finais

### Prioridade MÁXIMA:
1. **Sistema de Setores** - É a base de tudo
2. **Nome do Funcionário** - Rastreabilidade
3. **Tela TV** - Gestão visual em tempo real

### Quick Wins (fazer já):
- Aumentar fotos para 8 (5 minutos)
- Remover valor da garantia (5 minutos)
- Melhorar busca por código (30 minutos)

### Pode Esperar:
- Limpeza de dados (não urgente)
- WhatsApp híbrido (avaliar custo x benefício)

### Cuidado:
- **NÃO** remover campo `status` atual (pode quebrar)
- **NÃO** deletar `whatsappService.js` (pode voltar a precisar)
- **TESTAR** muito antes de mudar sistema de setores

---

## 📞 Próximo Passo

Me diga:
1. Qual alteração quer que eu implemente primeiro?
2. Precisa de código exemplo de alguma?
3. Tem dúvidas sobre alguma implementação?

Posso começar pelo **Sistema de Setores** que é o mais complexo e importante! 🚀
