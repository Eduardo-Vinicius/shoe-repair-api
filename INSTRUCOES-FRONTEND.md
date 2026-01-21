# 🎨 INSTRUÇÕES PARA FRONTEND - Sistema de Setores

## 📋 Contexto

O backend foi atualizado com um sistema completo de setores para controlar o fluxo de pedidos. Preciso que você implemente as seguintes mudanças no frontend React.

---

## ✅ MUDANÇAS NO BACKEND QUE IMPACTAM O FRONTEND

### 1. Sistema de Setores
Cada pedido agora passa por setores específicos automaticamente determinados pelos serviços.

### 2. Limite de Fotos
Aumentado de 5 para **8 fotos** por pedido.

### 3. Campo createdBy
Todos os pedidos agora têm informação de quem criou.

### 4. Notificações por Email
WhatsApp foi removido, agora usa apenas email (transparente para o frontend).

---

## 🎯 IMPLEMENTAÇÕES NECESSÁRIAS

## 1️⃣ ATUALIZAR FORMULÁRIO DE CRIAÇÃO DE PEDIDO

### Aumentar limite de fotos de 5 para 8

**Arquivo**: `src/components/PedidoForm.jsx` (ou similar)

**Mudança**:
```javascript
// ANTES:
const MAX_FOTOS = 5;

// DEPOIS:
const MAX_FOTOS = 8;
```

**Validação**:
```javascript
if (fotos.length > 8) {
  toast.error('Máximo de 8 fotos permitidas');
  return;
}
```

---

## 2️⃣ CRIAR COMPONENTE DE VISUALIZAÇÃO DE SETORES

### Componente: SetorProgress / SetorStepper

Crie um componente para mostrar o progresso do pedido pelos setores.

**Novo arquivo**: `src/components/SetorProgress.jsx`

```jsx
import React from 'react';
import { CheckCircle, Clock, Circle } from 'lucide-react';

const SetorProgress = ({ pedido }) => {
  const { setoresFluxo, setorAtual, setoresHistorico } = pedido;

  const getSetorStatus = (setorId) => {
    const historico = setoresHistorico.find(h => h.setorId === setorId);
    
    if (!historico) return 'pending'; // Ainda não chegou
    if (historico.saidaEm) return 'completed'; // Já passou
    return 'current'; // Está neste setor
  };

  const getSetorIcon = (status) => {
    switch(status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'current':
        return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />;
      default:
        return <Circle className="w-6 h-6 text-gray-300" />;
    }
  };

  const SETORES_NOMES = {
    'atendimento-inicial': 'Atendimento',
    'sapataria': 'Sapataria',
    'costura': 'Costura',
    'lavagem': 'Lavagem',
    'acabamento': 'Acabamento',
    'pintura': 'Pintura',
    'atendimento-final': 'Finalizado'
  };

  const SETORES_CORES = {
    'atendimento-inicial': '#2196F3',
    'sapataria': '#FF9800',
    'costura': '#9C27B0',
    'lavagem': '#00BCD4',
    'acabamento': '#4CAF50',
    'pintura': '#F44336',
    'atendimento-final': '#4CAF50'
  };

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {setoresFluxo.map((setorId, index) => {
          const status = getSetorStatus(setorId);
          const isLast = index === setoresFluxo.length - 1;

          return (
            <React.Fragment key={setorId}>
              <div className="flex flex-col items-center">
                {/* Ícone do setor */}
                <div 
                  className="flex items-center justify-center w-12 h-12 rounded-full"
                  style={{ 
                    backgroundColor: status === 'pending' ? '#f0f0f0' : SETORES_CORES[setorId] + '20',
                    border: `2px solid ${status === 'pending' ? '#ddd' : SETORES_CORES[setorId]}`
                  }}
                >
                  {getSetorIcon(status)}
                </div>
                
                {/* Nome do setor */}
                <span 
                  className={`mt-2 text-xs font-medium ${
                    status === 'current' ? 'text-blue-600' : 
                    status === 'completed' ? 'text-green-600' : 
                    'text-gray-400'
                  }`}
                >
                  {SETORES_NOMES[setorId]}
                </span>
                
                {/* Tempo no setor (se completado) */}
                {status === 'completed' && (
                  <span className="text-xs text-gray-400 mt-1">
                    {calcularTempo(setorId, setoresHistorico)}
                  </span>
                )}
              </div>

              {/* Linha conectora */}
              {!isLast && (
                <div 
                  className="flex-1 h-1 mx-2"
                  style={{ 
                    backgroundColor: status === 'completed' ? SETORES_CORES[setorId] : '#ddd'
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Função auxiliar para calcular tempo
const calcularTempo = (setorId, historico) => {
  const setor = historico.find(h => h.setorId === setorId);
  if (!setor || !setor.saidaEm) return '';
  
  const entrada = new Date(setor.entradaEm);
  const saida = new Date(setor.saidaEm);
  const horas = Math.floor((saida - entrada) / (1000 * 60 * 60));
  
  if (horas < 1) return 'menos de 1h';
  if (horas === 1) return '1h';
  return `${horas}h`;
};

export default SetorProgress;
```

