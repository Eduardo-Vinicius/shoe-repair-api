const AWS = require('aws-sdk');
const nodemailer = require("nodemailer");
const { ORDER_STATUS, normalizeStatus, isFinalStatus } = require('../utils/orderStatus');

const s3 = new AWS.S3();
const PRESIGNED_URL_EXPIRES_SECONDS = Number(process.env.S3_PRESIGNED_EXPIRES_SECONDS || 3600);

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

function assinarFotosEmail(fotos = []) {
  if (!Array.isArray(fotos) || fotos.length === 0) return [];
  return fotos.map(gerarUrlPresignedFoto);
}

// Configuração do transporte de e-mail
const transporter = nodemailer.createTransport({
  service: "gmail", // Usando o serviço Gmail
  auth: {
    user: process.env.GMAIL_USER, // Seu e-mail
    pass: process.env.GMAIL_APP_PASSWORD, // Sua senha de aplicativo
  },
});

// Função para gerar o conteúdo do e-mail com HTML estilizado
function gerarConteudoEmail(nomeCliente, status, descricaoServicos, modeloTenis, codigoPedido, fotos = []) {
  const fotosAssinadas = assinarFotosEmail(fotos);
  const statusNormalizado = normalizeStatus(status, { strict: false, fallback: String(status || '') });
  const statusLower = String(statusNormalizado || status || '').toLowerCase();
  
  // Gerar HTML das fotos se existirem
  let fotosHtml = '';
  if (fotosAssinadas && fotosAssinadas.length > 0) {
    fotosHtml = `
      <div class="info-box">
        <h3>📸 Fotos do Pedido</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
          ${fotosAssinadas.map(foto => `
            <img src="${foto}" alt="Foto do pedido" style="width: 150px; height: 150px; object-fit: cover; border-radius: 5px; border: 2px solid #ddd;" />
          `).join('')}
        </div>
      </div>
    `;
  }

  // Email de criação do pedido
  if (
    statusLower === "criado" ||
    statusLower === "created" ||
    statusLower.includes("aguardando") ||
    statusNormalizado === ORDER_STATUS.ATENDIMENTO_RECEBIDO
  ) {
    return {
      subject: `✅ Pedido #${codigoPedido} - Confirmação de Recebimento`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
            .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Pedido Confirmado!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${nomeCliente}</strong>,</p>
              <p>Recebemos seu pedido com sucesso! Já estamos preparando tudo para cuidar do seu tênis.</p>
              <div class="info-box">
                <h3>📦 Detalhes do Pedido</h3>
                <p><strong>Código:</strong> #${codigoPedido}</p>
                <p><strong>Tênis:</strong> ${modeloTenis}</p>
                <p><strong>Serviços:</strong> ${descricaoServicos}</p>
              </div>
              ${fotosHtml}
              <p>Você receberá atualizações por email sempre que o status do seu pedido mudar.</p>
              <p>Obrigado pela confiança! 🙏</p>
            </div>
            <div class="footer">
              <p>Este é um email automático. Para dúvidas, responda este email ou entre em contato conosco.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Olá ${nomeCliente},

Recebemos seu pedido com sucesso!

Detalhes do Pedido:
- Código: #${codigoPedido}
- Tênis: ${modeloTenis}
- Serviços: ${descricaoServicos}

Você receberá atualizações por email sempre que o status mudar.

Obrigado pela confiança!
      `,
    };
  }

  // Email de pedido finalizado
  if (isFinalStatus(statusNormalizado)) {
    return {
      subject: `🎊 Pedido #${codigoPedido} - Finalizado! Pronto para Retirada`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
            .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎊 Seu Pedido Está Pronto!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${nomeCliente}</strong>,</p>
              <p>Ótimas notícias! Seu pedido foi finalizado e está pronto para retirada! 🎉</p>
              <div class="info-box">
                <h3>📦 Detalhes do Pedido</h3>
                <p><strong>Código:</strong> #${codigoPedido}</p>
                <p><strong>Tênis:</strong> ${modeloTenis}</p>
                <p><strong>Serviços Realizados:</strong> ${descricaoServicos}</p>
              </div>
              ${fotosHtml}
              <p>Agradecemos pela confiança e esperamos vê-lo em breve! 🙏</p>
            </div>
            <div class="footer">
              <p>Este é um email automático. Para dúvidas, responda este email ou entre em contato conosco.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Olá ${nomeCliente},

Ótimas notícias! Seu pedido foi finalizado e está pronto para retirada!

Detalhes do Pedido:
- Código: #${codigoPedido}
- Tênis: ${modeloTenis}
- Serviços Realizados: ${descricaoServicos}

Agradecemos pela confiança!
      `,
    };
  }

  // Email de atualização de status genérico
  return {
    subject: `📢 Pedido #${codigoPedido} - Atualização de Status`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #FF9800; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Atualização do Pedido</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${nomeCliente}</strong>,</p>
            <p>Seu pedido teve uma atualização de status!</p>
            <div class="info-box">
              <h3>📦 Detalhes do Pedido</h3>
              <p><strong>Código:</strong> #${codigoPedido}</p>
              <p><strong>Tênis:</strong> ${modeloTenis}</p>
              <p><strong>Serviços:</strong> ${descricaoServicos}</p>
              <p><strong>Status Atual:</strong> ${status}</p>
            </div>
            ${fotosHtml}
            <p>Obrigado pela confiança! 🙏</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Para dúvidas, responda este email ou entre em contato conosco.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Olá ${nomeCliente},

Seu pedido teve uma atualização de status!

Detalhes do Pedido:
- Código: #${codigoPedido}
- Tênis: ${modeloTenis}
- Serviços: ${descricaoServicos}
- Status Atual: ${status}

Obrigado pela confiança!
    `,
  };
}


// Configurar AWS SES
const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1'
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@yourdomain.com';
const REPLY_TO_EMAIL = process.env.SES_REPLY_TO_EMAIL || FROM_EMAIL;

// Função para enviar e-mail via Nodemailer (Gmail)
// Mantém compatibilidade CommonJS (sem `export`)
async function enviarEmail(to, subject, order, status) {
  // Formatar serviços se for array de objetos
  let servicosFormatados = 'Serviços';
  if (order?.descricaoServicos) {
    servicosFormatados = order.descricaoServicos;
  } else if (Array.isArray(order?.servicos)) {
    // Se servicos for array de objetos, converter para string formatada
    servicosFormatados = order.servicos.map(s => s.nome || s).join(', ');
  } else if (order?.servicos) {
    servicosFormatados = order.servicos;
  } else if (order?.serviceType) {
    servicosFormatados = order.serviceType;
  } else if (order?.description) {
    servicosFormatados = order.description;
  }

  // Reaproveita o gerador principal (retorna { subject, html, text })
  const conteudo = gerarConteudoEmail(
    order?.clientName || order?.nomeCliente || 'Cliente',
    status,
    servicosFormatados,
    order?.modeloTenis || order?.sneaker || order?.modelo || 'Tênis',
    order?.codigo || order?.id || 'N/A'
  );

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject: (subject && String(subject).trim()) ? subject : conteudo.subject,
    html: conteudo.html,
    text: conteudo.text,
    replyTo: REPLY_TO_EMAIL,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email/Nodemailer] E-mail enviado para ${to}`);
    return true;
  } catch (error) {
    console.error('[Email/Nodemailer] Erro ao enviar e-mail:', error);
    // Não lança erro para não quebrar o fluxo principal
    return false;
  }
}
/**
 * Gera o conteúdo HTML do email baseado no status do pedido
 * @param {string} nomeCliente
 * @param {string} status
 * @param {string} descricaoServicos
 * @param {string} modeloTenis
 * @param {string} codigoPedido
 * @returns {object} { subject, html, text }
 */
