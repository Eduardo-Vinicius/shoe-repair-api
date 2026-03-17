const { getAllStatusColumns } = require('../utils/orderStatus');

  exports.getStatusColumns = async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: getAllStatusColumns()
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  };

  /**
   * Retorna apenas as colunas visíveis para a role do usuário
   */
  exports.getStatusColumnsFiltered = async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        data: getAllStatusColumns()
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  };