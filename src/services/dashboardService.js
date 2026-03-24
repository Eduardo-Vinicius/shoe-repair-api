const AWS = require('aws-sdk');
const clienteService = require('./clienteService');
const pedidoService = require('./pedidoService');
const userService = require('./userService');
const { ORDER_STATUS, normalizeStatus, isFinalStatus } = require('../utils/orderStatus');

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

// Função para contar pedidos por status
exports.countPedidosByStatus = async (status, tenantId) => {
  const tableName = process.env.DYNAMODB_PEDIDO_TABLE || 'worqeraPedidos';
  const params = { TableName: tableName };
  if (tenantId) {
    params.FilterExpression = '#tenantId = :tenantId';
    params.ExpressionAttributeNames = { '#tenantId': 'tenantId' };
    params.ExpressionAttributeValues = { ':tenantId': tenantId };
  }
  const data = await dynamoDb.scan(params).promise();

  const statusAlvo = normalizeStatus(status, { strict: false, fallback: status });
  return (data.Items || []).filter((pedido) => {
    const statusPedido = normalizeStatus(pedido.status, { strict: false, fallback: pedido.status });
    return statusPedido === statusAlvo;
  }).length;
};

// Função para contar pedidos finalizados hoje
exports.countCompletedOrdersToday = async (tenantId) => {
  const tableName = process.env.DYNAMODB_PEDIDO_TABLE || 'worqeraPedidos';
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const params = { TableName: tableName };
  if (tenantId) {
    params.FilterExpression = '#tenantId = :tenantId';
    params.ExpressionAttributeNames = { '#tenantId': 'tenantId' };
    params.ExpressionAttributeValues = { ':tenantId': tenantId };
  }
  const data = await dynamoDb.scan(params).promise();

  return (data.Items || []).filter((pedido) => {
    const updatedAt = String(pedido.updatedAt || '');
    return isFinalStatus(pedido.status) && updatedAt.startsWith(today);
  }).length;
};

// Função para buscar pedidos recentes (últimos 10)
exports.getRecentOrders = async (limit = 10, tenantId) => {
  const pedidos = await pedidoService.listPedidos(tenantId);
  
  // Ordenar por data de criação (mais recente primeiro)
  const pedidosOrdenados = pedidos.sort((a, b) => {
    return new Date(b.createdAt || b.dataCriacao) - new Date(a.createdAt || a.dataCriacao);
  });

  // Pegar apenas os mais recentes
  const pedidosRecentes = pedidosOrdenados.slice(0, limit);

  // Buscar dados dos clientes para cada pedido
  const pedidosComClientes = await Promise.all(
    pedidosRecentes.map(async (pedido) => {
      const cliente = await clienteService.getCliente(pedido.clienteId, tenantId);
      
      return {
        id: pedido.id,
        clientName: cliente ? cliente.nome : 'Cliente não encontrado',
        clientCpf: cliente ? cliente.cpf : '',
        sneaker: pedido.modeloTenis,
        serviceType: pedido.tipoServico || (pedido.servicos && pedido.servicos.length > 0 ? pedido.servicos[0].nome : 'Não especificado'),
        description: pedido.descricaoServicos || pedido.observacoes || '',
        price: pedido.preco || pedido.precoTotal || 0,
        status: pedido.status,
        createdDate: pedido.dataCriacao ? pedido.dataCriacao.split('T')[0] : pedido.createdAt?.split('T')[0],
        expectedDate: pedido.dataPrevistaEntrega ? pedido.dataPrevistaEntrega.split('T')[0] : '',
        statusHistory: pedido.statusHistory || []
      };
    })
  );

  return pedidosComClientes;
};

// Função para obter estatísticas gerais do dashboard
exports.getDashboardStats = async (tenantId) => {
  try {
    // Buscar total de clientes
    const clientes = await clienteService.listClientes(tenantId);
    const totalClients = clientes.length;

    // Contar pedidos ativos (em processamento)
    const activeStatuses = [
      ORDER_STATUS.LAVAGEM_EM_ANDAMENTO,
      ORDER_STATUS.PINTURA_EM_ANDAMENTO,
      ORDER_STATUS.ACABAMENTO_EM_ANDAMENTO,
      ORDER_STATUS.COSTURA_EM_ANDAMENTO,
      ORDER_STATUS.SAPATARIA_EM_ANDAMENTO,
      ORDER_STATUS.ATENDIMENTO_APROVADO
    ];

    const activeOrders = (await Promise.all(activeStatuses.map((status) => this.countPedidosByStatus(status, tenantId))))
      .reduce((acc, count) => acc + count, 0);

    // Contar pedidos pendentes (iniciado, aguardando aprovação, etc.)
    const pendingStatuses = [
      ORDER_STATUS.ATENDIMENTO_RECEBIDO,
      ORDER_STATUS.ATENDIMENTO_ORCADO
    ];
    const pendingOrders = (await Promise.all(pendingStatuses.map((status) => this.countPedidosByStatus(status, tenantId))))
      .reduce((acc, count) => acc + count, 0);

    // Contar pedidos finalizados hoje
    const completedToday = await this.countCompletedOrdersToday(tenantId);

    return {
      totalClients,
      activeOrders,
      pendingOrders,
      completedToday
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    throw error;
  }
};

// Função para obter dados completos do dashboard
exports.getDashboardData = async (userId, tenantId) => {
  try {
    // Buscar estatísticas
    const stats = await this.getDashboardStats(tenantId);

    // Buscar pedidos recentes
    const recentOrders = await this.getRecentOrders(undefined, tenantId);

    // Buscar dados do usuário
    const user = await userService.getUserById(userId, tenantId);
    
    // Definir permissões baseadas no role
    let permissions = [];
    // Todas as roles têm todas as permissões
    permissions = ['view_all', 'create_orders', 'manage_clients', 'view_reports'];

    return {
      stats,
      recentOrders,
      user: {
        name: user ? user.nome : 'Usuário',
        role: user ? user.role : 'funcionario',
        permissions
      }
    };
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    throw error;
  }
};