// function gerarConteudoEmail(nomeCliente, status, descricaoServicos, modeloTenis, codigoPedido) {
//   const statusLower = status.toLowerCase();
  
//   // Email de criação do pedido
//   if (statusLower === 'criado' || statusLower === 'created' || statusLower.includes('aguardando')) {
//     return {
//       subject: `✅ Pedido #${codigoPedido} - Confirmação de Recebimento`,
//       html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="UTF-8">
//           <style>
//             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//             .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
//             .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
//             .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
//             .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
//             .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>🎉 Pedido Confirmado!</h1>
//             </div>
//             <div class="content">
//               <p>Olá <strong>${nomeCliente}</strong>,</p>
              
//               <p>Recebemos seu pedido com sucesso! Já estamos preparando tudo para cuidar do seu tênis.</p>
              
//               <div class="info-box">
//                 <h3>📦 Detalhes do Pedido</h3>
//                 <p><strong>Código:</strong> #${codigoPedido}</p>
//                 <p><strong>Tênis:</strong> ${modeloTenis}</p>
//                 <p><strong>Serviços:</strong> ${descricaoServicos}</p>
//               </div>
              
//               <p>Você receberá atualizações por email sempre que o status do seu pedido mudar.</p>
              
//               <p>Se tiver alguma dúvida, basta responder este email.</p>
              
//               <p>Obrigado pela confiança! 🙏</p>
//             </div>
//             <div class="footer">
//               <p>Este é um email automático. Para dúvidas, responda este email ou entre em contato conosco.</p>
//             </div>
//           </div>
//         </body>
//         </html>
//       `,
//       text: `
// Olá ${nomeCliente},

// Recebemos seu pedido com sucesso!

// Detalhes do Pedido:
// - Código: #${codigoPedido}
// - Tênis: ${modeloTenis}
// - Serviços: ${descricaoServicos}

