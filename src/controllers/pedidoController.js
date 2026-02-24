const pedidoService = require('../services/pedidoService');
const clienteService = require('../services/clienteService');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const setorService = require('../services/setorService');
const AWS = require('aws-sdk');
const archiver = require('archiver');
const { ORDER_STATUS, normalizeStatus, slugifyStatus } = require('../utils/orderStatus');

const s3 = new AWS.S3();
const PRESIGNED_URL_EXPIRES_SECONDS = Number(process.env.S3_PRESIGNED_EXPIRES_SECONDS || 3600);
const STRICT_STATUS_VALIDATION = process.env.STRICT_STATUS_VALIDATION === 'true';

function validarENormalizarStatus(status, obrigatorio = false) {
  if (!status) {
    if (obrigatorio) {
      return { ok: false, error: 'Status é obrigatório' };
    }
    return { ok: true, value: null };
  }

  try {
    return {
      ok: true,
      value: normalizeStatus(status, {
        strict: STRICT_STATUS_VALIDATION,
        fallback: ORDER_STATUS.ATENDIMENTO_RECEBIDO
      })
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function resolverSetorIdPorStatus(status) {
  if (!status) return null;

  const statusNormalizado = normalizeStatus(status, {
    strict: false,
    fallback: String(status || '')
  });

  const statusSlug = slugifyStatus(statusNormalizado);

  if (
    statusSlug.startsWith(slugifyStatus(ORDER_STATUS.ATENDIMENTO_RECEBIDO)) ||
    statusSlug.startsWith(slugifyStatus(ORDER_STATUS.ATENDIMENTO_ORCADO)) ||
    statusSlug.startsWith(slugifyStatus(ORDER_STATUS.ATENDIMENTO_APROVADO))
  ) {
    return 'atendimento-inicial';
  }

  if (
    statusSlug.startsWith(slugifyStatus(ORDER_STATUS.ATENDIMENTO_FINALIZADO)) ||
    statusSlug.startsWith(slugifyStatus(ORDER_STATUS.ATENDIMENTO_ENTREGUE))
  ) {
    return 'atendimento-final';
  }

  const setores = setorService.listarSetores();
  const setorEncontrado = setores.find(setor => {
    const setorSlug = slugifyStatus(setor.nome);
    return statusSlug.startsWith(setorSlug);
  });

  return setorEncontrado ? setorEncontrado.id : null;
}

function extrairS3KeyDaFoto(foto, bucket) {
  if (!foto || typeof foto !== 'string') return null;

  if (!foto.startsWith('http')) {
    return foto.replace(/^\/+/, '');
  }

  try {
    const url = new URL(foto);
    const pathname = decodeURIComponent(url.pathname || '');
    const pathLimpo = pathname.replace(/^\/+/, '');
    const host = (url.hostname || '').toLowerCase();
    const bucketLower = (bucket || '').toLowerCase();
    const isS3Host = host === 's3.amazonaws.com' || /^s3[.-].*\.amazonaws\.com$/.test(host);

    if (bucketLower && host.startsWith(`${bucketLower}.s3`)) {
      return pathLimpo;
    }

    if (bucketLower && host === bucketLower) {
      return pathLimpo;
    }

    if (bucketLower && isS3Host) {
      if (pathLimpo.startsWith(`${bucket}/`)) {
        return pathLimpo.slice(bucket.length + 1);
      }
      return null;
    }

    return null;
  } catch (_error) {
    return null;
  }
}

function gerarUrlPresignedFoto(foto) {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) return foto;

  const key = extrairS3KeyDaFoto(foto, bucket);
  if (!key) return foto;

  return s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: PRESIGNED_URL_EXPIRES_SECONDS
  });
}

function extensaoPorContentType(contentType = '') {
  const ct = String(contentType).toLowerCase();
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('webp')) return '.webp';
  return '.bin';
}

function assinarFotosPedido(pedido) {
  if (!pedido || !Array.isArray(pedido.fotos) || pedido.fotos.length === 0) {
    return pedido;
  }

  return {
    ...pedido,
    fotos: pedido.fotos.map(gerarUrlPresignedFoto)
  };
}

/**
 * Função auxiliar para enviar notificações de pedido
 * Centraliza a lógica de envio de email e SMS
 */
