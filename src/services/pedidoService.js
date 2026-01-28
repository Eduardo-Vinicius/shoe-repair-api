const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { enviarEmail } = require("./emailService");
const tableName = process.env.DYNAMODB_PEDIDO_TABLE || 'shoeRepairPedidos';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

/**
 * Gera um código sequencial ULTRA-CURTO e LEGÍVEL para o pedido
 * Estratégia: Contador por dia com sharding para escalabilidade
 * Formato: DDMMYY-XXX (ex: 160126-001)
 *
 * Vantagens:
 * - MUITO curto (9 caracteres) - fácil de digitar e lembrar
 * - Sequencial diário (001, 002, 003...)
 * - Baixa contenção (sharding por dia)
 * - Perfeito para uso em balcão de loja
 * - Escala bem: até 999 pedidos por dia
 */
async function gerarCodigoPedido() {
  const now = new Date();
  // Formato: DDMMYY (ex: 160126)
  const dia = now.getDate().toString().padStart(2, '0');
  const mes = (now.getMonth() + 1).toString().padStart(2, '0');
  const ano = now.getFullYear().toString().slice(-2);
  const dataKey = `${dia}${mes}${ano}`;

  // Sharding por dia: cada dia tem seu próprio contador
  const counterId = `pedido-${dataKey}`;

  try {
    // Tenta incrementar o contador atômico para o dia atual
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

    // Formato ultra-curto legível: 160126-001
    const codigo = `${dataKey}-${String(sequencial).padStart(3, '0')}`;

    console.log(`[PedidoService] Código gerado: ${codigo}`, {
      data: dataKey,
      sequencial: sequencial,
      formato: 'DDMMYY-SEQ'
    });

    return codigo;

  } catch (error) {
    // Se a tabela não existe ou erro, fallback para timestamp curto
    console.warn('[PedidoService] Fallback para timestamp curto devido a erro:', error.message);

    // Fallback simples: DDMMYY + últimos 3 dígitos do timestamp
    const timestamp = Date.now();
    const shortSeq = timestamp.toString().slice(-3);
    const codigo = `${dataKey}-${shortSeq}`;

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

  // Enviar e-mail após criar o pedido
  try {
    const subject = `✅ Pedido #${codigoPedido} - Confirmação de Recebimento`;
    const emailCliente = pedido.emailCliente; // Certifique-se de que o e-mail do cliente está no pedido
    if (!emailCliente) {
      console.warn('[PedidoService] Nenhum e-mail fornecido para o cliente. E-mail não enviado.');
    } else {
      await enviarEmail(emailCliente, subject, novoPedido, 'Criado');
      console.log(`[PedidoService] E-mail enviado para ${emailCliente} com sucesso.`);
    }
  } catch (error) {
    console.error('[PedidoService] Erro ao enviar e-mail de confirmação:', error.message);
  }

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