**Uso**:
```jsx
// Em PedidoDetalhes.jsx ou PedidoCard.jsx
import SetorProgress from './SetorProgress';

<SetorProgress pedido={pedido} />
```

---

## 3️⃣ ADICIONAR BOTÃO PARA MOVER ENTRE SETORES

### Componente: MoverSetorButton

**Novo arquivo**: `src/components/MoverSetorButton.jsx`

```jsx
import React, { useState } from 'react';
import axios from 'axios';
import { ArrowRight, Loader } from 'lucide-react';
import { toast } from 'react-toastify';

const MoverSetorButton = ({ pedido, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [proximoSetor, setProximoSetor] = useState(null);

  // Buscar próximo setor
  React.useEffect(() => {
    const buscarProximoSetor = async () => {
      try {
        const response = await axios.get(
          `/pedidos/${pedido.id}/proximo-setor`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProximoSetor(response.data.data);
      } catch (error) {
        console.error('Erro ao buscar próximo setor:', error);
      }
    };

    buscarProximoSetor();
  }, [pedido.id]);

  const moverParaProximoSetor = async () => {
    if (!proximoSetor) {
      toast.info('Pedido já está no último setor');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `/pedidos/${pedido.id}/mover-setor`,
        { setorId: proximoSetor.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Pedido movido para ${proximoSetor.nome}`);
      
      // Se chegou ao final, mostrar mensagem especial
      if (proximoSetor.id === 'atendimento-final') {
        toast.success('🎉 Pedido finalizado! Email enviado ao cliente.');
      }

      if (onSuccess) onSuccess(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao mover pedido');
    } finally {
      setLoading(false);
    }
  };

  // Se não há próximo setor, não mostrar botão
  if (!proximoSetor) {
    return (
      <div className="text-sm text-green-600 font-medium">
        ✓ Pedido finalizado
      </div>
    );
  }

  return (
    <button
      onClick={moverParaProximoSetor}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          Movendo...
        </>
      ) : (
        <>
          Avançar para {proximoSetor.nome}
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
};

export default MoverSetorButton;
```

**Uso**:
```jsx
// Em PedidoDetalhes.jsx
import MoverSetorButton from './MoverSetorButton';

<MoverSetorButton 
  pedido={pedido} 
  onSuccess={(pedidoAtualizado) => {
    setPedido(pedidoAtualizado);
    // Atualizar lista de pedidos
  }}