async function enviarNotificacoesPedido(pedido, status = null) {
  try {
    console.log('[Notificações] 🔔 Iniciando envio de notificações:', {
      pedidoId: pedido.id,
      codigo: pedido.codigo,
      status: status || pedido.status,
      clienteId: pedido.clienteId
    });

    if (!pedido.clienteId) {
      console.log('[Notificações] ❌ ClienteId não encontrado no pedido');
      return;
    }

    const cliente = await clienteService.getCliente(pedido.clienteId);
    if (!cliente) {
      console.log('[Notificações] ❌ Cliente não encontrado:', pedido.clienteId);
      return;
    }

    console.log('[Notificações] Cliente encontrado:', {
      nome: cliente.nome,
      email: cliente.email,
      telefone: cliente.telefone
    });

    const statusFinal = status || pedido.status;
    const servicosTexto = pedido.descricaoServicos || 
                         (pedido.servicos ? pedido.servicos.map(s => s.nome).join(', ') : 'Serviços diversos');
    const modeloTenis = pedido.modeloTenis || 'Tênis';
    const codigo = pedido.codigo || 'N/A';
    const fotos = pedido.fotos || [];

    console.log('[Notificações] Dados para envio:', {
      statusFinal,
      servicosTexto,
      modeloTenis,
      codigo,
      quantidadeFotos: fotos.length
    });

    // Enviar email se o cliente tiver email
    if (cliente.email) {
      console.log('[Notificações] 📧 Enviando email para:', cliente.email);
      await emailService.enviarStatusPedido(
        cliente.email,
        cliente.nome || 'Cliente',
        statusFinal,
        servicosTexto,
        modeloTenis,
        codigo,
        fotos
      );
      console.log('[Notificações] ✅ Email enviado com sucesso');
    } else {
      console.log('[Notificações] ⚠️ Cliente sem email cadastrado');
    }

    // SMS é enviado automaticamente pelo emailService quando aplicável
    // (apenas para status finalizados - economia)
    if (cliente.telefone) {
      console.log('[Notificações] 📱 Enviando SMS para:', cliente.telefone);
      await emailService.enviarSMSStatus(
        cliente.telefone,
        cliente.nome || 'Cliente',
        statusFinal,
        codigo
      );
    }
  } catch (error) {
    console.error('[Notificações] ❌ ERRO ao enviar notificações:', {
      message: error.message,
      stack: error.stack,
      pedidoId: pedido.id
    });
    // Não propaga o erro para não quebrar a operação principal
  }
}

