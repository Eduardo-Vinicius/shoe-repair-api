const AWS = require('aws-sdk');
const nodemailer = require("nodemailer");
const { ORDER_STATUS, normalizeStatus, isFinalStatus } = require('../utils/orderStatus');
const emailLogModel = require('../models/emailLogModel');

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
  const clienteNome = nomeCliente || 'Cliente';
  const servicos = descricaoServicos || 'Serviços diversos';
  const modelo = modeloTenis || 'Tênis';
  const codigo = codigoPedido || 'N/A';
  const marca = 'A Casa do Tênis';

  let titulo = 'Atualização do seu pedido';
  let destaque = 'Estamos cuidando de cada etapa do seu pedido.';
  let corPrincipal = '#c96b2c';
  let assunto = `A Casa do Tênis | Pedido #${codigo} atualizado`;
  let resumoStatus = statusNormalizado || status || 'Em andamento';

  if (
    statusLower === 'criado' ||
    statusLower === 'created' ||
    statusLower.includes('aguardando') ||
    statusNormalizado === ORDER_STATUS.ATENDIMENTO_RECEBIDO
  ) {
    titulo = 'Pedido recebido com sucesso';
    destaque = 'Seu par chegou por aqui e nossa equipe ja iniciou o acompanhamento.';
    corPrincipal = '#2f7d4a';
    assunto = `A Casa do Tênis | Pedido #${codigo} recebido`;
    resumoStatus = 'Recebido';
  } else if (isFinalStatus(statusNormalizado)) {
    titulo = 'Seu pedido esta pronto para retirada';
    destaque = 'Finalizamos o servico e seu tenis esta pronto para voltar com voce.';
    corPrincipal = '#1f5fbf';
    assunto = `A Casa do Tênis | Pedido #${codigo} pronto para retirada`;
    resumoStatus = 'Finalizado';
  }

  let fotosHtml = '';
  if (fotosAssinadas && fotosAssinadas.length > 0) {
    fotosHtml = `
      <div class="section-card">
        <h3>Fotos do pedido</h3>
        <div class="photos-grid">
          ${fotosAssinadas.map(foto => `
            <img src="${foto}" alt="Foto do pedido" class="photo-item" />
          `).join('')}
        </div>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; background-color: #f5efe8; font-family: Georgia, 'Times New Roman', serif; color: #2c241f; }
        .wrapper { width: 100%; padding: 24px 12px; box-sizing: border-box; }
        .container { max-width: 640px; margin: 0 auto; background: #fffaf5; border-radius: 22px; overflow: hidden; box-shadow: 0 14px 40px rgba(79, 49, 23, 0.12); }
        .header { background: linear-gradient(135deg, ${corPrincipal} 0%, #2c241f 100%); color: #fff8f1; padding: 36px 32px 28px; }
        .brand { font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.8; margin-bottom: 12px; }
        .header h1 { margin: 0; font-size: 30px; line-height: 1.2; }
        .header p { margin: 12px 0 0; font-size: 16px; line-height: 1.6; max-width: 460px; }
        .content { padding: 28px 32px 18px; }
        .intro { font-size: 17px; line-height: 1.7; margin: 0 0 22px; }
        .status-badge { display: inline-block; background: #f3e3d5; color: ${corPrincipal}; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 20px; }
        .section-card { background: #ffffff; border: 1px solid #ecd9c9; border-radius: 18px; padding: 20px; margin-bottom: 18px; }
        .section-card h3 { margin: 0 0 14px; font-size: 18px; color: #2c241f; }
        .detail-row { padding: 10px 0; border-bottom: 1px solid #f0e6dc; font-size: 15px; }
        .detail-row:last-child { border-bottom: none; padding-bottom: 0; }
        .detail-label { display: inline-block; min-width: 110px; font-weight: bold; color: #6c5748; }
        .timeline { margin: 0; padding-left: 18px; color: #5a473b; }
        .timeline li { margin-bottom: 10px; }
        .photos-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        .photo-item { width: 136px; height: 136px; object-fit: cover; border-radius: 14px; border: 1px solid #e8d5c3; }
        .footer { background: #f1e3d4; padding: 20px 32px 28px; font-size: 13px; line-height: 1.6; color: #5a473b; }
        .footer strong { color: #2c241f; }
        @media only screen and (max-width: 640px) {
          .wrapper { padding: 0; }
          .container { border-radius: 0; }
          .header, .content, .footer { padding-left: 20px; padding-right: 20px; }
          .header h1 { font-size: 26px; }
          .photo-item { width: calc(50% - 5px); height: 120px; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="brand">${marca}</div>
            <h1>${titulo}</h1>
            <p>${destaque}</p>
          </div>
          <div class="content">
            <div class="status-badge">${resumoStatus}</div>
            <p class="intro">Olá <strong>${clienteNome}</strong>, seu pedido <strong>#${codigo}</strong> segue acompanhado pela equipe da ${marca}. Abaixo estao os detalhes desta etapa.</p>

            <div class="section-card">
              <h3>Resumo do pedido</h3>
              <div class="detail-row"><span class="detail-label">Codigo</span> #${codigo}</div>
              <div class="detail-row"><span class="detail-label">Tenis</span> ${modelo}</div>
              <div class="detail-row"><span class="detail-label">Servicos</span> ${servicos}</div>
              <div class="detail-row"><span class="detail-label">Status</span> ${statusNormalizado || status || 'Em andamento'}</div>
            </div>

            <div class="section-card">
              <h3>O que acontece agora</h3>
              <ul class="timeline">
                <li>Nos acompanhamos cada etapa do processo e avisamos por email quando houver movimentacao.</li>
                <li>Se precisar tirar duvidas, voce pode responder este email e nosso time segue o atendimento.</li>
                <li>Quando o pedido estiver pronto, voce recebera uma nova confirmacao com o aviso de retirada.</li>
              </ul>
            </div>

            ${fotosHtml}
          </div>
          <div class="footer">
            <strong>${marca}</strong><br />
            Cuidado especializado para limpar, restaurar e entregar seu tenis com atencao em cada detalhe.<br /><br />
            Este email foi enviado automaticamente para acompanhar o andamento do seu pedido. Se precisar de ajuda, basta responder esta mensagem.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = [
    `${marca}`,
    '',
    `Olá ${clienteNome},`,
    '',
    destaque,
    '',
    'Resumo do pedido:',
    `- Codigo: #${codigo}`,
    `- Tenis: ${modelo}`,
    `- Servicos: ${servicos}`,
    `- Status: ${statusNormalizado || status || 'Em andamento'}`,
    '',
    'Proximos passos:',
    '- Vamos avisar por email sempre que houver uma nova etapa.',
    '- Se precisar, responda esta mensagem para falar com a equipe.',
    '',
    'Obrigado pela confiança,',
    marca
  ].join('\n');

  return {
    subject: assunto,
    html,
    text,
  };
}


