const pedidoService = require('./pedidoService');
const setorService = require('./setorService');
const { isFinalStatus } = require('../utils/orderStatus');

const CACHE_TTL_MS = Number(process.env.METRICS_CACHE_MS || 30000);
const MAX_ATRASOS_ITEMS = 50;
const DEFAULT_FUNC_LIMIT = 10;

const cache = Object.create(null);

function cacheKey(tenantId, key) {
  return tenantId ? `${tenantId}:${key}` : key;
}

function getCached(key, tenantId) {
  const entryKey = cacheKey(tenantId, key);
  const entry = cache[entryKey];
  if (!entry) return null;
  const isFresh = Date.now() - entry.ts < CACHE_TTL_MS;
  return isFresh ? entry.value : null;
}

function setCache(key, value, tenantId) {
  const entryKey = cacheKey(tenantId, key);
  cache[entryKey] = { ts: Date.now(), value };
}

function isAberto(pedido) {
  return !isFinalStatus(pedido.status);
}

function parseData(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function loadPedidosAbertos(tenantId) {
  const pedidos = await pedidoService.listPedidos(tenantId);
  return pedidos.filter(isAberto);
}

exports.getDistribuicaoDepartamentos = async (tenantId) => {
  const cached = getCached('departamentos', tenantId);
  if (cached) return cached;

  const pedidosAbertos = await loadPedidosAbertos(tenantId);
  const agregados = new Map();

  pedidosAbertos.forEach(pedido => {
    const setorId = pedido.setorAtual || 'sem-setor';
    const setor = setorService.getSetor(setorId);
    const setorNome = setor?.nome || pedido.departamento || 'Sem setor';
    const atual = agregados.get(setorId) || { setorId, setorNome, total: 0 };
    atual.total += 1;
    agregados.set(setorId, atual);
  });

  const resultado = Array.from(agregados.values());
  setCache('departamentos', resultado, tenantId);
  return resultado;
};

exports.getDistribuicaoFuncionarios = async (limit = DEFAULT_FUNC_LIMIT, tenantId) => {
  const parsedLimit = Number(limit) || DEFAULT_FUNC_LIMIT;
  const safeLimit = parsedLimit > 0 ? parsedLimit : DEFAULT_FUNC_LIMIT;
  const cacheKey = `funcionarios-${safeLimit}`;
  const cached = getCached(cacheKey, tenantId);
  if (cached) return cached;

  const pedidosAbertos = await loadPedidosAbertos(tenantId);
  const agregados = new Map();

  pedidosAbertos.forEach(pedido => {
    const funcionario = (pedido.funcionarioAtual || '').trim() || 'Sem responsável';
    const atual = agregados.get(funcionario) || { funcionarioNome: funcionario, total: 0 };
    atual.total += 1;
    agregados.set(funcionario, atual);
  });

  const resultado = Array.from(agregados.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, safeLimit);

  setCache(cacheKey, resultado, tenantId);
  return resultado;
};

exports.getAtrasos = async (tenantId) => {
  const cached = getCached('atrasos', tenantId);
  if (cached) return cached;

  const now = Date.now();
  const pedidosAbertos = await loadPedidosAbertos(tenantId);

  const atrasados = pedidosAbertos
    .map(pedido => ({ pedido, dataPrevista: parseData(pedido.dataPrevistaEntrega) }))
    .filter(item => item.dataPrevista && item.dataPrevista.getTime() < now)
    .map(item => {
      const atrasoMs = now - item.dataPrevista.getTime();
      return { pedido: item.pedido, atrasoMs };
    })
    .sort((a, b) => b.atrasoMs - a.atrasoMs);

  const totalAtrasados = atrasados.length;
  const atrasoMedioMs = totalAtrasados === 0
    ? 0
    : Math.round(atrasados.reduce((acc, item) => acc + item.atrasoMs, 0) / totalAtrasados);

  const itens = atrasados.slice(0, MAX_ATRASOS_ITEMS).map(({ pedido }) => ({
    id: pedido.id,
    codigo: pedido.codigo,
    status: pedido.status,
    funcionarioAtual: pedido.funcionarioAtual || null,
    dataPrevistaEntrega: pedido.dataPrevistaEntrega || null
  }));

  const resultado = {
    totalAtrasados,
    atrasoMedioMs,
    itens
  };

  setCache('atrasos', resultado, tenantId);
  return resultado;
};

exports.getResumo = async (tenantId) => {
  const cached = getCached('resumo', tenantId);
  if (cached) return cached;

  const now = Date.now();
  const pedidos = await pedidoService.listPedidos(tenantId);

  let total = 0;
  let finalizados = 0;
  let atrasados = 0;

  pedidos.forEach(pedido => {
    total += 1;
    if (isFinalStatus(pedido.status)) {
      finalizados += 1;
      return;
    }

    const dataPrevista = parseData(pedido.dataPrevistaEntrega);
    if (dataPrevista && dataPrevista.getTime() < now) {
      atrasados += 1;
    }
  });

  const resultado = {
    total,
    abertos: total - finalizados,
    finalizados,
    atrasados
  };

  setCache('resumo', resultado, tenantId);
  return resultado;
};