exports.listPedidosStatus = async (req, res) => {
  try {
    const { role, sub: userId } = req.user || {};
    let pedidos = await pedidoService.listPedidos();

    // Filtro opcional por funcionário (atual ou histórico)
    const funcionarioFiltro = (req.query?.funcionario || '').trim().toLowerCase();
    if (funcionarioFiltro) {
      pedidos = pedidos.filter(pedido => {
        const atual = (pedido.funcionarioAtual || '').toLowerCase();
        const historico = (pedido.setoresHistorico || []).some(h =>
          (h.funcionarioEntrada || '').toLowerCase().includes(funcionarioFiltro) ||
          (h.funcionarioSaida || '').toLowerCase().includes(funcionarioFiltro)
        );
        return atual.includes(funcionarioFiltro) || historico;
      });
    }
    
    // Todas as roles veem todos os pedidos
    // Filtragem removida para permitir acesso completo

    // Transformar pedidos para o formato esperado pelo frontend
    const pedidosFormatados = pedidos.map(pedido => assinarFotosPedido({
      id: pedido.id,
      codigo: pedido.codigo, // Código sequencial legível
      clientName: pedido.nomeCliente || pedido.clientName,
      clientCpf: pedido.cpfCliente || pedido.clientCpf,
      sneaker: pedido.modeloTenis || pedido.sneaker,
      serviceType: pedido.tipoServico || pedido.serviceType,
      description: pedido.descricaoServicos || pedido.description,
      price: pedido.preco || pedido.price || pedido.precoTotal,
      servicos: pedido.servicos ? pedido.servicos.map(servico => servico.nome).join(', ') : '',
      status: pedido.status,
      createdDate: pedido.dataCriacao || pedido.createdDate,
      expectedDate: pedido.dataPrevistaEntrega || pedido.expectedDate,
      statusHistory: pedido.statusHistory || [
        {
          status: pedido.status,
          date: pedido.dataCriacao || new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          userId: userId,
          userName: req.user?.email || 'Sistema'
        }
      ],
      clientId: pedido.clienteId || pedido.clientId,
      modeloTenis: pedido.modeloTenis,
      tipoServico: pedido.tipoServico,
      descricaoServicos: pedido.descricaoServicos,
      preco: pedido.preco,
      precoTotal: pedido.precoTotal || 0,
      valorSinal: pedido.valorSinal || 0,
      valorRestante: pedido.valorRestante || 0,
      dataPrevistaEntrega: pedido.dataPrevistaEntrega,
      dataCriacao: pedido.dataCriacao,
      fotos: pedido.fotos || [],
      observacoes: pedido.observacoes,
      garantia: pedido.garantia || {
        ativa: false,
        preco: 0,
        duracao: '',
        data: ''
      },
      acessorios: pedido.acessorios || [],
      prioridade: pedido.prioridade || 2,
      setorAtual: pedido.setorAtual || null,
      departamento: pedido.departamento || '',
      setoresHistorico: pedido.setoresHistorico || [],
      funcionarioAtual: pedido.funcionarioAtual || '',
      updatedBy: pedido.updatedBy || ''
    }));

    // Ordenar por prioridade (1=alta primeiro) e depois por data (mais recentes primeiro)
    pedidosFormatados.sort((a, b) => {
      // Primeiro por prioridade (menor número = maior prioridade)
      if (a.prioridade !== b.prioridade) {
        return a.prioridade - b.prioridade;
      }
      // Se mesma prioridade, ordenar por data (mais recente primeiro)
      return new Date(b.dataCriacao) - new Date(a.dataCriacao);
    });

    res.status(200).json({
      success: true,
      data: pedidosFormatados
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

exports.listPedidos = async (req, res) => {
  try {
    let pedidos = await pedidoService.listPedidos();

    const funcionarioFiltro = (req.query?.funcionario || '').trim().toLowerCase();
    if (funcionarioFiltro) {
      pedidos = pedidos.filter(pedido => {
        const atual = (pedido.funcionarioAtual || '').toLowerCase();
        const historico = (pedido.setoresHistorico || []).some(h =>
          (h.funcionarioEntrada || '').toLowerCase().includes(funcionarioFiltro) ||
          (h.funcionarioSaida || '').toLowerCase().includes(funcionarioFiltro)
        );
        return atual.includes(funcionarioFiltro) || historico;
      });
    }
    // Sempre retorna 200, nunca 304
    res.status(200).json(pedidos.map(assinarFotosPedido));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /pedidos/consulta - lista leve para busca/consulta
exports.searchPedidosConsulta = async (req, res) => {
  try {
    const {
      codigo,
      cliente,
      status,
      setor,
      funcionario,
      dataInicio,
      dataFim,
      limit,
      lastKey
    } = req.query || {};

    let exclusiveStartKey;
    if (lastKey) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(String(lastKey), 'base64').toString('utf8'));
      } catch (parseErr) {
        console.warn('[searchPedidosConsulta] lastKey inválido, ignorando:', parseErr.message);
      }
    }

    const result = await pedidoService.searchPedidosLite({
      codigo,
      cliente,
      status,
      setorAtual: setor,
      funcionario,
      dataInicio,
      dataFim,
      limit,
      exclusiveStartKey
    });

    const nextToken = result.lastKey
      ? Buffer.from(JSON.stringify(result.lastKey)).toString('base64')
      : null;

    res.status(200).json({
      success: true,
      data: result.items,
      nextToken,
      count: result.items.length
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getPedido = async (req, res) => {
  try {
    const pedido = await pedidoService.getPedido(req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.status(200).json(assinarFotosPedido(pedido));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPedido = async (req, res) => {
  try {
    const { 
      clienteId, 
      clientName,
      modeloTenis, 
      servicos, 
      fotos, 
      precoTotal,
      valorSinal,
      valorRestante, 
      dataPrevistaEntrega, 
      departamento, 
      observacoes,
      garantia,
      acessorios,
      status,
      prioridade
    } = req.body;

    // Validação básica
    if (!clienteId || !clientName || !modeloTenis || !servicos || !Array.isArray(servicos) || servicos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios: clienteId, clientName, modeloTenis e servicos (array não vazio)' 
      });
    }

    // Validar estrutura dos serviços
    for (const servico of servicos) {
      if (!servico.id || !servico.nome || typeof servico.preco !== 'number') {
        return res.status(400).json({ 
          success: false, 
          error: 'Cada serviço deve ter: id, nome e preco (número)' 
        });
      }
    }

    // Validar estrutura da garantia se fornecida
    if (garantia && (typeof garantia.ativa !== 'boolean' || typeof garantia.preco !== 'number')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Garantia deve ter: ativa (boolean) e preco (número)' 
      });
    }

    const { role, sub: userId, email: userEmail, name: userName } = req.user || {};

    // Validar quantidade de fotos (máximo 8)
    if (fotos && fotos.length > 8) {
      return res.status(400).json({ 
        success: false, 
        error: 'Máximo de 8 fotos permitidas' 
      });
    }

    // Processar prioridade (aceita 1-3 ou 'I', 'II', 'III')
    let prioridadeNumerica = 2; // Padrão: média
    if (prioridade) {
      if (prioridade === 'I' || prioridade === 1 || prioridade === '1') {
        prioridadeNumerica = 1; // Alta
      } else if (prioridade === 'II' || prioridade === 2 || prioridade === '2') {
        prioridadeNumerica = 2; // Média
      } else if (prioridade === 'III' || prioridade === 3 || prioridade === '3') {
        prioridadeNumerica = 3; // Baixa
      }
    }

    // Status inicial padrão
    const statusNormalizado = validarENormalizarStatus(status);
    if (!statusNormalizado.ok) {
      return res.status(400).json({
        success: false,
        error: statusNormalizado.error
      });
    }

    const statusInicial = statusNormalizado.value || ORDER_STATUS.ATENDIMENTO_RECEBIDO;

    // Estruturar dados do pedido
    const dadosPedido = {
      clienteId,
      clientName,
      modeloTenis,
      servicos,
      fotos: fotos || [],
      precoTotal: precoTotal || servicos.reduce((total, servico) => total + servico.preco, 0),
      valorSinal: valorSinal || 0,
      valorRestante: valorRestante || (precoTotal - (valorSinal || 0)),
      dataPrevistaEntrega,
      departamento: departamento || 'Atendimento',
      observacoes: observacoes || '',
      garantia: garantia || {
        ativa: false,
        duracao: '',
        data: ''
      },
      acessorios: acessorios || [],
      prioridade: prioridadeNumerica,
      status: statusInicial,
      dataCriacao: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Campo createdBy - quem criou o pedido
      createdBy: {
        userId: userId || 'sistema',
        userName: userName || userEmail || 'Sistema',
        userEmail: userEmail || 'sistema@app.com',
        userRole: role || 'sistema'
      },
      // Sistema de setores: inicia em Atendimento e gera fluxo automaticamente
      setoresFluxo: [],
      setorAtual: null,
      funcionarioAtual: userName || userEmail || 'Sistema',
      setoresHistorico: [],
      statusHistory: [
        {
          status: statusInicial,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          userId: userId || 'sistema',
          userName: userName || userEmail || 'Sistema'
        }
      ]
    };

    // Gerar fluxo de setores com base nos serviços e abrir Atendimento
    try {
      const fluxo = setorService.determinarSetoresPorServicos(servicos);
      const agora = new Date().toISOString();

      dadosPedido.setoresFluxo = fluxo;
      dadosPedido.setorAtual = 'atendimento-inicial';
      dadosPedido.setoresHistorico = [
        {
          setorId: 'atendimento-inicial',
          setorNome: 'Atendimento',
          entradaEm: agora,
          saidaEm: null,
          usuarioEntrada: userEmail || 'sistema@app.com',
          usuarioEntradaNome: userName || userEmail || 'Sistema',
          funcionarioEntrada: userName || userEmail || 'Sistema',
          usuarioSaida: null,
          usuarioSaidaNome: null,
          funcionarioSaida: '',
          observacoes: ''
        }
      ];
    } catch (fluxError) {
      console.warn('[PedidoController] Falha ao determinar fluxo de setores:', fluxError.message);
      // Mantém setores vazios se houver erro na determinação
    }

    const novoPedido = await pedidoService.createPedido(dadosPedido);
    
    // Enviar notificações (não bloqueia se falhar)
    await enviarNotificacoesPedido(novoPedido, statusInicial);
    
    res.status(201).json({
      success: true,
      data: assinarFotosPedido(novoPedido),
      message: 'Pedido criado com sucesso'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

exports.updatePedido = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.status) {
      const statusNormalizado = validarENormalizarStatus(updates.status, true);
      if (!statusNormalizado.ok) {
        return res.status(400).json({
          success: false,
          error: statusNormalizado.error
        });
      }
      updates.status = statusNormalizado.value;
    }

    const atualizado = await pedidoService.updatePedido(req.params.id, updates);
    if (!atualizado) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.status(200).json(assinarFotosPedido(atualizado));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.patchPedido = async (req, res) => {
  try {
    console.log('[PedidoController] Iniciando PATCH do pedido:', {
      pedidoId: req.params.id,
      updates: req.body,
      user: req.user
    });

    const { role, sub: userId, email: userEmail } = req.user || {};
    const pedidoId = req.params.id;
    const updates = req.body;

    // Validação básica
    if (!pedidoId) {
      console.log('[PedidoController] ID do pedido não fornecido');
      return res.status(400).json({ 
        success: false, 
        error: 'ID do pedido é obrigatório' 
      });
    }

    if (!updates || Object.keys(updates).length === 0) {
      console.log('[PedidoController] Nenhum campo para atualizar fornecido');
      return res.status(400).json({ 
        success: false, 
        error: 'Pelo menos um campo deve ser fornecido para atualização' 
      });
    }

    // Buscar pedido atual para validações
    console.log('[PedidoController] Buscando pedido atual...');
    const pedidoAtual = await pedidoService.getPedido(pedidoId);
    if (!pedidoAtual) {
      console.log('[PedidoController] Pedido não encontrado:', pedidoId);
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido não encontrado' 
      });
    }

    console.log('[PedidoController] Pedido encontrado:', pedidoAtual.id);

    // Campos permitidos para atualização
    const camposPermitidos = [
      'modeloTenis', 'servicos', 'fotos', 'precoTotal', 'dataPrevistaEntrega',
      'departamento', 'observacoes', 'status', 'tipoServico', 'descricaoServicos', 
      'preco', 'statusHistory'
    ];

    // Filtrar apenas campos permitidos
    const updatesPermitidos = {};
    const camposRejeitados = [];

    Object.keys(updates).forEach(campo => {
      if (camposPermitidos.includes(campo)) {
        updatesPermitidos[campo] = updates[campo];
      } else if (campo !== 'id' && campo !== 'clienteId' && campo !== 'dataCriacao' && campo !== 'createdAt') {
        camposRejeitados.push(campo);
      }
    });

    if (camposRejeitados.length > 0) {
      console.log('[PedidoController] Campos rejeitados:', camposRejeitados);
      return res.status(400).json({ 
        success: false, 
        error: `Campos não permitidos para atualização: ${camposRejeitados.join(', ')}`,
        camposPermitidos: camposPermitidos
      });
    }

    console.log('[PedidoController] Campos permitidos para atualização:', Object.keys(updatesPermitidos));

    // Validações específicas por campo
    if (updatesPermitidos.servicos) {
      if (!Array.isArray(updatesPermitidos.servicos)) {
        console.log('[PedidoController] Serviços devem ser um array');
        return res.status(400).json({ 
          success: false, 
          error: 'Serviços devem ser um array' 
        });
      }

      // Validar estrutura dos serviços
      for (const servico of updatesPermitidos.servicos) {
        if (!servico.id || !servico.nome || typeof servico.preco !== 'number') {
          console.log('[PedidoController] Estrutura inválida de serviço:', servico);
          return res.status(400).json({ 
            success: false, 
            error: 'Cada serviço deve ter: id, nome e preco (número)' 
          });
        }
      }
    }

    if (updatesPermitidos.fotos && !Array.isArray(updatesPermitidos.fotos)) {
      console.log('[PedidoController] Fotos devem ser um array');
      return res.status(400).json({ 
        success: false, 
        error: 'Fotos devem ser um array' 
      });
    }

    if (updatesPermitidos.precoTotal && typeof updatesPermitidos.precoTotal !== 'number') {
      console.log('[PedidoController] PrecoTotal deve ser um número');
      return res.status(400).json({ 
        success: false, 
        error: 'PrecoTotal deve ser um número' 
      });
    }

    // Validação de permissões para alteração de status
    if (updatesPermitidos.status) {
      const statusNormalizado = validarENormalizarStatus(updatesPermitidos.status, true);
      if (!statusNormalizado.ok) {
        return res.status(400).json({
          success: false,
          error: statusNormalizado.error
        });
      }

      updatesPermitidos.status = statusNormalizado.value;

      const canUpdateStatus = (userRole, newStatus) => {
        // Todas as roles podem alterar qualquer status
        return true;
      };

      if (!canUpdateStatus(role, updatesPermitidos.status)) {
        console.log('[PedidoController] Usuário sem permissão para alterar status:', {
          userRole: role,
          newStatus: updatesPermitidos.status
        });
        return res.status(403).json({ 
          success: false, 
          error: 'Usuário não tem permissão para alterar para este status' 
        });
      }

      // Se o status está sendo alterado, adicionar ao histórico
      const statusAtualNormalizado = normalizeStatus(pedidoAtual.status, {
        strict: false,
        fallback: pedidoAtual.status
      });

      if (updatesPermitidos.status !== statusAtualNormalizado) {
        const novoHistorico = {
          status: updatesPermitidos.status,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0].substring(0, 5),
          userId: userId,
          userName: userEmail || 'Sistema',
          timestamp: new Date().toISOString()
        };

        updatesPermitidos.statusHistory = [
          ...(pedidoAtual.statusHistory || []),
          novoHistorico
        ];

        console.log('[PedidoController] Adicionando entrada no histórico de status:', novoHistorico);
      }
    }

    // Adicionar updatedAt automaticamente
    updatesPermitidos.updatedAt = new Date().toISOString();

    console.log('[PedidoController] Executando atualização no banco:', updatesPermitidos);

    // Executar atualização
    const pedidoAtualizado = await pedidoService.updatePedido(pedidoId, updatesPermitidos);

    console.log('[PedidoController] Pedido atualizado com sucesso:', {
      id: pedidoAtualizado.id,
      camposAtualizados: Object.keys(updatesPermitidos)
    });

    // Se o status foi alterado, enviar notificações
    if (updatesPermitidos.status && updatesPermitidos.status !== pedidoAtual.status) {
      await enviarNotificacoesPedido(pedidoAtualizado, updatesPermitidos.status);
    }

    res.status(200).json({
      success: true,
      data: assinarFotosPedido(pedidoAtualizado),
      message: `Pedido atualizado com sucesso. Campos alterados: ${Object.keys(updatesPermitidos).filter(k => k !== 'updatedAt').join(', ')}`
    });

  } catch (err) {
    console.error('[PedidoController] Erro no PATCH do pedido:', {
      error: err.message,
      stack: err.stack,
      pedidoId: req.params.id
    });
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

exports.deletePedido = async (req, res) => {
  try {
    const deletado = await pedidoService.deletePedido(req.params.id);
    if (!deletado) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.status(200).json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePedidoStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { role, sub: userId, email: userEmail } = req.user || {};
    
    const statusNormalizado = validarENormalizarStatus(status, true);
    if (!statusNormalizado.ok) {
      return res.status(400).json({
        success: false,
        error: statusNormalizado.error
      });
    }

    const novoStatus = statusNormalizado.value;

    // Validar permissões baseado no cargo
    const canUpdateStatus = (userRole, newStatus) => {
      // Todas as roles podem alterar qualquer status
      return true;
    };

    if (!canUpdateStatus(role, novoStatus)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Usuário não tem permissão para alterar para este status' 
      });
    }

    // Buscar pedido atual para pegar o histórico
    const pedidoAtual = await pedidoService.getPedido(req.params.id);
    if (!pedidoAtual) {
      return res.status(404).json({ 
        success: false, 
        error: 'Pedido não encontrado' 
      });
    }

    const statusAtualNormalizado = normalizeStatus(pedidoAtual.status, {
      strict: false,
      fallback: pedidoAtual.status
    });

    if (statusAtualNormalizado === novoStatus) {
      return res.status(200).json({
        success: true,
        data: {
          id: pedidoAtual.id,
          status: pedidoAtual.status,
          statusHistory: pedidoAtual.statusHistory || [],
          updatedAt: pedidoAtual.updatedAt,
          fotos: (assinarFotosPedido(pedidoAtual).fotos || [])
        },
        message: 'Status já está atualizado'
      });
    }

    const setorIdResolvido = resolverSetorIdPorStatus(novoStatus);
    if (setorIdResolvido) {
      const usuario = {
        sub: userId,
        email: userEmail,
        name: req.user?.name || userEmail,
        role
      };

      const pedidoMovido = await setorService.moverPedidoParaSetor(
        req.params.id,
        setorIdResolvido,
        usuario,
        req.body?.funcionarioNome,
        req.body?.observacao,
        novoStatus
      );

      if (!pedidoMovido?._noMovement) {
        await enviarNotificacoesPedido(pedidoMovido, pedidoMovido.status || novoStatus);
      }

      const pedidoResposta = assinarFotosPedido(pedidoMovido);

      return res.status(200).json({
        success: true,
        data: {
          // Retorna o pedido completo para o front reagrupar corretamente no Kanban
          id: pedidoResposta.id,
          status: pedidoResposta.status,
          statusHistory: pedidoResposta.statusHistory,
          updatedAt: pedidoResposta.updatedAt,
          fotos: pedidoResposta.fotos || [],
          setorAtual: pedidoResposta.setorAtual,
          setoresFluxo: pedidoResposta.setoresFluxo,
          setoresHistorico: pedidoResposta.setoresHistorico,
          departamento: pedidoResposta.departamento,
          funcionarioAtual: pedidoResposta.funcionarioAtual,
          prioridade: pedidoResposta.prioridade || 2,
          codigo: pedidoResposta.codigo,
          clientName: pedidoResposta.clientName,
          dataCriacao: pedidoResposta.dataCriacao,
          dataPrevistaEntrega: pedidoResposta.dataPrevistaEntrega
        },
        message: pedidoMovido?._noMovement ? 'Status já está atualizado' : 'Status atualizado com sucesso'
      });
    }

    // Criar novo item do histórico
    const novoHistorico = {
      status: novoStatus,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      userId: userId,
      userName: userEmail || 'Sistema'
    };

    // Atualizar histórico
    const statusHistory = pedidoAtual.statusHistory || [];
    statusHistory.push(novoHistorico);

    // Atualizar pedido com novo status e histórico
    const updates = {
      status: novoStatus,
      statusHistory: statusHistory,
      updatedAt: new Date().toISOString()
    };

    const atualizado = await pedidoService.updatePedido(req.params.id, updates);

    // Enviar notificações
    await enviarNotificacoesPedido(atualizado, novoStatus);

    const pedidoResposta = assinarFotosPedido(atualizado);

    res.status(200).json({
      success: true,
      data: {
        // Retorna o pedido completo para o front reagrupar corretamente no Kanban
        id: pedidoResposta.id,
        status: pedidoResposta.status,
        statusHistory: pedidoResposta.statusHistory,
        updatedAt: pedidoResposta.updatedAt,
        fotos: pedidoResposta.fotos || [],
        setorAtual: pedidoResposta.setorAtual,
        setoresFluxo: pedidoResposta.setoresFluxo,
        setoresHistorico: pedidoResposta.setoresHistorico,
        departamento: pedidoResposta.departamento,
        funcionarioAtual: pedidoResposta.funcionarioAtual,
        prioridade: pedidoResposta.prioridade || 2,
        codigo: pedidoResposta.codigo,
        clientName: pedidoResposta.clientName,
        dataCriacao: pedidoResposta.dataCriacao,
        dataPrevistaEntrega: pedidoResposta.dataPrevistaEntrega
      },
      message: 'Status atualizado com sucesso'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
};

// POST /pedidos/document/pdf - Gerar PDF do pedido
exports.generatePedidoPdf = async (req, res) => {
  try {
    const { pedidoId } = req.body;
    
    if (!pedidoId) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido é obrigatório'
      });
    }

    // Verificar se o usuário tem permissão (autenticado)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    console.log('Iniciando geração de PDF para pedido:', pedidoId);

    // Tentar primeiro o PDF completo
    let pdfResult;
    try {
      pdfResult = await pdfService.generatePedidoPdf(pedidoId);
      console.log('PDF complexo gerado com sucesso');
    } catch (complexError) {
      console.error('Erro no PDF complexo, tentando versão simplificada:', complexError.message);
      
      // Buscar dados do pedido para obter clienteId para o fallback
      let clienteId = 'unknown';
      try {
        const pedidoService = require('../services/pedidoService');
        const pedido = await pedidoService.getPedido(pedidoId);
        if (pedido && pedido.clienteId) {
          clienteId = pedido.clienteId;
        }
      } catch (err) {
        console.warn('Não foi possível obter clienteId para fallback:', err.message);
      }
      
      pdfResult = await pdfService.generateSimplePdf(pedidoId, clienteId);
      console.log('PDF simplificado gerado como fallback');
    }

    // Extrair buffer e informações do S3
    const pdfBuffer = pdfResult.buffer || pdfResult; // Compatibilidade com versão antiga
    const s3Info = pdfResult.s3;

    // Definir headers para download do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pedido-${pedidoId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Adicionar informações do S3 no header (se disponível)
    if (s3Info) {
      res.setHeader('X-S3-URL', s3Info.url);
      res.setHeader('X-S3-Key', s3Info.key);
      console.log('PDF também disponível em:', s3Info.url);
    }

    // Enviar o PDF como blob
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF do pedido:', error);
    
    // Verificar se é erro de pedido não encontrado
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao gerar PDF',
      error: error.message
    });
  }
};

// GET /pedidos/:id/pdfs - Listar PDFs salvos no S3 para um pedido
exports.listPedidoPdfs = async (req, res) => {
  try {
    const { id: pedidoId } = req.params;
    
    if (!pedidoId) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido é obrigatório'
      });
    }

    // Verificar se o usuário tem permissão
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // Buscar dados do pedido para obter clienteId
    const pedidoService = require('../services/pedidoService');
    const pedido = await pedidoService.getPedido(pedidoId);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    const AWS = require('aws-sdk');
    const s3 = new AWS.S3();
    const bucket = process.env.S3_BUCKET_NAME;
    
    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'Bucket S3 não configurado'
      });
    }

    // Listar PDFs do pedido no S3 (nova estrutura)
    const prefix = `clientes/${pedido.clienteId}/pedidos/${pedidoId}/pdfs/`;
    const listParams = {
      Bucket: bucket,
      Prefix: prefix
    };

    const result = await s3.listObjectsV2(listParams).promise();
    
    const pdfs = result.Contents.map(obj => ({
      key: obj.Key,
      lastModified: obj.LastModified,
      size: obj.Size,
      url: gerarUrlPresignedFoto(obj.Key),
      filename: obj.Key.split('/').pop()
    }));

    res.json({
      success: true,
      data: {
        pedidoId: pedidoId,
        clienteId: pedido.clienteId,
        pdfs: pdfs
      }
    });

  } catch (error) {
    console.error('Erro ao listar PDFs do pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao listar PDFs',
      error: error.message
    });
  }
};

