const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMODB_TENANT_TABLE || 'WorqeraTenants';
const CACHE_TTL_MS = Number(process.env.TENANT_CACHE_MS || 60000);

const cache = Object.create(null);

function getCached(id) {
  const entry = cache[id];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return entry.value;
}

function setCached(id, value) {
  cache[id] = { ts: Date.now(), value };
}

async function getTenant(id) {
  const cached = getCached(id);
  if (cached) return cached;

  const params = {
    TableName: tableName,
    Key: { id }
  };

  const res = await dynamoDb.get(params).promise();
  if (res && res.Item) {
    setCached(id, res.Item);
    return res.Item;
  }

  return null;
}

async function assertTenantAtivo(id) {
  const tenant = await getTenant(id);
  if (!tenant) {
    throw new Error('Tenant não encontrado.');
  }
  if (tenant.ativo === false || tenant.ativo === 'false') {
    throw new Error('Tenant inativo.');
  }
  return tenant;
}

module.exports = {
  getTenant,
  assertTenantAtivo
};