// Configurar AWS SES
const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1'
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@yourdomain.com';
const REPLY_TO_EMAIL = process.env.SES_REPLY_TO_EMAIL || FROM_EMAIL;
const EMAIL_FROM_NAME = (process.env.EMAIL_FROM_NAME || process.env.GMAIL_FROM_NAME || 'A Casa do Tênis').trim();

function montarRemetente(email) {
  const remetenteEmail = String(email || process.env.GMAIL_USER || FROM_EMAIL).trim();
  return `"${EMAIL_FROM_NAME}" <${remetenteEmail}>`;
}

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
    from: montarRemetente(process.env.GMAIL_USER),
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
  // 📋 AUDITORIA: Log estruturado para rastrear envios de email
  const auditLog = {
    timestamp: new Date().toISOString(),
    operacao: 'enviarStatusPedido',
    codigoPedido,
    emailCliente,
    nomeCliente,
    status,
    fotosCount: fotos?.length || 0
  };
  
  console.log('[Email] 📧 AUDITORIA: Iniciando envio de email de status', auditLog);

  // Validação das configurações GMAIL
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] ❌ Gmail não configurado - variáveis GMAIL_USER ou GMAIL_APP_PASSWORD não definidas');
    auditLog.resultado = 'ERRO_CONFIG_GMAIL';
    console.warn('[Email] 📋 AUDITORIA:', auditLog);
    
    // Log de falha de configuração
    await emailLogModel.criarLogEmail({
      codigoPedido,
      emailCliente,
      nomeCliente,
      assunto: '[Sistema] Falha de Configuração',
      tipo: 'status_update',
      status: 'falha_config',
      mensagem: 'Gmail não configurado - GMAIL_USER ou GMAIL_APP_PASSWORD não definidos',
      errorCode: 'GMAIL_NOT_CONFIGURED'
    }).catch(err => console.warn('[Email] Aviso: Log de config não foi persistido:', err.message));
    
    return;
  }

  // Validação do email do cliente
  if (!emailCliente || !emailCliente.includes('@')) {
    console.warn('[Email] ❌ Email do cliente inválido:', emailCliente);
    auditLog.resultado = 'ERRO_EMAIL_INVALIDO';
    console.warn('[Email] 📋 AUDITORIA:', auditLog);
    
    // Log de email inválido
    await emailLogModel.criarLogEmail({
      codigoPedido,
      emailCliente: emailCliente || 'invalido@invalido.com',
      nomeCliente,
      assunto: '[Sistema] Email Inválido',
      tipo: 'status_update',
      status: 'erro',
      mensagem: `Email do cliente inválido: ${emailCliente}`,
      errorCode: 'INVALID_EMAIL'
    }).catch(err => console.warn('[Email] Aviso: Log de email inválido não foi persistido:', err.message));
    
    return;
  }

  const { subject, html, text } = gerarConteudoEmail(
    nomeCliente,
    status,
    descricaoServicos,
    modeloTenis,
    codigoPedido,
    fotos
  );
  const startTime = Date.now();

  try {
    // Configuração do email usando Nodemailer (Gmail)
    const mailOptions = {
      from: montarRemetente(process.env.GMAIL_USER),
      to: emailCliente,
      subject: subject,
      text: text,
      html: html,
      replyTo: process.env.GMAIL_USER
    };

    console.log('[Email] 📧 Enviando email via Gmail...', {
      to: emailCliente,
      subject,
      from: mailOptions.from,
      status,
      codigoPedido
    });

    const result = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    // ✅ SUCESSO: Log estruturado de auditoria
    const auditSuccessLog = {
      timestamp: new Date().toISOString(),
      operacao: 'enviarStatusPedido',
      codigoPedido,
      emailCliente,
      status,
      resultado: 'SUCESSO',
      messageId: result.messageId,
      duracaoMs: duration
    };
    console.log('[Email] 📋 AUDITORIA:', auditSuccessLog);
    
    // Persistir log de email no banco
    await emailLogModel.criarLogEmail({
      codigoPedido,
      emailCliente,
      nomeCliente: nomeCliente || 'Desconhecido',
      assunto: subject || `Atualização do Pedido #${codigoPedido}`,
      tipo: 'status_update',
      status: 'sucesso',
      mensagem: 'Email enviado com sucesso via Gmail',
      duracaoMs: duration,
      messageId: result.messageId
    }).catch(err => console.warn('[Email] Aviso: Log não foi persistido:', err.message));
    
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
    const duration = Date.now() - startTime;
    // ❌ ERRO: Log estruturado de auditoria
    const auditErrorLog = {
      timestamp: new Date().toISOString(),
      operacao: 'enviarStatusPedido',
      codigoPedido,
      emailCliente,
      status,
      resultado: 'ERRO',
      assunto: subject,
      remetente: montarRemetente(process.env.GMAIL_USER),
      errorMessage: err.message,
      errorCode: err.code,
      errorResponse: err.response,
      duracaoMs: duration
    };
    console.error('[Email] 📋 AUDITORIA:', auditErrorLog);
    
    // Persistir log de falha no banco
    await emailLogModel.criarLogEmail({
      codigoPedido,
      emailCliente,
      nomeCliente: nomeCliente || 'Desconhecido',
      assunto: subject || `Atualização do Pedido #${codigoPedido}`,
      tipo: 'status_update',
      status: 'erro',
      mensagem: `Erro ao enviar email: ${err.message}`,
      errorCode: err.code,
      duracaoMs: duration
    }).catch(errLog => console.warn('[Email] Aviso: Log de erro não foi persistido:', errLog.message));
    
    console.error('[Email] ❌ Erro ao enviar email:', {
      emailCliente,
      nomeCliente,
      status,
      codigoPedido,
      subject,
      from: montarRemetente(process.env.GMAIL_USER),
      errorMessage: err.message,
      errorCode: err.code,
      errorResponse: err.response,
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

/**
 * Envia email de confirmação de pedido com PDF em anexo (para novos pedidos)
 * @param {string} emailCliente - Email do cliente
 * @param {string} nomeCliente - Nome do cliente
 * @param {object} pedido - Dados completos do pedido
 * @param {Buffer} pdfBuffer - Buffer do PDF gerado (opcional)
 * @returns {Promise<boolean>}
 */
async function enviarEmailComPdfNovorecebimento(emailCliente, nomeCliente, pedido, pdfBuffer = null) {
  console.log('[Email] 📧 Enviando email de NOVO PEDIDO com PDF:', {
    emailCliente,
    nomeCliente,
    pedidoId: pedido?.id,
    codigoPedido: pedido?.codigo,
    temPdf: !!pdfBuffer,
    tamanhoPdf: pdfBuffer?.length || 0,
    timestamp: new Date().toISOString()
  });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[Email] ❌ Gmail não configurado');
    return false;
  }

  if (!emailCliente || !emailCliente.includes('@')) {
    console.warn('[Email] ❌ Email do cliente inválido:', emailCliente);
    return false;
  }

  try {
    // Gerar conteúdo do email
    const servicosTexto = pedido?.descricaoServicos || 
                         (pedido?.servicos?.map(s => s.nome).join(', ') || 'Serviços diversos');
    const modeloTenis = pedido?.modeloTenis || 'Tênis';
    const codigoPedido = pedido?.codigo || pedido?.id || 'N/A';
    const fotos = pedido?.fotos || [];

    const { subject, html, text } = gerarConteudoEmail(
      nomeCliente,
      'Criado',
      servicosTexto,
      modeloTenis,
      codigoPedido,
      fotos
    );

    // Montar opções do email com anexo PDF (se disponível)
    const mailOptions = {
      from: `"Shoe Repair" <${process.env.GMAIL_USER}>`,
      to: emailCliente,
      subject: subject,
      text: text,
      html: html,
      replyTo: process.env.GMAIL_USER
    };

    // Anexar PDF se disponível
    if (pdfBuffer && Buffer.isBuffer(pdfBuffer)) {
      mailOptions.attachments = [
        {
          filename: `pedido-${codigoPedido}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ];
      console.log('[Email] 📎 PDF anexado ao email:', {
        filename: `pedido-${codigoPedido}.pdf`,
        tamanho: pdfBuffer.length,
        bytes: pdfBuffer.length
      });
    } else {
      console.log('[Email] ⚠️ PDF não disponível para anexar - será enviado só email');
    }

    // Enviar email
    const startTime = Date.now();
    const result = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;

    // ✅ Log de auditoria de sucesso
    const auditLog = {
      timestamp: new Date().toISOString(),
      operacao: 'enviarEmailComPdfNovorecebimento',
      codigoPedido,
      emailCliente,
      resultado: 'SUCESSO',
      messageId: result.messageId,
      duracaoMs: duration,
      temPdf: !!pdfBuffer,
      tamanhoPdf: pdfBuffer?.length || 0
    };
    console.log('[Email] 📋 AUDITORIA:', auditLog);
    
    // Persistir log de novo pedido no banco
    await emailLogModel.criarLogEmail({
      pedidoId: pedido?.id,
      codigoPedido,
      emailCliente,
      nomeCliente,
      assunto: subject || `✅ Pedido #${codigoPedido} - Confirmação de Recebimento`,
      tipo: 'novo_pedido',
      status: 'sucesso',
      mensagem: 'Email de novo pedido enviado com sucesso via Gmail',
      duracaoMs: duration,
      temPdf: !!pdfBuffer,
      tamanhoPdf: pdfBuffer?.length || 0,
      messageId: result.messageId
    }).catch(err => console.warn('[Email] Aviso: Log de novo pedido não foi persistido:', err.message));
    
    console.log('[Email] ✅ Email de novo pedido enviado com sucesso!', {
      emailCliente,
      nomeCliente,
      codigoPedido,
      messageId: result.messageId,
      duracaoMs: duration,
      temPdf: !!pdfBuffer
    });

    return true;
  } catch (err) {
    // ❌ Log de auditoria de erro
    const auditLog = {
      timestamp: new Date().toISOString(),
      operacao: 'enviarEmailComPdfNovorecebimento',
      codigoPedido: pedido?.codigo || pedido?.id,
      emailCliente,
      resultado: 'ERRO',
      errorMessage: err.message,
      errorCode: err.code
    };
    console.error('[Email] 📋 AUDITORIA:', auditLog);
    
    // Persistir log de falha no banco
    await emailLogModel.criarLogEmail({
      pedidoId: pedido?.id,
      codigoPedido: pedido?.codigo || pedido?.id,
      emailCliente,
      nomeCliente,
      assunto: `[ERRO] Pedido ${pedido?.codigo || pedido?.id} - Email não enviado`,
      tipo: 'novo_pedido',
      status: 'erro',
      mensagem: `Erro ao enviar email de novo pedido: ${err.message}`,
      errorCode: err.code
    }).catch(errLog => console.warn('[Email] Aviso: Log de erro de novo pedido não foi persistido:', errLog.message));
    
    console.error('[Email] ❌ Erro ao enviar email com PDF:', {
      emailCliente,
      nomeCliente,
      codigoPedido: pedido?.codigo,
      errorMessage: err.message,
      errorCode: err.code,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    // Não lança o erro para não quebrar o fluxo principal
    return false;
  }
}

module.exports = {
  enviarStatusPedido,
  enviarEmail,
  enviarEmailComPdfNovorecebimento,
  enviarSMSStatus, // Função de SMS via AWS SNS
  gerarConteudoEmail
};