/**
 * Envia o PDF do pedido via WhatsApp
 * POST /pedidos/:id/enviar-pdf-whatsapp
 */
exports.enviarPdfWhatsApp = async (req, res) => {
  try {
    const { telefoneCliente } = req.body;
    const pedidoId = req.params.id;

    if (!telefoneCliente) {
      return res.status(400).json({
        success: false,
        error: 'telefoneCliente é obrigatório'
      });
    }

    // Buscar pedido
    const pedido = await pedidoService.getPedido(pedidoId);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }

    console.log('[PedidoController] Enviando PDF do pedido via WhatsApp', {
      pedidoId,
      codigo: pedido.codigo,
      telefone: telefoneCliente
    });

    const resultado = await whatsappService.enviarPdfPedidoWhatsApp(
      telefoneCliente,
      pedidoId,
      pedido
    );

    if (resultado.success) {
      res.status(200).json({
        success: true,
        message: 'PDF enviado com sucesso via WhatsApp',
        data: resultado
      });
    } else {
      res.status(400).json({
        success: false,
        error: resultado.error || 'Erro ao enviar PDF'
      });
    }

  } catch (error) {
    console.error('Erro ao enviar PDF via WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Envia detalhes do pedido formatados via WhatsApp
 * POST /pedidos/:id/enviar-detalhes-whatsapp
 */
exports.enviarDetalhesWhatsApp = async (req, res) => {
  try {
    const { telefoneCliente } = req.body;
    const pedidoId = req.params.id;

    if (!telefoneCliente) {
      return res.status(400).json({
        success: false,
        error: 'telefoneCliente é obrigatório'
      });
    }

    // Buscar pedido
    const pedido = await pedidoService.getPedido(pedidoId);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }

    // Buscar cliente
    const cliente = await clienteService.getCliente(pedido.clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }

    console.log('[PedidoController] Enviando detalhes do pedido via WhatsApp', {
      pedidoId,
      codigo: pedido.codigo,
      telefone: telefoneCliente
    });

    const resultado = await whatsappService.enviarDetalhesPedidoWhatsApp(
      telefoneCliente,
      pedido,
      cliente
    );

    if (resultado.success) {
      res.status(200).json({
        success: true,
        message: 'Detalhes do pedido enviados com sucesso via WhatsApp',
        data: resultado
      });
    } else {
      res.status(400).json({
        success: false,
        error: resultado.error || 'Erro ao enviar detalhes'
      });
    }

  } catch (error) {
    console.error('Erro ao enviar detalhes via WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==========================================
// ENDPOINTS DE SETORES
// ==========================================

/**
 * Lista todos os setores disponíveis
 * GET /setores
 */
exports.listarSetores = async (req, res) => {
  try {
    const setores = setorService.listarSetores();
    res.status(200).json({
      success: true,
      data: setores
    });
  } catch (error) {
    console.error('[PedidoController] Erro ao listar setores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Move um pedido para um setor específico
 * POST /pedidos/:id/mover-setor
 * Body: { setorId: string }
 */
exports.moverParaSetor = async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const { setorId, status, funcionarioNome, observacao } = req.body;
    const usuario = {
      sub: req.user?.sub,
      email: req.user?.email,
      name: req.user?.name || req.user?.email,
      role: req.user?.role
    };

    const setorIdResolvido = setorId || resolverSetorIdPorStatus(status);

    if (!setorIdResolvido) {
      return res.status(400).json({
        success: false,
        error: 'setorId ou status válido é obrigatório'
      });
    }

    // Mover pedido para o novo setor
    const pedidoAtualizado = await setorService.moverPedidoParaSetor(
      pedidoId, 
      setorIdResolvido, 
      usuario, 
      funcionarioNome, 
      observacao,
      status
    );

    if (pedidoAtualizado?._noMovement) {
      return res.status(200).json({
        success: true,
        message: 'Pedido já está no setor informado',
        data: assinarFotosPedido(pedidoAtualizado)
      });
    }

    // Enviar notificações sobre mudança de setor
    const setores = setorService.listarSetores();
    const setor = setores.find(s => s.id === setorIdResolvido);
    const nomeSetor = setor ? setor.nome : setorIdResolvido;
    const statusTexto = pedidoAtualizado?.status || `Em produção - ${nomeSetor}`;
    await enviarNotificacoesPedido(pedidoAtualizado, statusTexto);

    res.status(200).json({
      success: true,
      message: 'Pedido movido para o setor com sucesso',
      data: assinarFotosPedido(pedidoAtualizado)
    });

  } catch (error) {
    console.error('[PedidoController] Erro ao mover pedido:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Retorna o próximo setor no fluxo do pedido
 * GET /pedidos/:id/proximo-setor
 */
exports.getProximoSetor = async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const pedido = await pedidoService.getPedido(pedidoId);

    if (!pedido) {
      return res.status(404).json({
        success: false,
        error: 'Pedido não encontrado'
      });
    }

    const proximoSetor = setorService.getProximoSetor(pedido);

    res.status(200).json({
      success: true,
      data: proximoSetor
    });

  } catch (error) {
    console.error('[PedidoController] Erro ao buscar próximo setor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// GET /pedidos/:id/fotos/zip - Baixar todas as fotos do pedido em um arquivo ZIP
exports.downloadPedidoFotosZip = async (req, res) => {
  try {
    const { id: pedidoId } = req.params;

    if (!pedidoId) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido é obrigatório'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const pedido = await pedidoService.getPedido(pedidoId);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    if (!Array.isArray(pedido.fotos) || pedido.fotos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não possui fotos para download'
      });
    }

    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'Bucket S3 não configurado'
      });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="pedido-${pedidoId}-fotos.zip"`);

    const zip = archiver('zip', { zlib: { level: 9 } });

    zip.on('error', (error) => {
      console.error('[PedidoController] Erro ao gerar ZIP de fotos:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar ZIP de fotos',
          error: error.message
        });
      } else {
        res.end();
      }
    });

    zip.pipe(res);

    let adicionadas = 0;

    for (let index = 0; index < pedido.fotos.length; index++) {
      try {
        const foto = pedido.fotos[index];
        const key = extrairS3KeyDaFoto(foto, bucket);
        if (!key) continue;

        const arquivo = await s3.getObject({
          Bucket: bucket,
          Key: key
        }).promise();

        const nomeOriginal = key.split('/').pop() || '';
        const extensaoOriginal = nomeOriginal.includes('.') ? nomeOriginal.slice(nomeOriginal.lastIndexOf('.')) : '';
        const extensao = extensaoOriginal || extensaoPorContentType(arquivo.ContentType);
        const nomeArquivo = `foto-${index + 1}${extensao}`;

        zip.append(arquivo.Body, { name: nomeArquivo });
        adicionadas += 1;
      } catch (errorFoto) {
        console.warn(`[PedidoController] Falha ao adicionar foto ${index + 1} no ZIP:`, errorFoto.message);
      }
    }

    if (adicionadas === 0) {
      zip.append(Buffer.from('Nenhuma foto pôde ser adicionada ao ZIP.'), { name: 'LEIA-ME.txt' });
    }

    zip.finalize();
  } catch (error) {
    console.error('[PedidoController] Erro ao baixar fotos em ZIP:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao baixar fotos',
      error: error.message
    });
  }
};