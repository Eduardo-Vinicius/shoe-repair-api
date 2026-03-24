const tenantService = require('../services/tenantService');

module.exports = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const tenantId = req.headers['x-tenant'];
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    return res.status(400).json({ error: 'X-Tenant obrigatório.' });
  }

  const normalized = tenantId.trim();
  req.tenantId = normalized;
  res.set('X-Tenant-Resolved', normalized);

  try {
    await tenantService.assertTenantAtivo(normalized);
  } catch (err) {
    return res.status(403).json({ error: err.message || 'Tenant inválido ou inativo.' });
  }

  next();
};
