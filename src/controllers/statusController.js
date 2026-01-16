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
    "Atendimento - Finalizado": [],
    "Atendimento - Entregue": []
  },
  lavagem: {
    "Atendimento - Recebido": [],
    "Atendimento - Orçado": [],
    "Atendimento - Aprovado": [],
    "Lavagem - A Fazer": [],
    "Lavagem - Em Andamento": [],
    "Lavagem - Concluído": [],
    "Pintura - A Fazer": [],
    "Pintura - Em Andamento": [],
    "Pintura - Concluído": [],
    "Atendimento - Finalizado": [],
    "Atendimento - Entregue": []
  },
  pintura: {
    "Atendimento - Recebido": [],
    "Atendimento - Orçado": [],
    "Atendimento - Aprovado": [],
    "Lavagem - A Fazer": [],
    "Lavagem - Em Andamento": [],
    "Lavagem - Concluído": [],
    "Pintura - A Fazer": [],
    "Pintura - Em Andamento": [],
    "Pintura - Concluído": [],
    "Atendimento - Finalizado": [],
    "Atendimento - Entregue": []
  },
  atendimento: {
    "Atendimento - Recebido": [],
    "Atendimento - Orçado": [],
    "Atendimento - Aprovado": [],
    "Lavagem - A Fazer": [],
    "Lavagem - Em Andamento": [],
    "Lavagem - Concluído": [],
    "Pintura - A Fazer": [],
    "Pintura - Em Andamento": [],
    "Pintura - Concluído": [],
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
 * Mantido para compatibilidade, mas o recomendado é usar /status/columns
 * e filtrar no frontend
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

    // Todas as roles veem todas as colunas
    const columns = statusByRole.admin;

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