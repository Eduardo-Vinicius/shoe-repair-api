const AWS = require('aws-sdk');
const nodemailer = require("nodemailer");

// Configuração do transporte de e-mail
const transporter = nodemailer.createTransport({
  service: "gmail", // Usando o serviço Gmail
  auth: {
    user: process.env.GMAIL_USER, // Seu e-mail
    pass: process.env.GMAIL_APP_PASSWORD, // Sua senha de aplicativo
  },
});

// Função para gerar o conteúdo do e-mail com HTML estilizado
function gerarConteudoEmail(nomeCliente, status, descricaoServicos, modeloTenis, codigoPedido) {
  const statusLower = status.toLowerCase();

  // Email de criação do pedido
  if (statusLower === "criado" || statusLower === "created" || statusLower.includes("aguardando")) {
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
  if (statusLower === "concluido" || statusLower === "finalizado" || statusLower.includes("finalizado")) {
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
async function enviarStatusPedido(emailCliente, nomeCliente, status, descricaoServicos, modeloTenis, codigoPedido = 'N/A') {
  console.log('[Email] Iniciando envio de email de status do pedido:', {
    emailCliente,
    nomeCliente,
    status,
    descricaoServicos,
    modeloTenis,
    codigoPedido,
    timestamp: new Date().toISOString()
  });

  // Validação das configurações
  if (!FROM_EMAIL || FROM_EMAIL === 'noreply@yourdomain.com') {
    console.warn('[Email] SES não configurado - variável SES_FROM_EMAIL não definida ou usando valor padrão');
    return;
  }

  // Validação do email do cliente
  if (!emailCliente || !emailCliente.includes('@')) {
    console.warn('[Email] Email do cliente inválido:', emailCliente);
    return;
  }

  try {
    const { subject, html, text } = gerarConteudoEmail(nomeCliente, status, descricaoServicos, modeloTenis, codigoPedido);
    
    const params = {
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [emailCliente]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8'
          },
          Text: {
            Data: text,
            Charset: 'UTF-8'
          }
        }
      },
      ReplyToAddresses: [REPLY_TO_EMAIL]
    };

    console.log('[Email] Enviando email via SES...', {
      to: emailCliente,
      subject,
      from: FROM_EMAIL
    });

    const startTime = Date.now();
    const result = await ses.sendEmail(params).promise();
    const duration = Date.now() - startTime;

    console.log('[Email] ✅ Email enviado com sucesso!', {
      emailCliente,
      nomeCliente,
      status,
      messageId: result.MessageId,
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
 * Função preparada para futura implementação de SMS via AWS SNS
 * @param {string} telefoneCliente - Telefone do cliente (formato: +5511999999999)
 * @param {string} nomeCliente - Nome do cliente
 * @param {string} status - Status atual do pedido
 * @param {string} codigoPedido - Código do pedido
 */
async function enviarSMSStatus(telefoneCliente, nomeCliente, status, codigoPedido) {
  console.log('[SMS] Função de SMS ainda não implementada. Será implementada em breve.');
  console.log('[SMS] Dados para envio futuro:', {
    telefoneCliente,
    nomeCliente,
    status,
    codigoPedido
  });
  
  // TODO: Implementar SNS para SMS
  // const sns = new AWS.SNS({ region: process.env.AWS_REGION || 'us-east-1' });
  // 
  // const params = {
  //   Message: `Olá ${nomeCliente}! Seu pedido #${codigoPedido} foi atualizado: ${status}`,
  //   PhoneNumber: telefoneCliente,
  //   MessageAttributes: {
  //     'AWS.SNS.SMS.SMSType': {
  //       DataType: 'String',
  //       StringValue: 'Transactional'
  //     }
  //   }
  // };
  // 
  // return await sns.publish(params).promise();
  
  return null;
}

module.exports = {
  enviarStatusPedido,
  enviarEmail,
  enviarSMSStatus, // Função preparada para futura implementação
  gerarConteudoEmail
};
