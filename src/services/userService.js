const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const tableName = process.env.DYNAMODB_USER_TABLE || 'WorqeraUsers';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

exports.createUser = async ({ email, password, nome, role, tenantId }) => {
  const user = { id: uuidv4(), email, password, nome, role, tenantId };
  const params = { TableName: tableName, Item: user };
  await dynamoDb.put(params).promise();
  return user;
};

exports.getUserByEmail = async (email, tenantId) => {
  const params = {
    TableName: tableName,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email }
  };
  if (tenantId) {
    params.FilterExpression = '#tenantId = :tenantId';
    params.ExpressionAttributeNames = { '#tenantId': 'tenantId' };
    params.ExpressionAttributeValues[':tenantId'] = tenantId;
  }
  const data = await dynamoDb.query(params).promise();
  return data.Items?.[0];
};

exports.getUserById = async (id, tenantId) => {
  const params = { TableName: tableName, Key: { id } };
  const data = await dynamoDb.get(params).promise();
  if (!data.Item) return null;
  if (tenantId && data.Item.tenantId && data.Item.tenantId !== tenantId) {
    return null;
  }
  return data.Item;
};