// Você receberá atualizações por email sempre que o status mudar.

// Obrigado pela confiança!
//       `
//     };
//   }
  
//   // Email de pedido finalizado
//   if (statusLower === 'concluido' || statusLower === 'finalizado' || statusLower.includes('finalizado')) {
//     return {
//       subject: `🎊 Pedido #${codigoPedido} - Finalizado! Pronto para Retirada`,
//       html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="UTF-8">
//           <style>
//             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//             .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
//             .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
//             .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
//             .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3; }
//             .highlight { background-color: #FFF3CD; padding: 15px; border-radius: 5px; margin: 15px 0; }
//           </style>
//         </head>
//         <body>
//           <div class="container">
//             <div class="header">
//               <h1>🎊 Seu Pedido Está Pronto!</h1>
//             </div>
//             <div class="content">
//               <p>Olá <strong>${nomeCliente}</strong>,</p>
              
//               <p>Ótimas notícias! Seu pedido foi finalizado e está pronto para retirada! 🎉</p>
              
//               <div class="info-box">
//                 <h3>📦 Detalhes do Pedido</h3>
//                 <p><strong>Código:</strong> #${codigoPedido}</p>
//                 <p><strong>Tênis:</strong> ${modeloTenis}</p>
//                 <p><strong>Serviços Realizados:</strong> ${descricaoServicos}</p>
//               </div>
              
//               <div class="highlight">
//                 <h3>👟 Próximos Passos</h3>
//                 <p>Seu tênis está aguardando por você! Venha retirá-lo em nossa loja.</p>
//                 <p><strong>Não esqueça de trazer o código do pedido: #${codigoPedido}</strong></p>
//               </div>
              
//               <p>Agradecemos pela confiança e esperamos vê-lo em breve! 🙏</p>
//             </div>
//             <div class="footer">
//               <p>Este é um email automático. Para dúvidas, responda este email ou entre em contato conosco.</p>
//             </div>
//           </div>
//         </body>
//         </html>
//       `,
//       text: `
// Olá ${nomeCliente},

// Ótimas notícias! Seu pedido foi finalizado e está pronto para retirada!

// Detalhes do Pedido:
// - Código: #${codigoPedido}
// - Tênis: ${modeloTenis}
// - Serviços Realizados: ${descricaoServicos}

// Próximos Passos:
// Seu tênis está aguardando por você! Venha retirá-lo em nossa loja.
// Não esqueça de trazer o código do pedido: #${codigoPedido}

// Agradecemos pela confiança!
//       `
//     };
//   }
  
//   // Email de atualização de status genérico
//   return {
//     subject: `📢 Pedido #${codigoPedido} - Atualização de Status`,
//     html: `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta charset="UTF-8">
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
//           .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
//           .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 5px 5px; }
//           .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #FF9800; }
//           .status { font-size: 18px; font-weight: bold; color: #FF9800; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>📢 Atualização do Pedido</h1>
//           </div>
//           <div class="content">
//             <p>Olá <strong>${nomeCliente}</strong>,</p>
            
//             <p>Seu pedido teve uma atualização de status!</p>
            
//             <div class="info-box">
//               <h3>📦 Detalhes do Pedido</h3>
//               <p><strong>Código:</strong> #${codigoPedido}</p>
//               <p><strong>Tênis:</strong> ${modeloTenis}</p>
//               <p><strong>Serviços:</strong> ${descricaoServicos}</p>
//               <p class="status">Status Atual: ${status}</p>
//             </div>
            
//             <p>Continue acompanhando seu pedido. Você receberá novos emails a cada mudança de status.</p>
            
//             <p>Obrigado pela confiança! 🙏</p>
//           </div>
//           <div class="footer">
//             <p>Este é um email automático. Para dúvidas, responda este email ou entre em contato conosco.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `,
//     text: `
// Olá ${nomeCliente},

// Seu pedido teve uma atualização de status!

// Detalhes do Pedido:
// - Código: #${codigoPedido}
// - Tênis: ${modeloTenis}
// - Serviços: ${descricaoServicos}
// - Status Atual: ${status}

// Continue acompanhando seu pedido.

// Obrigado pela confiança!
//     `
//   };
// }

/**
 * Envia email de notificação de status do pedido para o cliente
 * @param {string} emailCliente - Email do cliente
 * @param {string} nomeCliente - Nome do cliente
 * @param {string} status - Status atual do pedido
 * @param {string} descricaoServicos - Descrição dos serviços
 * @param {string} modeloTenis - Modelo do tênis
 * @param {string} codigoPedido - Código do pedido
 */