/>
```

---

## 4️⃣ MOSTRAR INFORMAÇÃO DE QUEM CRIOU O PEDIDO

### Em PedidoDetalhes.jsx

Adicione uma seção mostrando quem criou o pedido:

```jsx
{pedido.createdBy && (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="text-sm font-medium text-gray-700 mb-2">
      Informações de Criação
    </h3>
    <div className="space-y-1 text-sm">
      <p>
        <span className="text-gray-500">Criado por:</span>{' '}
        <span className="font-medium">{pedido.createdBy.userName}</span>
      </p>
      <p>
        <span className="text-gray-500">Email:</span>{' '}
        <span>{pedido.createdBy.userEmail}</span>
      </p>
      <p>
        <span className="text-gray-500">Cargo:</span>{' '}
        <span className="capitalize">{pedido.createdBy.userRole}</span>
      </p>
      <p>
        <span className="text-gray-500">Data:</span>{' '}
        <span>{new Date(pedido.dataCriacao).toLocaleString('pt-BR')}</span>
      </p>
    </div>
  </div>
)}
```

---

## 5️⃣ DASHBOARD DE SETORES (TELA PRINCIPAL)

### Componente: DashboardSetores

**Novo arquivo**: `src/pages/DashboardSetores.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader } from 'lucide-react';

const DashboardSetores = () => {
  const [estatisticas, setEstatisticas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarEstatisticas();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(buscarEstatisticas, 30000);
    return () => clearInterval(interval);
  }, []);

  const buscarEstatisticas = async () => {
    try {
      const response = await axios.get('/setores/estatisticas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEstatisticas(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard de Setores</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(estatisticas).map(([setorId, dados]) => (
          <SetorCard key={setorId} {...dados} />
        ))}
      </div>
    </div>
  );
};

