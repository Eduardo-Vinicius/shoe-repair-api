const metricsService = require('../services/metricsService');

exports.getDistribuicaoDepartamentos = async (req, res) => {
  try {
    const data = await metricsService.getDistribuicaoDepartamentos(req.tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getDistribuicaoDepartamentos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDistribuicaoFuncionarios = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await metricsService.getDistribuicaoFuncionarios(limit, req.tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getDistribuicaoFuncionarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAtrasos = async (req, res) => {
  try {
    const data = await metricsService.getAtrasos(req.tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getAtrasos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getResumo = async (req, res) => {
  try {
    const data = await metricsService.getResumo(req.tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getResumo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
