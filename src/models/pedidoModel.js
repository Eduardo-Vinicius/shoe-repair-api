// Modelo de pedido para shoe repair
module.exports = {
  id: String,
  codigo: String, // Código sequencial legível (ex: 20260115-001)
  clienteId: String,
  clientName: String, // Nome do cliente
  modeloTenis: String,
  servicos: [{ // Nova estrutura de serviços
    id: String,
    nome: String,
    preco: Number,
    descricao: String
  }],
  fotos: [String], // URLs do S3
  precoTotal: Number, // Preço total dos serviços
  valorSinal: Number, // Valor do sinal pago
  valorRestante: Number, // Valor restante a ser pago
  dataPrevistaEntrega: String, // ISO date
  departamento: String, // Departamento responsável
  observacoes: String, // Observações gerais
  garantia: { // Informações da garantia
    ativa: Boolean,
    preco: Number,
    duracao: String,
    data: String
  },
  acessorios: [String], // Lista de acessórios
  status: String, // Enum
  dataCriacao: String, // ISO date
  createdAt: String, // ISO date
  updatedAt: String, // ISO date
  statusHistory: [{ // Histórico de mudanças de status
    status: String,
    date: String,
    time: String,
    userId: String,
    userName: String
  }],
  // Campos antigos mantidos para compatibilidade
  tipoServico: String, // Enum (deprecated)
  descricaoServicos: String, // (deprecated)
  preco: Number // (deprecated)
};