const SetorCard = ({ nome, cor, quantidade, pedidos }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">{nome}</h3>
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: cor }}
        />
      </div>
      
      <div className="text-3xl font-bold mb-2" style={{ color: cor }}>
        {quantidade}
      </div>
      
      <div className="text-sm text-gray-500">
        {quantidade === 1 ? 'pedido' : 'pedidos'}
      </div>

      {/* Lista de pedidos (expandido) */}
      {expanded && quantidade > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            {pedidos.map(pedido => (
              <div 
                key={pedido.id}
                className="text-xs p-2 bg-gray-50 rounded"
              >
                <div className="font-medium">#{pedido.codigo}</div>
                <div className="text-gray-600">{pedido.cliente}</div>
                <div className="text-gray-400">
                  {pedido.tempoNoSetor}h no setor
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSetores;
```

**Adicionar rota**:
```jsx
// Em App.jsx ou routes.jsx
import DashboardSetores from './pages/DashboardSetores';

<Route path="/dashboard/setores" element={<DashboardSetores />} />
```

---

## 6️⃣ ATUALIZAR LISTAGEM DE PEDIDOS

### Em PedidosList.jsx ou similar

Adicione uma coluna mostrando o setor atual:

```jsx
<TableCell>
  <div className="flex items-center gap-2">
    <div 
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: getCorSetor(pedido.setorAtual) }}
    />
    <span className="text-sm">
      {getNomeSetor(pedido.setorAtual)}
    </span>
  </div>
</TableCell>

// Funções auxiliares
const SETORES_CORES = {
  'atendimento-inicial': '#2196F3',
  'sapataria': '#FF9800',
  'costura': '#9C27B0',
  'lavagem': '#00BCD4',
  'acabamento': '#4CAF50',
  'pintura': '#F44336',
  'atendimento-final': '#4CAF50'
};

const SETORES_NOMES = {
  'atendimento-inicial': 'Atendimento',
  'sapataria': 'Sapataria',
  'costura': 'Costura',
  'lavagem': 'Lavagem',
  'acabamento': 'Acabamento',
  'pintura': 'Pintura',
  'atendimento-final': 'Finalizado'
};

const getCorSetor = (setorId) => SETORES_CORES[setorId] || '#gray';
const getNomeSetor = (setorId) => SETORES_NOMES[setorId] || setorId;
```

---

## 7️⃣ TELA PARA TV (FULLSCREEN)

### Componente: TVDashboard

**Novo arquivo**: `src/pages/TVDashboard.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TVDashboard = () => {
  const [estatisticas, setEstatisticas] = useState(null);

  useEffect(() => {
    buscarEstatisticas();
    // Auto-refresh a cada 10 segundos
    const interval = setInterval(buscarEstatisticas, 10000);
    return () => clearInterval(interval);
  }, []);

  const buscarEstatisticas = async () => {
    try {
      const response = await axios.get('/setores/estatisticas');
      setEstatisticas(response.data.data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Dashboard de Produção
        </h1>
        <p className="text-gray-400">
          Atualizado em: {new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>

      {/* Grid de Setores */}
      <div className="grid grid-cols-4 gap-6">
        {estatisticas && Object.entries(estatisticas).map(([setorId, dados]) => (
          <div 
            key={setorId}
            className="bg-gray-800 rounded-lg p-6 text-center"
            style={{ borderTop: `4px solid ${dados.cor}` }}
          >
            <h3 className="text-white text-2xl font-bold mb-4">
              {dados.nome}
            </h3>
            <div 
              className="text-6xl font-bold mb-2"
              style={{ color: dados.cor }}
            >
              {dados.quantidade}
            </div>
            <div className="text-gray-400 text-lg">
              {dados.quantidade === 1 ? 'pedido' : 'pedidos'}
            </div>

            {/* Lista de pedidos */}
            {dados.quantidade > 0 && (
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {dados.pedidos.map(pedido => (
                  <div 
                    key={pedido.id}
                    className="bg-gray-700 rounded p-3 text-left"
                  >
                    <div className="text-white font-mono text-sm">
                      #{pedido.codigo}
                    </div>
                    <div className="text-gray-300 text-xs">
                      {pedido.cliente}
                    </div>
                    {pedido.tempoNoSetor > 0 && (
                      <div className="text-yellow-400 text-xs mt-1">
                        ⏱ {pedido.tempoNoSetor}h
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TVDashboard;
```

**Adicionar rota pública (sem autenticação)**:
```jsx
<Route path="/tv" element={<TVDashboard />} />
```

**Usar em TV**: Abra `http://seuapp.com/tv` em modo fullscreen (F11)

---

## 8️⃣ ATUALIZAR TIPOS TYPESCRIPT (se usar TypeScript)

**Arquivo**: `src/types/pedido.ts`

```typescript
export interface Pedido {
  id: string;
  codigo: string;
  clienteId: string;
  clientName: string;
  modeloTenis: string;
  servicos: Servico[];
  fotos: string[]; // Agora até 8
  
  // NOVO: Criador do pedido
  createdBy: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
  };
  
  // NOVO: Sistema de setores
  setoresFluxo: string[];
  setorAtual: string;
  setoresHistorico: SetorHistorico[];
  
  // Campos existentes
  status: string;
  departamento: string;
  precoTotal: number;
  dataCriacao: string;
  // ... demais campos
}

export interface SetorHistorico {
  setorId: string;
  setorNome: string;
  entradaEm: string;
  saidaEm: string | null;
  usuarioEntrada: string;
  usuarioEntradaNome: string;
  usuarioSaida: string | null;
  usuarioSaidaNome: string | null;
  observacoes: string;
}

export interface Setor {
  id: string;
  nome: string;
  ordem: number;
  obrigatorio: boolean;
  cor: string;
  icone: string;
  descricao: string;
  ativo: boolean;
}
```

---

## 9️⃣ CONFIGURAÇÕES E CONSTANTES

**Arquivo**: `src/constants/setores.js`

```javascript
export const SETORES = {
  ATENDIMENTO_INICIAL: 'atendimento-inicial',
  SAPATARIA: 'sapataria',
  COSTURA: 'costura',
  LAVAGEM: 'lavagem',
  ACABAMENTO: 'acabamento',
  PINTURA: 'pintura',
  ATENDIMENTO_FINAL: 'atendimento-final'
};

export const SETORES_CORES = {
  [SETORES.ATENDIMENTO_INICIAL]: '#2196F3',
  [SETORES.SAPATARIA]: '#FF9800',
  [SETORES.COSTURA]: '#9C27B0',
  [SETORES.LAVAGEM]: '#00BCD4',
  [SETORES.ACABAMENTO]: '#4CAF50',
  [SETORES.PINTURA]: '#F44336',
  [SETORES.ATENDIMENTO_FINAL]: '#4CAF50'
};

export const SETORES_NOMES = {
  [SETORES.ATENDIMENTO_INICIAL]: 'Atendimento',
  [SETORES.SAPATARIA]: 'Sapataria',
  [SETORES.COSTURA]: 'Costura',
  [SETORES.LAVAGEM]: 'Lavagem',
  [SETORES.ACABAMENTO]: 'Acabamento',
  [SETORES.PINTURA]: 'Pintura',
  [SETORES.ATENDIMENTO_FINAL]: 'Finalizado'
};

export const MAX_FOTOS = 8; // Antes era 5
```

---

## 🔟 RESUMO DE MUDANÇAS NECESSÁRIAS

### Arquivos para CRIAR:
1. ✅ `src/components/SetorProgress.jsx` - Barra de progresso dos setores
2. ✅ `src/components/MoverSetorButton.jsx` - Botão para avançar setor
3. ✅ `src/pages/DashboardSetores.jsx` - Dashboard principal
4. ✅ `src/pages/TVDashboard.jsx` - Tela para TV
5. ✅ `src/constants/setores.js` - Constantes de setores

### Arquivos para MODIFICAR:
1. ✅ `src/components/PedidoForm.jsx` - Aumentar limite de fotos para 8
2. ✅ `src/components/PedidoDetalhes.jsx` - Adicionar SetorProgress e createdBy
3. ✅ `src/components/PedidosList.jsx` - Mostrar setor atual
4. ✅ `src/routes/` ou `App.jsx` - Adicionar novas rotas
5. ✅ `src/types/pedido.ts` (se TypeScript) - Atualizar tipos

### Validações para ATUALIZAR:
```javascript
// ANTES:
const MAX_FOTOS = 5;

// DEPOIS:
const MAX_FOTOS = 8;
```

---

## 📡 NOVOS ENDPOINTS DO BACKEND

```javascript
// Listar setores
GET /setores

// Estatísticas por setor
GET /setores/estatisticas

// Mover pedido para setor
POST /pedidos/:id/mover-setor
Body: { setorId: 'lavagem' }

// Próximo setor no fluxo
GET /pedidos/:id/proximo-setor
```

---

## 🎨 SUGESTÕES DE UX

1. **Animações**: Adicione transição suave ao mover entre setores
2. **Notificações**: Toast ao mover pedido com sucesso
3. **Cores**: Use as cores dos setores para feedback visual
4. **Auto-refresh**: Dashboard e TV com refresh automático
5. **Indicadores**: Mostrar tempo no setor atual com ícone de relógio

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Aumentar limite de fotos para 8
- [ ] Criar componente SetorProgress
- [ ] Criar botão MoverSetorButton
- [ ] Mostrar informação de createdBy
- [ ] Criar dashboard de setores
- [ ] Criar tela para TV
- [ ] Atualizar tipos TypeScript
- [ ] Adicionar constantes de setores
- [ ] Testar fluxo completo
- [ ] Testar em mobile

---

## 📞 INFORMAÇÕES ADICIONAIS

**Backend já implementado**: ✅ 100% funcional
**Email automático**: Cliente recebe email ao finalizar automaticamente
**Compatibilidade**: Todas as funcionalidades antigas mantidas

Se tiver dúvidas sobre alguma implementação, me avise!

Bom trabalho! 🚀
