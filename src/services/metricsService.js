const pedidoService = require('./pedidoService');
const setorService = require('./setorService');
const { isFinalStatus } = require('../utils/orderStatus');

const CACHE_TTL_MS = Number(process.env.METRICS_CACHE_MS || 30000);
const MAX_ATRASOS_ITEMS = 50;
const DEFAULT_FUNC_LIMIT = 10;

const cache = Object.create(null);

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  const isFresh = Date.now() - entry.ts < CACHE_TTL_MS;
  return isFresh ? entry.value : null;
}

function setCache(key, value) {
  cache[key] = { ts: Date.now(), value };
}

function isAberto(pedido) {
  return !isFinalStatus(pedido.status);
}

function parseData(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function loadPedidosAbertos() {
  const pedidos = await pedidoService.listPedidos();
  return pedidos.filter(isAberto);
}

exports.getDistribuicaoDepartamentos = async () => {
  const cached = getCached('departamentos');
  if (cached) return cached;

  const pedidosAbertos = await loadPedidosAbertos();
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
  setCache('departamentos', resultado);
  return resultado;
};

exports.getDistribuicaoFuncionarios = async (limit = DEFAULT_FUNC_LIMIT) => {
  const parsedLimit = Number(limit) || DEFAULT_FUNC_LIMIT;
  const safeLimit = parsedLimit > 0 ? parsedLimit : DEFAULT_FUNC_LIMIT;
  const cacheKey = `funcionarios-${safeLimit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const pedidosAbertos = await loadPedidosAbertos();
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

  setCache(cacheKey, resultado);
  return resultado;
};

exports.getAtrasos = async () => {
  const cached = getCached('atrasos');
  if (cached) return cached;

  const now = Date.now();
  const pedidosAbertos = await loadPedidosAbertos();

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

  setCache('atrasos', resultado);
  return resultado;
};

exports.getResumo = async () => {
  const cached = getCached('resumo');
  if (cached) return cached;

  const now = Date.now();
  const pedidos = await pedidoService.listPedidos();

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

  setCache('resumo', resultado);
  return resultado;
};
