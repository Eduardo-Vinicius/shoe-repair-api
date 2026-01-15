const axios = require('axios');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // Token do Meta WhatsApp Cloud API
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID; // ID do número do WhatsApp Business

/**
 * Gera o payload do template personalizado para o cliente de acordo com o status do pedido.
 * @param {string} nomeCliente
 * @param {string} status
 * @param {string} descricaoServicos
 * @param {string} modeloTenis
 * @returns {object} Payload do template para envio
 */
function gerarTemplateStatusPedido(nomeCliente, status, descricaoServicos, modeloTenis) {
  console.log('[WhatsApp] Gerando template de status:', {
    nomeCliente,
    status,
    descricaoServicos,
    modeloTenis
  });

  const statusLower = status.toLowerCase();
  console.log('[WhatsApp] Status normalizado:', statusLower);

  if (statusLower === 'criado' || statusLower === 'created') {
    console.log('[WhatsApp] Tipo de template: order_created');
    return {
      type: "template",
      template: {
        name: "order_created",
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: nomeCliente
              },
              {
                type: "text",
                text: descricaoServicos
              },
              {
                type: "text",
                text: modeloTenis
              }
            ]
          }
        ]
      }
    };
  }

  if (statusLower === 'concluido' || statusLower === 'finalizado' || statusLower.includes('finalizado')) {
    console.log('[WhatsApp] Tipo de template: order_status_update_finish');
    return {
      type: "template",
      template: {
        name: "order_status_update_finish",
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: nomeCliente
              },
              {
                type: "text",
                text: descricaoServicos
              },
              {
                type: "text",
                text: modeloTenis
              }
            ]
          }
        ]
      }
    };
  }

  if (statusLower === 'em_andamento' || statusLower === 'em andamento') {
    console.log('[WhatsApp] Tipo de template: update_status_in_progress');
    return {
      type: "template",
      template: {
        name: "update_status_in_progress",
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: nomeCliente
              },
              {
                type: "text",
                text: descricaoServicos
              },
              {
                type: "text",
                text: modeloTenis
              }
            ]
          }
        ]
      }
    };
  }

  if (statusLower === 'cancelado' || statusLower === 'cancelada') {
    console.log('[WhatsApp] Tipo de mensagem: CANCELADO (usando texto simples)');
    return {
      type: "text",
      text: {
        body: `Olá, ${nomeCliente}.\n\n` +
              `Infelizmente, o pedido de *${descricaoServicos}* para o *${modeloTenis}* foi cancelado. Se precisar de mais informações ou quiser reabrir o pedido, estamos à disposição.`
      }
    };
  }

  // Mensagem padrão para outros status (usando texto simples)
  console.log('[WhatsApp] Tipo de mensagem: PADRÃO para status (usando texto simples):', status);
  return {
    type: "text",
    text: {
      body: `Olá, ${nomeCliente}! 😊\n\n` +
            `Temos novidades sobre o seu pedido de *${descricaoServicos}* para o *${modeloTenis}*.\n` +
            `O status agora é: *${status}*.\n\n` +
            `Se tiver dúvidas ou precisar de mais informações, estamos à disposição!\n\n` +
            `Obrigado por confiar no nosso serviço.`
    }
  };
}

/**
 * Envia mensagem de status do pedido para o cliente via WhatsApp.
 * @param {string} telefoneCliente - Telefone do cliente no formato internacional, ex: 5511999999999
 * @param {string} nomeCliente - Nome do cliente
 * @param {string} status - Novo status do pedido
 * @param {string} descricaoServicos - Descrição dos serviços do pedido
 * @param {string} modeloTenis - Modelo do tênis
 */
async function enviarStatusPedido(telefoneCliente, nomeCliente, status, descricaoServicos, modeloTenis) {
  console.log('[WhatsApp] Iniciando envio de status do pedido:', {
    telefoneCliente,
    nomeCliente,
    status,
    descricaoServicos,
    modeloTenis,
    timestamp: new Date().toISOString()
  });

  // Validação das configurações
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('[WhatsApp] API não configurada - variáveis de ambiente ausentes:', {
      hasToken: !!WHATSAPP_TOKEN,
      hasPhoneNumberId: !!WHATSAPP_PHONE_NUMBER_ID
    });
    return;
  }

  console.log('[WhatsApp] Configurações validadas:', {
    tokenLength: WHATSAPP_TOKEN ? WHATSAPP_TOKEN.length : 0,
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID
  });

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
  console.log('[WhatsApp] URL da API:', url);

  const templatePayload = gerarTemplateStatusPedido(nomeCliente, status, descricaoServicos, modeloTenis);
  console.log('[WhatsApp] Template/Mensagem gerada:', {
    tipo: templatePayload.type,
    templateName: templatePayload.template?.name || 'N/A',
    parametros: templatePayload.template?.components?.[0]?.parameters || 'N/A',
    payloadCompleto: JSON.stringify(templatePayload, null, 2)
  });

  const payload = {
    messaging_product: "whatsapp",
    to: telefoneCliente,
    ...templatePayload
  };

  console.log('[WhatsApp] Payload da requisição:', JSON.stringify(payload, null, 2));

  const headers = {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    "Content-Type": "application/json"
  };

  console.log('[WhatsApp] Headers da requisição:', {
    authorization: `Bearer ${WHATSAPP_TOKEN.substring(0, 20)}...`,
    contentType: headers["Content-Type"]
  });

  try {
    console.log('[WhatsApp] Enviando requisição para WhatsApp API...');
    const startTime = Date.now();
    
    const response = await axios.post(url, payload, { headers });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('[WhatsApp] ✅ Mensagem enviada com sucesso!', {
      telefoneCliente,
      nomeCliente,
      status,
      duracaoMs: duration,
      statusCode: response.status,
      responseData: response.data,
      timestamp: new Date().toISOString()
    });

    console.log(`[WhatsApp] Mensagem WhatsApp enviada para ${telefoneCliente} em ${duration}ms`);
    
  } catch (err) {
    console.error('[WhatsApp] ❌ Erro ao enviar mensagem:', {
      telefoneCliente,
      nomeCliente,
      status,
      errorMessage: err.message,
      errorCode: err.code,
      statusCode: err.response?.status,
      statusText: err.response?.statusText,
      responseData: err.response?.data,
      requestConfig: {
        url: err.config?.url,
        method: err.config?.method,
        headers: err.config?.headers ? { ...err.config.headers, Authorization: 'Bearer [HIDDEN]' } : undefined
      },
      stack: err.stack,
      timestamp: new Date().toISOString()
    });

    // Log adicional para erros específicos da API do WhatsApp
    if (err.response?.data?.error) {
      console.error('[WhatsApp] Detalhes do erro da API:', {
        errorType: err.response.data.error.type,
        errorCode: err.response.data.error.code,
        errorMessage: err.response.data.error.message,
        errorSubcode: err.response.data.error.error_subcode,
        fbtrace_id: err.response.data.error.fbtrace_id
      });
    }

    console.error('[WhatsApp] Erro ao enviar mensagem WhatsApp:', err.response?.data || err.message);
  }
}

module.exports = { enviarStatusPedido, gerarTemplateStatusPedido };