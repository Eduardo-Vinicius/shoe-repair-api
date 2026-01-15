const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const tableName = process.env.DYNAMODB_PEDIDO_TABLE || 'shoeRepairPedidos';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

/**
 * Gera um código sequencial CURTO e LEGÍVEL para o pedido
 * Estratégia: Contador por hora com sharding para escalabilidade
 * Formato: YYYYMMDD-HH-XXX (ex: 20260115-14-001)
 *
 * Vantagens:
 * - Curto e legível (14 caracteres)
 * - Sequencial por hora (001, 002, 003...)
 * - Baixa contenção (sharding por hora)
 * - Fácil para uso diário
 */
async function gerarCodigoPedido() {
  const now = new Date();
  const dataKey = now.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  const horaKey = now.getHours().toString().padStart(2, '0'); // HH (00-23)

  // Sharding por hora: cada hora tem seu próprio contador
  // Isso reduz drasticamente a contenção
  const counterId = `pedido-${dataKey}-${horaKey}`;

  try {
    // Tenta incrementar o contador atômico para hora atual
    const params = {
      TableName: 'ShoeRepairCounters',
      Key: { id: counterId },
      UpdateExpression: 'ADD #count :incr',
      ExpressionAttributeNames: {
        '#count': 'count'
      },
      ExpressionAttributeValues: {
        ':incr': 1
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDb.update(params).promise();
    const sequencial = result.Attributes.count;

    // Formato legível: 20260115-14-001
    const codigo = `${dataKey}-${horaKey}-${String(sequencial).padStart(3, '0')}`;

    console.log(`[PedidoService] Código curto gerado: ${codigo}`, {
      data: dataKey,
      hora: horaKey,
      sequencial: sequencial
    });

    return codigo;

  } catch (error) {
    // Se a tabela não existe ou erro, fallback para timestamp curto
    console.warn('[PedidoService] Fallback para timestamp curto devido a erro:', error.message);

    const timestamp = Date.now();
    const shortCode = timestamp.toString().slice(-6); // Últimos 6 dígitos
    const codigo = `${dataKey}-${shortCode}`;

    console.log(`[PedidoService] Código fallback gerado: ${codigo}`);
    return codigo;
  }
}

exports.listPedidos = async () => {
  const params = { TableName: tableName };
  const data = await dynamoDb.scan(params).promise();
  return data.Items;
};

exports.getPedido = async (id) => {
  const params = { TableName: tableName, Key: { id } };
  const data = await dynamoDb.get(params).promise();
  return data.Item;
};

exports.createPedido = async (pedido) => {
  // Estruturar o pedido com todos os campos necessários
  // Gera um código sequencial para o pedido
  const codigoPedido = await gerarCodigoPedido();

  const novoPedido = { 
    id: uuidv4(), // Mantém o UUID como chave primária interna
    codigo: codigoPedido, // Novo campo com código sequencial legível
    clienteId: pedido.clienteId,
    clientName: pedido.clientName,
    modeloTenis: pedido.modeloTenis,
    servicos: pedido.servicos || [],
    fotos: pedido.fotos || [],
    precoTotal: pedido.precoTotal,
    valorSinal: pedido.valorSinal || 0,
    valorRestante: pedido.valorRestante || 0,
    dataPrevistaEntrega: pedido.dataPrevistaEntrega,
    departamento: pedido.departamento || 'Atendimento',
    observacoes: pedido.observacoes || '',
    garantia: pedido.garantia || {
      ativa: false,
      preco: 0,
      duracao: '',
      data: ''
    },
    acessorios: pedido.acessorios || [],
    status: pedido.status || 'Atendimento - Aguardando Aprovação',
    dataCriacao: pedido.dataCriacao || new Date().toISOString(),
    createdAt: pedido.createdAt || new Date().toISOString(),
    updatedAt: pedido.updatedAt || new Date().toISOString(),
    statusHistory: pedido.statusHistory || [],
    // Manter compatibilidade com campos antigos se existirem
    tipoServico: pedido.tipoServico,
    descricaoServicos: pedido.descricaoServicos,
    preco: pedido.preco
  };

  const params = { TableName: tableName, Item: novoPedido };
  await dynamoDb.put(params).promise();
  return novoPedido;
};

exports.updatePedido = async (id, updates) => {
  let updateExp = 'set ';
  const attrNames = {};
  const attrValues = {};
  let prefix = '';
  for (const key in updates) {
    if (key === 'id') continue;
    updateExp += `${prefix}#${key} = :${key}`;
    attrNames[`#${key}`] = key;
    attrValues[`:${key}`] = updates[key];
    prefix = ', ';
  }
  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: updateExp,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues,
    ReturnValues: 'ALL_NEW',
  };
  const data = await dynamoDb.update(params).promise();
  return data.Attributes;
};

exports.deletePedido = async (id) => {
  const params = { TableName: tableName, Key: { id } };
  await dynamoDb.delete(params).promise();
  return true;
};

exports.updatePedidoStatus = async (id, status) => {
  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: 'set #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    },
    ReturnValues: 'ALL_NEW',
  };
  const data = await dynamoDb.update(params).promise();
  return data.Attributes;
};
