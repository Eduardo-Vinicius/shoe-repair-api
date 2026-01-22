# Sistema de Prioridades - Implementação Frontend

## O que mudou no backend

Adicionei um sistema de prioridades nos pedidos. Agora cada pedido tem um nível de prioridade (I, II, III) e o board já vem automaticamente ordenado.

## 1. CRIAR PEDIDO - Adicionar campo prioridade

No formulário de criação de pedido, adicione um select de prioridade:

```jsx
<Select 
  label="Prioridade" 
  name="prioridade"
  defaultValue={2}
>
  <option value={1}>Alta (I) - Urgente</option>
  <option value={2}>Média (II) - Normal</option>
  <option value={3}>Baixa (III) - Sem pressa</option>
</Select>
```

Ao enviar o pedido, incluir no body:
```json
{
  "clienteId": "...",
  "modeloTenis": "...",
  "servicos": [...],
  "prioridade": 1  // 1, 2 ou 3
}
```

Se não enviar, backend assume **2 (Média)** automaticamente.

---

## 2. BOARD - Exibir badge de prioridade

No card do pedido, adicione um badge visual mostrando a prioridade:

```jsx
// Componente OrderCard.jsx
function OrderCard({ pedido }) {
  const getPrioridadeBadge = (prioridade) => {
    switch(prioridade) {
      case 1:
        return (
          <Badge className="bg-red-500 text-white">
            I - Alta
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-yellow-500 text-white">
            II - Média
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-green-500 text-white">
            III - Baixa
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="order-card">
      <div className="flex items-center gap-2">
        <h3>{pedido.codigo}</h3>
        {getPrioridadeBadge(pedido.prioridade)}
      </div>
      {/* resto do card */}
    </div>
  );
}
```

---

## 3. ORDENAÇÃO - Já vem pronta do backend!

**NÃO PRECISA ORDENAR NO FRONTEND**. O backend já retorna ordenado:

1. Prioridade (I → II → III)
2. Data (mais recente primeiro)

Exemplo de resposta do GET `/pedidos`:
```json
[
  { "id": "1", "prioridade": 1, "codigo": "220126-001" },  // ← Aparece primeiro
  { "id": "2", "prioridade": 1, "codigo": "220126-002" },
  { "id": "3", "prioridade": 2, "codigo": "220126-003" },
  { "id": "4", "prioridade": 3, "codigo": "220126-004" }   // ← Aparece por último
]
```

Apenas renderize na ordem que vem da API.

---

## 4. EDITAR PEDIDO - Permitir mudar prioridade

Se tiver tela de edição, adicione o mesmo select:

```jsx
<Select 
  label="Prioridade" 
  name="prioridade"
  defaultValue={pedido.prioridade}
>
  <option value={1}>Alta (I)</option>
  <option value={2}>Média (II)</option>
  <option value={3}>Baixa (III)</option>
</Select>
```

Enviar no PATCH:
```json
PATCH /pedidos/:id
{
  "prioridade": 1
}
```

---

## Resumo rápido

✅ **Adicionar select de prioridade** no formulário (valores: 1, 2, 3)  
✅ **Exibir badge colorido** no card (vermelho, amarelo, verde)  
✅ **Não fazer ordenação** - backend já envia ordenado  
✅ **Campo é opcional** - se não enviar, assume 2 (média)  

**Cores sugeridas:**
- Prioridade I (1) = Vermelho `#ef4444` ou `bg-red-500`
- Prioridade II (2) = Amarelo `#eab308` ou `bg-yellow-500`
- Prioridade III (3) = Verde `#22c55e` ou `bg-green-500`

Qualquer dúvida, me avisa!
