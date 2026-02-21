const { getAllStatusColumns, getStatusColumnsByRole } = require('../utils/orderStatus');

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
      const { role } = req.user || {};

      if (!role) {
        return res.status(403).json({
          success: false,
          error: 'Role do usuário não encontrada.'
        });
      }

      const columns = getStatusColumnsByRole(role);

      if (!columns) {
        return res.status(404).json({
          success: false,
          error: `Nenhuma coluna configurada para a role: ${role}`
        });
      }

      res.status(200).json({
        success: true,
        data: columns
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  };