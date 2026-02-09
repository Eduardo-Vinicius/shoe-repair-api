  const statusByRole = {
    admin: {
      "Atendimento - Recebido": [],
      "Atendimento - Orçado": [],
      "Atendimento - Aprovado": [],
      "Lavagem - A Fazer": [],
      "Lavagem - Em Andamento": [],
      "Lavagem - Concluído": [],
      "Pintura - A Fazer": [],
      "Pintura - Em Andamento": [],
      "Pintura - Concluído": [],
      "Acabamento - A Fazer": [],
      "Acabamento - Em Andamento": [],
      "Acabamento - Concluído": [],
      "Costura - A Fazer": [],
      "Costura - Em Andamento": [],
      "Costura - Concluído": [],
      "Sapataria - A Fazer": [],
      "Sapataria - Em Andamento": [],
      "Sapataria - Concluído": [],
      "Atendimento - Finalizado": [],
      "Atendimento - Entregue": []
    },
    lavagem: {
      "Lavagem - A Fazer": [],
      "Lavagem - Em Andamento": [],
      "Lavagem - Concluído": []
    },
    pintura: {
      "Pintura - A Fazer": [],
      "Pintura - Em Andamento": [],
      "Pintura - Concluído": []
    },
    acabamento: {
      "Acabamento - A Fazer": [],
      "Acabamento - Em Andamento": [],
      "Acabamento - Concluído": []
    },
    costura: {
      "Costura - A Fazer": [],
      "Costura - Em Andamento": [],
      "Costura - Concluído": []
    },
    sapataria: {
      "Sapataria - A Fazer": [],
      "Sapataria - Em Andamento": [],
      "Sapataria - Concluído": []
    },
    atendimento: {
      "Atendimento - Recebido": [],
      "Atendimento - Orçado": [],
      "Atendimento - Aprovado": [],
      "Atendimento - Finalizado": [],
      "Atendimento - Entregue": []
    }
  };

  exports.getStatusColumns = async (req, res) => {
    try {
      // Retorna TODAS as colunas disponíveis no sistema
      // A filtragem de visibilidade fica por conta do frontend
      const allColumns = Object.keys(statusByRole.admin).reduce((acc, status) => {
        acc[status] = [];
        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: allColumns
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

      // Retorna apenas as colunas visíveis para a role do usuário
      const columns = statusByRole[role];

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