async function enviarStatusPedido(emailCliente, nomeCliente, status, descricaoServicos, modeloTenis, codigoPedido = 'N/A', fotos = []) {
  console.log('[Email] Iniciando envio de email de status do pedido:', {
    emailCliente,
    nomeCliente,
    status,
    descricaoServicos,
    modeloTenis,
    codigoPedido,
    fotosCount: fotos?.length || 0,
    timestamp: new Date().toISOString()
  });

  // Validação das configurações GMAIL
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] Gmail não configurado - variáveis GMAIL_USER ou GMAIL_APP_PASSWORD não definidas');
    return;
  }

  // Validação do email do cliente
  if (!emailCliente || !emailCliente.includes('@')) {
    console.warn('[Email] Email do cliente inválido:', emailCliente);
    return;
  }

  try {
    const { subject, html, text } = gerarConteudoEmail(nomeCliente, status, descricaoServicos, modeloTenis, codigoPedido, fotos);
    
    // Configuração do email usando Nodemailer (Gmail)
    const mailOptions = {
      from: `"Shoe Repair" <${process.env.GMAIL_USER}>`,
      to: emailCliente,
      subject: subject,
      text: text,
      html: html,
      replyTo: process.env.GMAIL_USER
    };

    console.log('[Email] 📧 Enviando email via Gmail...', {
      to: emailCliente,
      subject,
      from: process.env.GMAIL_USER
    });

    const startTime = Date.now();
    const result = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    console.log('[Email] ✅ Email enviado com sucesso via Gmail!', {
      emailCliente,
      nomeCliente,
      status,
      messageId: result.messageId,
      duracaoMs: duration,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (err) {
    console.error('[Email] ❌ Erro ao enviar email:', {
      emailCliente,
      nomeCliente,
      status,
      errorMessage: err.message,
      errorCode: err.code,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    // Não lança o erro para não quebrar o fluxo principal
    // O pedido deve ser criado/atualizado mesmo se o email falhar
    return null;
  }
}

/**
 * Envia SMS de status do pedido via AWS SNS
 * IMPORTANTE: SMS é enviado APENAS quando o pedido está finalizado (pronto para retirada)
 * @param {string} telefoneCliente - Telefone do cliente (formato: +5511999999999)
 * @param {string} nomeCliente - Nome do cliente
 * @param {string} status - Status atual do pedido
 * @param {string} codigoPedido - Código do pedido
 * @returns {Promise<object|null>} Resultado do envio ou null se desabilitado/erro
 */
async function enviarSMSStatus(telefoneCliente, nomeCliente, status, codigoPedido) {
  // Verificar se SMS está habilitado
  const smsEnabled = process.env.SMS_ENABLED === 'true';
  
  if (!smsEnabled) {
    console.log('[SMS] ⏸️  SMS desabilitado. Configure SMS_ENABLED=true para ativar.');
    return null;
  }

  // ENVIAR SMS APENAS PARA STATUS FINALIZADOS (economia de custos)
  const isStatusFinalizado = isFinalStatus(status);

  if (!isStatusFinalizado) {
    console.log('[SMS] ⏭️  SMS não enviado - apenas para status finalizados. Status atual:', status);
    return null;
  }

  // Validar formato do telefone
  if (!telefoneCliente || !telefoneCliente.startsWith('+')) {
    console.error('[SMS] ❌ Telefone inválido. Use formato internacional: +5511999999999');
    return null;
  }

  try {
    console.log('[SMS] 📱 Enviando SMS...', {
      telefone: telefoneCliente.substring(0, 6) + '****', // Oculta parte do número
      nomeCliente,
      status,
      codigoPedido
    });

    const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
    
    // Mensagem otimizada para status finalizado (SMS tem limite de 160 caracteres)
    const mensagem = `${nomeCliente}, seu pedido #${codigoPedido} esta pronto para retirada! Aguardamos voce. Obrigado!`;
    
    const params = {
      Message: mensagem,
      PhoneNumber: telefoneCliente,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional' // SMS transacional (não marketing)
        },
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: process.env.SMS_SENDER_ID || 'ShoeRepair' // Nome que aparece (nem todos países suportam)
        }
      }
    };

    const startTime = Date.now();
    const result = await sns.publish(params).promise();
    const duration = Date.now() - startTime;

    console.log('[SMS] ✅ SMS enviado com sucesso!', {
      telefone: telefoneCliente.substring(0, 6) + '****',
      messageId: result.MessageId,
      duracaoMs: duration,
      caracteres: mensagem.length,
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (err) {
    console.error('[SMS] ❌ Erro ao enviar SMS:', {
      telefone: telefoneCliente.substring(0, 6) + '****',
      errorMessage: err.message,
      errorCode: err.code,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    // Não lança o erro para não quebrar o fluxo principal
    return null;
  }
}

module.exports = {
  enviarStatusPedido,
  enviarEmail,
  enviarSMSStatus, // Função de SMS via AWS SNS
  gerarConteudoEmail
};
