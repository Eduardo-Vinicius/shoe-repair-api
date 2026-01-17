// Modelo de pedido para shoe repair
module.exports = {
  id: String,
  codigo: String, // Código sequencial legível ultra-curto (ex: 160126-001 = DDMMYY-SEQ)
  clienteId: String,
  clientName: String, // Nome do cliente
  clientPhone: String, // Telefone do cliente para WhatsApp (com código país, ex: 5511999999999)
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
  dataEntregaReal: String, // ISO date - quando o pedido foi entregue
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
  updatedBy: String, // Email/ID do usuário que fez última atualização
  pdfUrl: String, // URL do PDF gerado no S3
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
