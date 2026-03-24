const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const tableName = process.env.DYNAMODB_CLIENTE_TABLE || 'worqeraClientes';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

exports.listClientes = async (tenantId) => {
  const params = { TableName: tableName };
  if (tenantId) {
    params.FilterExpression = '#tenantId = :tenantId';
    params.ExpressionAttributeNames = { '#tenantId': 'tenantId' };
    params.ExpressionAttributeValues = { ':tenantId': tenantId };
  }
  const data = await dynamoDb.scan(params).promise();
  return data.Items || [];
};

exports.getCliente = async (id, tenantId) => {
  const params = { TableName: tableName, Key: { id } };
  const data = await dynamoDb.get(params).promise();
  if (!data.Item) return null;
  if (tenantId && data.Item.tenantId !== tenantId) return null;
  return data.Item;
};

exports.createCliente = async (cliente, tenantId) => {
  const novoCliente = { ...cliente, id: uuidv4(), tenantId };
  const params = { TableName: tableName, Item: novoCliente };
  await dynamoDb.put(params).promise();
  return novoCliente;
};

exports.updateCliente = async (id, updates, tenantId) => {
  // Atualiza todos os campos exceto id
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
    ConditionExpression: tenantId ? '#tenantId = :tenantId' : undefined,
    ReturnValues: 'ALL_NEW',
  };
  if (tenantId) {
    params.ExpressionAttributeNames['#tenantId'] = 'tenantId';
    params.ExpressionAttributeValues[':tenantId'] = tenantId;
  }
  const data = await dynamoDb.update(params).promise();
  return data.Attributes;
};

exports.deleteCliente = async (id, tenantId) => {
  const params = { TableName: tableName, Key: { id } };
  if (tenantId) {
    params.ConditionExpression = '#tenantId = :tenantId';
    params.ExpressionAttributeNames = { '#tenantId': 'tenantId' };
    params.ExpressionAttributeValues = { ':tenantId': tenantId };
  }
  await dynamoDb.delete(params).promise();
  return true;
};
