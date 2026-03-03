const metricsService = require('../services/metricsService');

exports.getDistribuicaoDepartamentos = async (req, res) => {
  try {
    const data = await metricsService.getDistribuicaoDepartamentos();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getDistribuicaoDepartamentos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDistribuicaoFuncionarios = async (req, res) => {
  try {
    const { limit } = req.query;
    const data = await metricsService.getDistribuicaoFuncionarios(limit);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getDistribuicaoFuncionarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAtrasos = async (_req, res) => {
  try {
    const data = await metricsService.getAtrasos();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getAtrasos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getResumo = async (_req, res) => {
  try {
    const data = await metricsService.getResumo();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Metrics] Erro em getResumo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
